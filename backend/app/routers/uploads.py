"""
OmniMeetX - Uploads Router
Everything that brings media in: direct file upload, URL import (yt-dlp, with
SSE progress), and in-browser meeting video recordings.
"""
import os
import json
import uuid
import logging
import threading
from datetime import datetime, timezone
from queue import Queue, Empty

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from werkzeug.utils import secure_filename
import yt_dlp

from app.core.config import settings
from app.core.security import get_current_user_id, verify_token_from_query
from app.db import get_db
from app.models import Meeting, User
from app.services import jobs
from app.services.activity import log_activity
from app.services.media import convert_to_mp4
from app.services.processing import reset_for_retry

logger = logging.getLogger(__name__)

router = APIRouter(tags=["uploads"])

UPLOAD_DIR = settings.UPLOAD_FOLDER
ALLOWED_MEDIA_EXTENSIONS = {".mp3", ".wav", ".mp4", ".mov", ".m4a", ".webm", ".ogg", ".flac", ".aac"}
LIVE_MEETING_PATTERNS = ["meet.google.com/", "teams.microsoft.com/l/meetup-join", "zoom.us/j/", "zoom.us/w/"]


SSE_END = chr(10) * 2  # every Server-Sent Event ends with a blank line


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}" + SSE_END


def _ydl_options(progress_hooks=None) -> dict:
    """
    yt-dlp settings shared by both URL imports.

    YouTube needs a JavaScript runtime (deno on the server; node also works) plus
    the yt-dlp-ejs package, or it answers 403. Audio is all transcription needs and
    is a fraction of the size. Never read cookies from a browser on this machine:
    that would download as the server owner's own Google account.
    """
    return {
        "format": "bestaudio[ext=m4a]/bestaudio/best[height<=720]/best",
        # Same "<12 hex>_name" shape as direct uploads, so two people importing one video never collide.
        "outtmpl": os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex[:12]}_%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "retries": 5,
        "fragment_retries": 10,
        "max_filesize": settings.MAX_CONTENT_LENGTH,
        "js_runtimes": {"deno": {}, "node": {}},
        "progress_hooks": progress_hooks or [],
    }


def _friendly_download_error(error: Exception) -> str:
    """What to tell the person. The raw yt-dlp message is logged, not shown."""
    text = str(error).lower()
    if "sign in to confirm" in text or "not a bot" in text:
        return "YouTube blocked this download from our server. Please download the video yourself and upload the file."
    if any(k in text for k in ("private video", "members-only", "login required", "requires login", "confirm your age")):
        return "This video is private or needs a login. Please download it yourself and upload the file."
    if any(k in text for k in ("video unavailable", "is not available", "http error 404", "unsupported url")):
        return "We couldn't find a video at this link. Check the link and try again."
    if "not downloaded" in text:
        return f"This video couldn't be saved. It may be larger than {settings.MAX_FILE_SIZE_MB} MB; try a shorter one or upload the file."
    return "We couldn't download this link. Please download it yourself and upload the file."


def _download_with_ytdlp(url: str, progress_hooks=None) -> str:
    """Blocking yt-dlp download into UPLOAD_DIR; returns the saved file path."""
    with yt_dlp.YoutubeDL(_ydl_options(progress_hooks)) as ydl:
        info = ydl.extract_info(url, download=True)
        filepath = ydl.prepare_filename(info)
    if not os.path.exists(filepath):
        # yt-dlp skips files over max_filesize without raising.
        raise RuntimeError("file not downloaded")
    return filepath


# ===================== SSE VIDEO DOWNLOAD =====================
@router.get("/api/download_video")
async def download_video(url: str = Query(None), token: str = Query(None)):
    """SSE endpoint for downloading video from URL (YouTube, etc.)."""
    if not token:
        raise HTTPException(401, detail={"error": "Missing token"})

    user_id = verify_token_from_query(token)

    if not url or not url.startswith("http"):
        raise HTTPException(400, detail={"error": "Invalid or missing URL"})

    if any(pattern in url for pattern in LIVE_MEETING_PATTERNS):
        async def error_gen():
            yield _sse({"status": "error", "error": "Live meetings cannot be downloaded. Please wait for the recording to finish."})
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    progress_queue: Queue = Queue()

    def progress_hook(d):
        # "finished" here only means the bytes arrived; the thread reports the
        # final file once it is confirmed on disk.
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            if total and d.get("downloaded_bytes"):
                progress = min(99, round((d["downloaded_bytes"] / total) * 100))
                progress_queue.put({"status": "downloading", "downloaded_bytes": d["downloaded_bytes"], "total_bytes": total, "progress": progress})

    def download_thread():
        try:
            filepath = _download_with_ytdlp(url, [progress_hook])
            progress_queue.put({"status": "finished", "filename": os.path.basename(filepath)})
        except Exception as e:
            logger.warning(f"URL import failed for user {user_id} ({url}): {e}")
            progress_queue.put({"status": "error", "error": _friendly_download_error(e)})

    def generate():
        thread = threading.Thread(target=download_thread, daemon=True)
        thread.start()
        yield _sse({"status": "starting", "progress": 0})
        while thread.is_alive() or not progress_queue.empty():
            try:
                data = progress_queue.get(timeout=1)
                yield _sse(data)
                if data.get("status") in ("finished", "error"):
                    break
            except Empty:
                yield _sse({"status": "downloading", "message": "Processing...", "progress": 0})
        yield _sse({"status": "done"})

    return StreamingResponse(generate(), media_type="text/event-stream")


# ===================== UPLOAD =====================
@router.post("/api/upload")
async def upload(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        user = db.query(User).get(user_id)
        if not user:
            raise HTTPException(404, detail={"error": "User not found"})

        content_type = request.headers.get("content-type", "")

        if "multipart/form-data" in content_type:
            form = await request.form()
            data = dict(form)
            file = form.get("file")
        else:
            data = await request.json()
            file = None

        # Handle retry
        if data.get("retry") and data.get("meeting_id"):
            meeting_id = data.get("meeting_id")
            meeting = db.query(Meeting).filter_by(id=int(meeting_id), user_id=user_id).first()
            if not meeting:
                raise HTTPException(404, detail={"error": "Meeting not found"})

            reset_for_retry(db, meeting)

            log_activity(db, user_id, "processing", f"Retry: {meeting.title}", f"Retrying processing for {meeting.filename}", meeting.id, {"retry": True})
            jobs.enqueue_meeting_processing(meeting.id)

            return {"recording_id": meeting.id, "message": "Processing restarted", "filename": meeting.filename, "status": "uploaded", "transcript_language": meeting.transcript_language}

        title = data.get("title")
        language = data.get("language") or "auto"          # spoken language; "auto" = detect
        transcript_language = data.get("transcript_language") or "auto"  # output; "auto" = same as spoken
        url = data.get("url")
        pre_downloaded_filename = data.get("filename")
        # The page the media came from (YouTube etc.): the notes page shows it as the video.
        source_url = (data.get("source_url") or url or "").strip()
        if not source_url.startswith(("https://", "http://")) or len(source_url) > 1000:
            source_url = None

        if not title:
            raise HTTPException(400, detail={"error": "Missing title"})

        filepath = None
        filename = None

        # 1. Pre-downloaded (via /api/download_video)
        if pre_downloaded_filename:
            filepath = os.path.join(UPLOAD_DIR, secure_filename(pre_downloaded_filename))
            if not os.path.exists(filepath):
                raise HTTPException(404, detail={"error": "Pre-downloaded file not found"})
            filename = pre_downloaded_filename

        # 2. URL download — yt-dlp blocks for minutes, so keep it off the event loop
        elif url and url.strip():
            try:
                filepath = await run_in_threadpool(_download_with_ytdlp, url)
                filename = os.path.basename(filepath)
            except Exception as e:
                logger.warning(f"URL import failed for user {user_id} ({url}): {e}")
                raise HTTPException(502, detail={"error": _friendly_download_error(e)})

        # 3. Direct upload
        elif file is not None:
            if hasattr(file, 'filename') and file.filename:
                ext = os.path.splitext(file.filename)[1].lower()
                if ext not in ALLOWED_MEDIA_EXTENSIONS:
                    raise HTTPException(400, detail={"error": f"Unsupported file format: {ext}"})

                # Randomized secure filename to prevent collision/traversal
                unique_prefix = uuid.uuid4().hex[:12]
                filename = f"{unique_prefix}_{secure_filename(file.filename)}"
                filepath = os.path.join(UPLOAD_DIR, filename)

                contents = await file.read()
                if len(contents) > settings.MAX_CONTENT_LENGTH:
                    raise HTTPException(413, detail={"error": f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB"})

                with open(filepath, "wb") as f:
                    f.write(contents)
            else:
                raise HTTPException(400, detail={"error": "No file selected"})
        else:
            raise HTTPException(400, detail={"error": "No file, URL, or pre-downloaded file provided"})

        meeting_source = "url" if (url and url.strip()) or source_url else "upload"

        # --- recording_id support: update existing record, never create duplicate ---
        recording_id = data.get("recording_id")
        if recording_id:
            existing = db.query(Meeting).filter_by(id=int(recording_id), user_id=user_id).first()
            if existing:
                existing.filename = os.path.basename(filepath)
                existing.filepath = filepath
                existing.title = title or existing.title
                existing.language = language
                existing.transcript_language = transcript_language
                existing.status = "uploaded"
                existing.source = meeting_source
                existing.source_url = source_url
                db.commit()
                db.refresh(existing)

                log_activity(db, user_id, "upload", f"Uploaded: {existing.title}", f"Successfully uploaded {existing.filename}", existing.id, {"filename": existing.filename, "title": existing.title})
                jobs.enqueue_meeting_processing(existing.id)

                return {"recording_id": existing.id, "message": "File uploaded successfully", "filename": existing.filename, "status": "uploaded", "transcript_language": transcript_language}

        meeting = Meeting(
            user_id=user_id,
            title=title,
            filename=os.path.basename(filepath),
            language=language,
            transcript_language=transcript_language,
            status="uploaded",
            source=meeting_source,
            source_url=source_url,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        log_activity(db, user_id, "upload", f"Uploaded: {meeting.title}", f"Successfully uploaded {meeting.filename}", meeting.id, {"filename": meeting.filename, "title": meeting.title})
        jobs.enqueue_meeting_processing(meeting.id)

        return {"recording_id": meeting.id, "message": "File uploaded successfully", "filename": filename, "status": "uploaded", "transcript_language": transcript_language}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(500, detail={"error": f"Upload failed: {str(e)}"})


# ===================== MEETING VIDEO RECORDING UPLOAD =====================
@router.post("/api/upload-meeting-video")
async def upload_meeting_video(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        form = await request.form()
        video_file = form.get("video")
        meeting_id = form.get("meeting_id")
        title = form.get("title", f"Meeting Recording {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        language = form.get("language") or "auto"

        if not video_file:
            raise HTTPException(400, detail={"error": "No video file provided"})
        if not meeting_id:
            raise HTTPException(400, detail={"error": "Meeting ID required"})

        recordings_dir = settings.RECORDINGS_FOLDER
        os.makedirs(recordings_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        webm_filename = f"meeting_{meeting_id}_{timestamp}.webm"
        webm_path = os.path.join(recordings_dir, webm_filename)

        contents = await video_file.read()
        with open(webm_path, "wb") as f:
            f.write(contents)

        mp4_filename = f"meeting_{meeting_id}_{timestamp}.mp4"
        mp4_path = os.path.join(recordings_dir, mp4_filename)

        conversion_success = await run_in_threadpool(convert_to_mp4, webm_path, mp4_path)
        if not conversion_success:
            raise HTTPException(500, detail={"error": "Video conversion failed"})

        meeting = db.query(Meeting).get(meeting_id)
        if not meeting:
            meeting = Meeting(user_id=user_id, title=title, filename=mp4_filename, language=language, upload_date=datetime.now(timezone.utc))
            db.add(meeting)
        else:
            if meeting.user_id != user_id:
                raise HTTPException(403, detail={"error": "Unauthorized to modify this meeting"})
            meeting.title = title
            if language:
                meeting.language = language

        meeting.video_webm_path = webm_filename
        meeting.video_mp4_path = mp4_filename
        meeting.has_video = True
        meeting.filename = mp4_filename
        meeting.filepath = mp4_path
        meeting.status = "uploaded"
        db.commit()
        db.refresh(meeting)

        jobs.enqueue_video_processing(meeting.id, mp4_path)

        return {"message": "Video uploaded and converted", "meeting_id": meeting.id, "video_url": f"/recordings/{mp4_filename}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload meeting video failed: {e}")
        raise HTTPException(500, detail={"error": str(e)})

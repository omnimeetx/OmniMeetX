"""
OmniMeetX - Media Router
Serves uploaded audio/video and meeting recordings to their owner, plus
public profile pictures.
"""
import os
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from werkzeug.utils import secure_filename

from app.core.config import settings
from app.core.security import get_current_user_id, verify_token_from_query
from app.db import get_db
from app.models import Meeting, User
from app.services import recordings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["media"])

UPLOAD_DIR = settings.UPLOAD_FOLDER

MIME_TYPES = {
    "mp4": "video/mp4", "webm": "video/webm", "mp3": "audio/mp3", "wav": "audio/wav", "m4a": "audio/mp4",
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "gif": "image/gif",
}


def _get_mimetype(filename: str) -> str:
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    return MIME_TYPES.get(ext, "application/octet-stream")


# ===================== MEETING VIDEO =====================
@router.get("/api/meetings/{meeting_id}/video/preview")
async def get_meeting_video_preview(meeting_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter_by(id=meeting_id, user_id=user_id).first()
    if not meeting or not meeting.video_webm_path:
        raise HTTPException(404, detail={"error": "Video not found"})
    video_path = os.path.join(UPLOAD_DIR, meeting.video_webm_path)
    if not os.path.exists(video_path):
        raise HTTPException(404, detail={"error": "Video file not found"})
    return FileResponse(video_path, media_type="video/webm")


@router.get("/api/meetings/{meeting_id}/video/download")
async def download_meeting_video(meeting_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter_by(id=meeting_id, user_id=user_id).first()
    if not meeting or not meeting.video_mp4_path:
        raise HTTPException(404, detail={"error": "Video not found"})
    video_path = os.path.join(UPLOAD_DIR, meeting.video_mp4_path)
    if not os.path.exists(video_path):
        if meeting.status in ("converting", "uploaded"):
            return {"error": "Video conversion in progress", "status": "converting"}
        raise HTTPException(404, detail={"error": "Video file not found"})
    return FileResponse(video_path, media_type="video/mp4", filename=f"{meeting.title}.mp4")


# ===================== AUTHENTICATED MEDIA FILES =====================
@router.get("/uploads/{filename:path}")
async def serve_upload(filename: str, token: str = Query(None), db: Session = Depends(get_db)):
    """Serve uploaded media files with token auth."""
    if not token:
        raise HTTPException(401, detail={"error": "Authentication required"})
    user_id = verify_token_from_query(token)
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    safe_filename = secure_filename(filename)
    meeting = db.query(Meeting).filter_by(filename=safe_filename, user_id=user_id).first()
    if not meeting:
        raise HTTPException(403, detail={"error": "Unauthorized access"})

    for folder in (UPLOAD_DIR, settings.RECORDINGS_FOLDER):
        filepath = os.path.join(folder, safe_filename)
        if os.path.exists(filepath):
            return FileResponse(filepath, media_type=_get_mimetype(safe_filename))

    # Not on this server: play the copy in Supabase Storage through a one-hour link.
    try:
        url = recordings.playback_url(meeting)
    except Exception as e:
        logger.warning(f"Signed link for meeting {meeting.id} failed: {e}")
        raise HTTPException(502, detail={"error": "The recording couldn't be loaded right now. Please try again."})
    if not url:
        raise HTTPException(404, detail={"error": "File not found"})
    return RedirectResponse(url, status_code=302)


@router.get("/recordings/{filename:path}")
async def serve_recording(filename: str, token: str = Query(None), db: Session = Depends(get_db)):
    """Serve recorded media files with token auth and ownership check."""
    if not token:
        raise HTTPException(401, detail={"error": "Authentication required"})
    user_id = verify_token_from_query(token)

    safe_filename = secure_filename(filename)
    filepath = os.path.join(settings.RECORDINGS_FOLDER, safe_filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, detail={"error": "File not found"})

    # Check ownership
    meeting = db.query(Meeting).filter(
        ((Meeting.video_webm_path == safe_filename) | (Meeting.video_mp4_path == safe_filename) | (Meeting.filename == safe_filename)),
        Meeting.user_id == user_id
    ).first()
    if not meeting:
        raise HTTPException(403, detail={"error": "Unauthorized access"})

    return FileResponse(filepath, media_type=_get_mimetype(safe_filename))


# ===================== PUBLIC AVATARS =====================
@router.get("/media/avatars/{filename}")
async def serve_avatar(filename: str):
    """Profile pictures are public (random, unguessable names) so <img> tags work without a token."""
    safe_filename = secure_filename(filename)
    filepath = os.path.join(settings.AVATAR_FOLDER, safe_filename)
    if not safe_filename or not os.path.isfile(filepath):
        raise HTTPException(404, detail={"error": "File not found"})
    return FileResponse(filepath, media_type=_get_mimetype(safe_filename))

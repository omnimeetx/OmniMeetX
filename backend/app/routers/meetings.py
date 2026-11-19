"""
OmniMeetX - Meetings Router
Meeting library: list/get/delete, favorites, processing status & retry,
translation, and PDF/Word export.
"""
import os
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, load_only
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.languages import language_name
from app.core.security import get_current_user_id
from app.db import get_db
from app.models import Activity, CreditLedger, Meeting, User
from app.services import recordings
from app.services import jobs
from app.services.activity import log_activity
from app.services.ai import call_gemini_api
from app.services.exports import create_enhanced_docx, create_enhanced_pdf
from app.services.processing import reset_for_retry
from app.services.progress import initial_processing_steps

logger = logging.getLogger(__name__)

router = APIRouter(tags=["meetings"])

UPLOAD_DIR = settings.UPLOAD_FOLDER


def _get_owned_meeting(db: Session, meeting_id: int, user_id: int) -> Meeting:
    meeting = db.query(Meeting).filter_by(id=meeting_id, user_id=user_id).first()
    if not meeting:
        raise HTTPException(404, detail={"error": "Meeting not found"})
    return meeting


# ===================== PROCESSING STATUS =====================
@router.get("/api/processing-status/{meeting_id}")
async def processing_status(meeting_id: str, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        if meeting_id.isdigit():
            meeting = db.query(Meeting).filter_by(id=int(meeting_id), user_id=user_id).first()
        else:
            meeting = db.query(Meeting).filter_by(user_id=user_id, title=f"Meeting: {meeting_id}").order_by(Meeting.id.desc()).first()

        if not meeting:
            raise HTTPException(404, detail={"error": "Meeting not found"})

        try:
            steps = json.loads(meeting.processing_steps or "[]")
        except Exception:
            steps = []

        if not steps:
            steps = initial_processing_steps()

        return {"recording_id": meeting.id, "status": meeting.status, "processing_steps": steps, "current_step_progress": meeting.current_step_progress or 0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing status error: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== START / RETRY PROCESSING =====================
@router.post("/api/process/{meeting_id}")
async def start_meeting_processing(meeting_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Make sure an uploaded meeting is being processed. Safe to call repeatedly:
    the pipeline claims each meeting once, so duplicates are no-ops.
    """
    meeting = _get_owned_meeting(db, meeting_id, user_id)
    if meeting.status == "uploaded":
        jobs.enqueue_meeting_processing(meeting.id)
    return {"recording_id": meeting.id, "status": meeting.status}


@router.post("/api/meetings/{meeting_id}/retry")
async def retry_meeting_processing(meeting_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Re-run the whole pipeline for a meeting (typically one that failed)."""
    meeting = _get_owned_meeting(db, meeting_id, user_id)
    if meeting.status == "processing":
        raise HTTPException(409, detail={"error": "This meeting is already being processed"})
    if not meeting.filename or meeting.filename == "pending":
        raise HTTPException(400, detail={"error": "This meeting has no recording to process"})

    reset_for_retry(db, meeting)
    log_activity(db, user_id, "processing", f"Retry: {meeting.title}", f"Retrying processing for {meeting.filename}", meeting.id, {"retry": True})
    jobs.enqueue_meeting_processing(meeting.id)
    return {"recording_id": meeting.id, "message": "Processing restarted", "status": "uploaded"}


# ===================== MEETINGS CRUD =====================
@router.get("/api/meetings")
async def get_meetings(limit: int = 10000000, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # Only the columns the list shows: transcripts and notes are large and made this slow.
    meetings = (
        db.query(Meeting)
        .options(load_only(Meeting.id, Meeting.title, Meeting.filename, Meeting.upload_date, Meeting.status,
                           Meeting.transcript_language, Meeting.has_transcription, Meeting.has_notes, Meeting.is_favorite))
        .filter_by(user_id=user_id)
        .order_by(Meeting.upload_date.desc())
        .limit(limit)
        .all()
    )
    return {
        "meetings": [
            {
                "id": m.id, "title": m.title, "filename": m.filename,
                "upload_date": m.upload_date.isoformat(), "status": m.status,
                "transcript_language": m.transcript_language or "en",
                "has_transcription": m.has_transcription, "has_notes": m.has_notes,
                "is_favorite": m.is_favorite,
            } for m in meetings
        ]
    }


@router.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meeting = _get_owned_meeting(db, meeting_id, user_id)
    return {
        "meeting": {
            "id": meeting.id, "title": meeting.title, "filename": meeting.filename,
            "upload_date": meeting.upload_date.isoformat(), "status": meeting.status,
            "transcript_language": meeting.transcript_language or "en",
            "media_kind": meeting.media_kind,
            "source_url": meeting.source_url,
            "transcription": json.loads(meeting.transcription or "{}"),
            "notes": json.loads(meeting.notes or "{}"),
            "is_favorite": meeting.is_favorite,
        }
    }


@router.delete("/api/meetings/{meeting_id}")
async def delete_meeting(meeting_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meeting = _get_owned_meeting(db, meeting_id, user_id)

    # Postgres enforces these links (SQLite never did): keep the history, drop the pointer.
    db.query(Activity).filter(Activity.meeting_id == meeting.id).update({Activity.meeting_id: None}, synchronize_session=False)
    db.query(CreditLedger).filter(CreditLedger.meeting_id == meeting.id).update({CreditLedger.meeting_id: None}, synchronize_session=False)
    db.delete(meeting)
    db.commit()
    # Files only after the row is gone, so a failed delete never leaves a meeting without its recording.
    recordings.remove(meeting)
    return {"message": "Meeting deleted successfully"}


# ===================== FAVORITES =====================
@router.put("/api/meetings/{meeting_id}/favorite")
async def toggle_favorite(meeting_id: int, request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meeting = _get_owned_meeting(db, meeting_id, user_id)
    data = await request.json()
    if "is_favorite" not in data:
        raise HTTPException(400, detail={"error": "Missing is_favorite"})
    meeting.is_favorite = data["is_favorite"]
    db.commit()
    return {"success": True, "is_favorite": meeting.is_favorite}


@router.get("/api/favorites")
async def get_favorites(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    favorites = db.query(Meeting).filter_by(user_id=user_id, is_favorite=True).order_by(Meeting.upload_date.desc()).all()
    return {
        "meetings": [
            {"id": m.id, "title": m.title, "filename": m.filename, "upload_date": m.upload_date.isoformat(), "status": m.status, "has_transcription": m.has_transcription, "has_notes": m.has_notes, "is_favorite": m.is_favorite}
            for m in favorites
        ]
    }


# ===================== TRANSLATE =====================
@router.post("/api/translate")
async def translate_text(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        data = await request.json()
        text = data.get("text", "").strip()
        target_language = data.get("target_language", "es")
        if not text:
            raise HTTPException(400, detail={"error": "No text provided"})

        target_lang_name = language_name(target_language, "Spanish")
        prompt = f"You are a professional translator. Translate to {target_lang_name}. Return ONLY the translation:\n\n{text}"
        response = await run_in_threadpool(call_gemini_api, prompt, feature_name="translate")
        translated = response.text.strip() if response.text else ""
        if not translated:
            raise HTTPException(500, detail={"error": "Translation failed: Empty response"})
        return {"translated_text": translated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(500, detail={"error": "Translation service unavailable", "details": str(e)})


# ===================== EXPORT =====================
@router.get("/api/export/{meeting_id}/{format}")
async def export(meeting_id: int, format: str, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meeting = _get_owned_meeting(db, meeting_id, user_id)

    os.makedirs(settings.OUTPUT_FOLDER, exist_ok=True)
    user = db.query(User).get(user_id)

    if format == "word":
        filepath = os.path.join(settings.OUTPUT_FOLDER, f"meeting_notes_{meeting_id}.docx")
        await run_in_threadpool(create_enhanced_docx, meeting, user, filepath)
        return FileResponse(filepath, filename=f"meeting_notes_{meeting_id}.docx", media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    elif format == "pdf":
        filepath = os.path.join(settings.OUTPUT_FOLDER, f"meeting_notes_{meeting_id}.pdf")
        await run_in_threadpool(create_enhanced_pdf, meeting, user, filepath)
        return FileResponse(filepath, filename=f"meeting_notes_{meeting_id}.pdf", media_type="application/pdf")

    raise HTTPException(400, detail={"error": "Invalid format"})

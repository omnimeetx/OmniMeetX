"""
OmniMeetX - Meeting Rooms Router
Endpoints for creating meeting rooms, tracking recording lifecycle,
and updating recording status.
"""
import os
import re
import uuid
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from werkzeug.utils import secure_filename

from app.core.config import settings
from app.core.security import get_current_user_id
from app.db import get_db
from app.models import Meeting, MeetingRoom, User
from app.services import jobs, room_state as rs
from app.services.activity import log_activity
from app.services.ai import call_gemini_safe
from app.services.livekit import (
    LiveKitNotConfigured,
    build_access_token,
    livekit_configured,
    livekit_url,
    participant_identity,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/meeting-rooms", tags=["meeting-rooms"])


# ===================== CREATE MEETING ROOM =====================
@router.post("/create")
async def create_meeting_room(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a meeting room and return a room_id."""
    try:
        data = await request.json()
        title = data.get("title", f"Meeting Room {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        room_settings = data.get("settings", {}) or {}
        auto_record = bool(room_settings.get("auto_record", False))
        # The create-meeting UI sends `require_approval`; accept either spelling
        # so the host's lobby toggle is not silently dropped.
        requires_approval = bool(
            room_settings.get(
                "requires_approval",
                room_settings.get("require_approval", True),
            )
        )

        room_id = str(uuid.uuid4())[:8]

        room = MeetingRoom(
            room_id=room_id,
            host_user_id=user_id,
            title=title,
            settings=json.dumps(room_settings),
            requires_approval=requires_approval,
            auto_record=auto_record,
            is_active=True,
        )
        db.add(room)
        db.commit()
        db.refresh(room)

        return {
            "room_id": room_id,
            "title": title,
            "auto_record": auto_record,
            "requires_approval": requires_approval,
            "created_by": user_id,
            "created_at": room.created_at.isoformat() if room.created_at else None,
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Create meeting room failed: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== GET MEETING ROOM =====================
@router.get("/{room_id}")
async def get_meeting_room(
    room_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Get meeting room info.

    `created_by` is the real host from the database. It used to fall back to the
    requesting user, which told every person who opened a share link that they
    were the owner — and so the approval flow never had anyone to ask.
    """
    room = db.query(MeetingRoom).filter(MeetingRoom.room_id == room_id).first()

    if room is None:
        # Link to a room that predates this table (or was never created via the
        # API). Report it as unowned so nobody is falsely promoted to host.
        return {
            "meeting": {
                "id": room_id,
                "title": f"Meeting: {room_id}",
                "created_by": None,
                "is_host": False,
                "exists": False,
                "settings": {"auto_record": False, "requires_approval": True},
            }
        }

    payload = room.to_dict()
    payload["is_host"] = room.host_user_id == user_id
    payload["exists"] = True
    return {"meeting": payload}


# ===================== LIVEKIT ACCESS TOKEN =====================
@router.post("/{room_id}/livekit-token")
async def issue_livekit_token(
    room_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Mint a LiveKit join token for this user and room.

    Only the host, or someone the host has already admitted through the lobby,
    gets a token — this is the enforcement point for the approval flow. A guest
    who skips the waiting room and calls this directly is refused.
    """
    if not livekit_configured():
        raise HTTPException(
            503,
            detail={
                "error": "Video calling is not configured on this server.",
                "hint": "Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
            },
        )

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    room = db.query(MeetingRoom).filter(MeetingRoom.room_id == room_id).first()
    is_host = bool(room and room.host_user_id == user_id)

    if room and not room.is_active:
        raise HTTPException(410, detail={"error": "This meeting has ended"})

    if not is_host and not rs.is_admitted(room_id, str(user_id)):
        raise HTTPException(
            403,
            detail={"error": "Waiting for the host to admit you into this meeting"},
        )

    try:
        token = build_access_token(
            room=room_id,
            identity=participant_identity(user_id),
            name=user.full_name or f"User {user_id}",
            is_host=is_host,
            metadata={"userId": str(user_id), "isHost": is_host},
        )
    except LiveKitNotConfigured as e:
        raise HTTPException(503, detail={"error": str(e)})

    return {
        "url": livekit_url(),
        "token": token,
        "identity": participant_identity(user_id),
        "room": room_id,
        "is_host": is_host,
    }


# ===================== END MEETING (host only) =====================
@router.post("/{room_id}/end")
async def end_meeting_room(
    room_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Mark a room ended so its link stops admitting new people."""
    room = db.query(MeetingRoom).filter(MeetingRoom.room_id == room_id).first()
    if not room:
        raise HTTPException(404, detail={"error": "Meeting room not found"})
    if room.host_user_id != user_id:
        raise HTTPException(403, detail={"error": "Only the host can end this meeting"})

    room.is_active = False
    room.ended_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True, "room_id": room_id, "ended_at": room.ended_at.isoformat()}


# ===================== SAVE RECORDING START =====================
@router.post("/save-recording-start")
async def save_recording_start(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Create a pending Meeting record in the database the moment recording starts.
    This ensures the recording is tracked from the very beginning, not just after upload.
    """
    try:
        data = await request.json()
        meeting_room_id = data.get("meeting_room_id")
        started_at = data.get("started_at", datetime.now(timezone.utc).isoformat())

        if not meeting_room_id:
            raise HTTPException(400, detail={"error": "meeting_room_id is required"})

        meeting = Meeting(
            user_id=user_id,
            title=f"Meeting: {meeting_room_id}",
            filename="pending",
            status="recording",
            source="meeting_room",
            meeting_room_id=meeting_room_id,
            recording_started_at=datetime.fromisoformat(started_at.replace("Z", "+00:00")) if isinstance(started_at, str) else started_at,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        log_activity(
            db, user_id, "recording",
            f"Recording started: {meeting.title}",
            f"Recording started for meeting room {meeting_room_id}",
            meeting.id,
            {"meeting_room_id": meeting_room_id},
        )

        return {
            "meeting_id": meeting.id,
            "meeting_room_id": meeting_room_id,
            "status": "recording",
            "started_at": started_at,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save recording start failed: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== UPDATE RECORDING STATUS =====================
@router.patch("/recording/{recording_id}/status")
async def update_recording_status(
    recording_id: int,
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Update recording status (cancelled, failed, processing).
    Used when user discards recording or when recording fails.
    """
    try:
        data = await request.json()
        new_status = data.get("status")

        if new_status not in ("cancelled", "failed", "processing"):
            raise HTTPException(400, detail={"error": "Invalid status. Must be: cancelled, failed, processing"})

        meeting = db.query(Meeting).filter_by(id=recording_id, user_id=user_id).first()
        if not meeting:
            raise HTTPException(404, detail={"error": "Recording not found"})

        meeting.status = new_status
        db.commit()

        return {"meeting_id": meeting.id, "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update recording status failed: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== JOIN MEETING ROOM =====================
@router.post("/{room_id}/join")
async def join_meeting_room(
    room_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Announce intent to join. Tells the client who it is and whether it owns the
    room, so the UI knows to show the host controls or the waiting room. Actual
    entry is granted over Socket.IO (the lobby) and enforced by /livekit-token.
    """
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    room = db.query(MeetingRoom).filter(MeetingRoom.room_id == room_id).first()
    is_host = bool(room and room.host_user_id == user_id)

    if room and not room.is_active:
        raise HTTPException(410, detail={"error": "This meeting has ended"})

    return {
        "success": True,
        "socket_token": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user.full_name,
        "is_host": is_host,
        "requires_approval": bool(room.requires_approval) if room else True,
        "room_exists": bool(room),
        "livekit_enabled": livekit_configured(),
    }


# ===================== LEAVE WITH RECORDING =====================
@router.post("/{room_id}/leave-with-recording")
async def leave_with_recording(
    room_id: str,
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Called when user leaves a meeting room. Handles recording cleanup."""
    try:
        data = await request.json()
        save_recording = data.get("saveRecording", False)

        return {"success": True, "save_recording": save_recording}
    except Exception as e:
        logger.error(f"Leave with recording failed: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== UPLOAD RECORDING (for meeting room) =====================
@router.post("/{room_id}/recordings")
async def upload_meeting_room_recording(
    room_id: str,
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Upload a recording from a meeting room.
    Saves the file and creates/updates a Meeting record, then starts processing.
    """
    try:
        form = await request.form()
        file = form.get("file")
        title = form.get("title", f"Meeting: {room_id}")
        language = form.get("language") or "auto"
        recording_id = form.get("recording_id")

        if not file or not hasattr(file, "filename"):
            raise HTTPException(400, detail={"error": "No file provided"})

        filename = f"{uuid.uuid4().hex[:12]}_{secure_filename(file.filename or f'meeting-{room_id}.webm')}"
        filepath = os.path.join(settings.UPLOAD_FOLDER, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        # If recording_id is provided, UPDATE existing record (avoid duplicate)
        if recording_id:
            meeting = db.query(Meeting).filter_by(id=int(recording_id), user_id=user_id).first()
            if meeting:
                meeting.filename = filename
                meeting.filepath = filepath
                meeting.title = title
                meeting.language = language
                meeting.status = "uploaded"
                db.commit()
                db.refresh(meeting)

                jobs.enqueue_meeting_processing(meeting.id)
                return {"recording_id": meeting.id, "status": "processing", "message": "Recording uploaded and processing started"}

        # No recording_id or not found — check for existing by meeting_room_id
        existing = db.query(Meeting).filter_by(
            user_id=user_id, meeting_room_id=room_id, status="recording"
        ).first()

        if existing:
            existing.filename = filename
            existing.filepath = filepath
            existing.title = title
            existing.language = language
            existing.status = "uploaded"
            db.commit()
            db.refresh(existing)

            jobs.enqueue_meeting_processing(existing.id)
            return {"recording_id": existing.id, "status": "processing", "message": "Recording uploaded and processing started"}

        # Create new meeting record
        meeting = Meeting(
            user_id=user_id,
            title=title,
            filename=filename,
            filepath=filepath,
            language=language,
            status="uploaded",
            source="meeting_room",
            meeting_room_id=room_id,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        jobs.enqueue_meeting_processing(meeting.id)
        return {"recording_id": meeting.id, "status": "processing", "message": "Recording uploaded and processing started"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload meeting room recording failed: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== ENSURE PROCESSING =====================
@router.post("/{recording_id}/process")
async def ensure_recording_processing(
    recording_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Called by the processing screen when it opens. Starts the pipeline if the
    recording is still waiting; otherwise just reports its status. Never starts
    a second run — the pipeline claims each meeting exactly once.
    """
    meeting = db.query(Meeting).filter_by(id=recording_id, user_id=user_id).first()
    if not meeting:
        raise HTTPException(404, detail={"error": "Recording not found"})
    if meeting.status == "uploaded":
        jobs.enqueue_meeting_processing(meeting.id)
    return {"recording_id": meeting.id, "status": meeting.status}


# ===================== GENERATE QUIZ =====================
@router.post("/generate-quiz")
async def generate_quiz(
    request: Request,
    user_id: int = Depends(get_current_user_id),
):
    """Generate quiz questions from a meeting transcript using NVIDIA/Gemini."""
    try:
        data = await request.json()
        transcript = data.get("transcript", "").strip()
        num_questions = data.get("num_questions", 5)

        if not transcript or len(transcript) < 50:
            raise HTTPException(400, detail={"error": "Transcript too short to generate quiz questions"})

        prompt = f"""
Based on this meeting transcript, generate {num_questions} multiple choice quiz questions.
Return ONLY a JSON array in this exact format, no other text:
[
  {{
    "question": "question text",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "why this is correct"
  }}
]

Transcript:
{transcript}
"""
        ai_response = await run_in_threadpool(call_gemini_safe, prompt, feature_name="quiz_generation")

        # Parse JSON from response
        try:
            json_match = re.search(r'\[.*\]', ai_response, re.DOTALL)
            if json_match:
                questions = json.loads(json_match.group())
                return {"questions": questions, "count": len(questions)}
        except (json.JSONDecodeError, Exception) as parse_err:
            logger.warning(f"Failed to parse quiz JSON: {parse_err}")

        return {"questions": [], "count": 0, "error": "Could not generate quiz questions. Try again."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate quiz failed: {e}")
        raise HTTPException(500, detail={"error": "Quiz generation temporarily unavailable."})

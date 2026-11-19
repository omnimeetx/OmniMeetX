"""
OmniMeetX - Contact & Email Router
Public contact form, and emailing exported meeting notes (PDF attached).
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.security import get_current_user_id, get_optional_user_id
from app.db import get_db
from app.models import Meeting, User
from app.services import email as email_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["contact"])


# ===================== CONTACT =====================
@router.post("/api/contact")
async def contact(request: Request, user_id: int = Depends(get_optional_user_id), db: Session = Depends(get_db)):
    try:
        data = await request.json()
        name = data.get("name")
        email = data.get("email")
        subject = data.get("subject")
        message = data.get("message")

        if not all([name, email, subject, message]):
            raise HTTPException(400, detail={"error": "Missing required fields"})

        if not email_service.email_configured() or not settings.CONTACT_EMAIL:
            raise HTTPException(500, detail={"error": "Configuration error. Please try again later."})

        await run_in_threadpool(email_service.send_contact_inquiry, name, email, subject, message)
        return {"message": "Inquiry sent successfully. We will get back to you soon."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contact error: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== SEND MEETING NOTES BY EMAIL =====================
@router.post("/api/send-email")
async def send_email(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        user = db.query(User).get(user_id)
        form = await request.form()

        meeting_id = form.get("meeting_id")
        to_email = form.get("to_email")
        from_email = form.get("from_email") or (user.email if user else "")
        subject = form.get("subject")
        body = form.get("body")

        pdf_file = form.get("pdf_file")
        if not pdf_file:
            raise HTTPException(400, detail={"error": "No PDF file provided"})

        meeting = db.query(Meeting).filter_by(id=int(meeting_id), user_id=user_id).first()
        if not meeting:
            raise HTTPException(404, detail={"error": "Meeting not found"})

        if not email_service.email_configured():
            raise HTTPException(500, detail={"error": "Email is not configured on this server"})

        pdf_content = await pdf_file.read()
        result = await run_in_threadpool(
            email_service.send_meeting_notes,
            to_email, from_email, subject, meeting.title, body,
            pdf_content, pdf_file.filename or "meeting_notes.pdf",
        )
        return {"message": "Email sent successfully", "id": result.get("id")}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send email error: {e}")
        raise HTTPException(500, detail={"error": "Email sending failed", "details": str(e)})

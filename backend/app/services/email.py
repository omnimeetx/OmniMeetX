"""
OmniMeetX - Email delivery (Resend, https://resend.com).
All outbound mail goes through `send_email`; templates live in email_templates.py.

Resend only delivers from a domain you have verified. Until then the shared
test sender (onboarding@resend.dev) can only mail the address that owns the
Resend account — fine for development, not for real users.
"""
import base64
import logging
from typing import Optional

import requests

from app.core.config import settings
from app.services import email_templates

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


class EmailNotConfigured(RuntimeError):
    """RESEND_API_KEY is not set."""


class EmailSendError(RuntimeError):
    """Resend refused or failed to send the message."""


def email_configured() -> bool:
    return bool(settings.RESEND_API_KEY)


def send_email(
    to_email: str,
    subject: str,
    html: str,
    *,
    reply_to: Optional[str] = None,
    attachment: Optional[tuple] = None,
) -> dict:
    """
    Send one email and return Resend's response ({"id": ...}).
    `attachment` is (bytes, filename, mime_type). Raises on failure.
    """
    if not email_configured():
        raise EmailNotConfigured("RESEND_API_KEY is not set")

    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    if attachment:
        content, filename, _mime_type = attachment
        payload["attachments"] = [{"filename": filename, "content": base64.b64encode(content).decode()}]

    resp = requests.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json=payload,
        timeout=20,
    )
    if resp.status_code >= 400:
        try:
            message = resp.json().get("message") or resp.text
        except ValueError:
            message = resp.text
        raise EmailSendError(f"Resend HTTP {resp.status_code}: {message[:300]}")
    return resp.json()


def send_verification_email(email, full_name, otp_code) -> bool:
    """
    Send the signup code. Never raises.

    Outside production the code is also printed to the server log when it
    cannot be emailed, so local signups still work without an email setup.
    """
    try:
        send_email(email, "Your Verification Code - OmniMeetX",
                   email_templates.verification_email(full_name, otp_code))
        logger.info(f"Verification code emailed to {email}")
        return True
    except Exception as e:
        logger.error(f"Could not email verification code to {email}: {e}")
        if not settings.is_production:
            logger.warning(f"[dev] Verification code for {email}: {otp_code}")
        return False


def send_password_reset_email(email: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    send_email(email, "Reset Your Password - OmniMeetX",
               email_templates.password_reset_email(full_name, link))


def send_pin_reset_email(email: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-pin?token={token}"
    send_email(email, "Reset Your Security PIN - OmniMeetX",
               email_templates.pin_reset_email(full_name, link))


def send_contact_inquiry(name: str, email: str, subject: str, message: str) -> None:
    """Forward a contact-form message to our support inbox."""
    send_email(settings.CONTACT_EMAIL, f"Contact Inquiry: {subject}",
               email_templates.contact_inquiry_email(name, email, subject, message),
               reply_to=email)


def send_meeting_notes(to_email: str, reply_to: str, subject: str, meeting_title: str,
                       body: str, pdf_bytes: bytes, pdf_filename: str) -> dict:
    return send_email(to_email, subject,
                      email_templates.meeting_notes_email(meeting_title, body),
                      reply_to=reply_to,
                      attachment=(pdf_bytes, pdf_filename, "application/pdf"))

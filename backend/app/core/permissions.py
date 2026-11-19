"""
OmniMeetX - Role checks.
Admins are listed by email in ADMIN_EMAILS (comma-separated).
"""
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user_id
from app.db import get_db
from app.models import User


def is_admin(user) -> bool:
    return bool(user and user.email and user.email.strip().lower() in settings.admin_emails)


def require_admin(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)) -> User:
    """FastAPI dependency: the signed-in user, who must be an admin."""
    user = db.query(User).get(user_id)
    if not is_admin(user):
        raise HTTPException(403, detail={"error": "Admins only"})
    return user

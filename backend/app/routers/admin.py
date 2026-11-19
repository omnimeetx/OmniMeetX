"""
OmniMeetX - Admin Router

Read-only numbers behind the admin page. Everything here requires an admin
account (ADMIN_EMAILS), and nothing here changes data.
"""
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.db import get_db
from app.models import Feedback, FeatureRequest, Meeting, User

router = APIRouter(prefix="/api/admin", tags=["admin"])

CHART_DAYS = 30
PAID_STATUSES = ("active", "trialing", "past_due", "paused")


def _daily_counts(dates, days: int = CHART_DAYS) -> list:
    """One entry per day, oldest first, including the days when nothing happened."""
    today = datetime.now(timezone.utc).date()
    counts = Counter(d.date() for d in dates if d)
    series = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        series.append({"date": day.isoformat(), "count": counts.get(day, 0)})
    return series


def _grouped(db: Session, column) -> dict:
    return {key or "unknown": count for key, count in db.query(column, func.count()).group_by(column).all()}


@router.get("/overview")
async def overview(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=CHART_DAYS)

    statuses = _grouped(db, Meeting.status)
    total_seconds = db.query(func.coalesce(func.sum(Meeting.duration), 0)).scalar() or 0
    languages = (
        db.query(Meeting.language, func.count())
        .group_by(Meeting.language)
        .order_by(func.count().desc())
        .limit(8)
        .all()
    )

    return {
        "totals": {
            "users": db.query(User).count(),
            "verified_users": db.query(User).filter(User.is_verified.is_(True)).count(),
            "paid_users": db.query(User).filter(User.plan != "free", User.subscription_status.in_(PAID_STATUSES)).count(),
            "meetings": sum(statuses.values()),
            "minutes_recorded": round(total_seconds / 60),
            "feedback_new": db.query(Feedback).filter(Feedback.status == "new").count(),
            "feature_requests_open": db.query(FeatureRequest).filter(FeatureRequest.status == "open").count(),
        },
        "plans": _grouped(db, User.plan),
        "meeting_statuses": statuses,
        "languages": [{"language": language or "unknown", "count": count} for language, count in languages],
        "meetings_by_day": _daily_counts(d for (d,) in db.query(Meeting.upload_date).filter(Meeting.upload_date >= since)),
        "signups_by_day": _daily_counts(d for (d,) in db.query(User.created_at).filter(User.created_at >= since)),
    }


@router.get("/meetings")
async def list_meetings(limit: int = 200, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(Meeting, User.email)
        .outerjoin(User, User.id == Meeting.user_id)
        .order_by(Meeting.upload_date.desc())
        .limit(min(limit, 500))
        .all()
    )
    return {
        "meetings": [
            {
                "id": meeting.id,
                "title": meeting.title,
                "user_email": email,
                "status": meeting.status,
                "language": meeting.language,
                "source": meeting.source,
                "minutes": round((meeting.duration or 0) / 60, 1),
                "upload_date": meeting.upload_date.isoformat() if meeting.upload_date else None,
            }
            for meeting, email in rows
        ]
    }

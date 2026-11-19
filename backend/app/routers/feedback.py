"""
OmniMeetX - Feedback Router

Two ways users tell us what to fix and build:
- Private feedback (bug / idea / other) from the floating button on every page.
- A public feature-request board where everyone upvotes ideas, so the most
  wanted features rise to the top.
Every new item is also emailed to CONTACT_EMAIL.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import is_admin, require_admin
from app.core.security import get_current_user_id
from app.db import get_db
from app.models import Feedback, FeatureRequest, FeatureVote, User
from app.services import email as email_service, email_templates, jobs

logger = logging.getLogger(__name__)

router = APIRouter(tags=["feedback"])

FEEDBACK_KINDS = {"bug", "idea", "other"}
FEEDBACK_STATUSES = {"new", "reviewed"}
REQUEST_STATUSES = {"open", "planned", "in_progress", "done", "declined"}


def _notify_team(subject: str, html: str) -> None:
    """Best-effort email to our inbox; never blocks or fails the request."""
    if email_service.email_configured() and settings.CONTACT_EMAIL:
        jobs.submit(email_service.send_email, settings.CONTACT_EMAIL, subject, html)


def _clean(value, max_len: int) -> str:
    return (value or "").strip()[:max_len]


def _serialize_request(req: FeatureRequest, author: Optional[User], voted: bool, user_id: int) -> dict:
    return {
        "id": req.id,
        "title": req.title,
        "description": req.description or "",
        "status": req.status,
        "votes": req.votes_count,
        "has_voted": voted,
        "is_mine": req.created_by == user_id,
        # First name only: the board is visible to every user.
        "author": (author.full_name or "").split(" ")[0] if author else "",
        "created_at": req.created_at.isoformat() if req.created_at else None,
    }


# ===================== PRIVATE FEEDBACK =====================
@router.post("/api/feedback", status_code=201)
async def submit_feedback(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    data = await request.json()
    kind = data.get("kind") if data.get("kind") in FEEDBACK_KINDS else "other"
    message = _clean(data.get("message"), 5000)
    if len(message) < 3:
        raise HTTPException(400, detail={"error": "Please write a few words of feedback."})

    user = db.query(User).get(user_id)
    item = Feedback(user_id=user_id, kind=kind, message=message, page_url=_clean(data.get("page_url"), 500))
    db.add(item)
    db.commit()

    _notify_team(f"[Feedback · {kind}] from {user.email if user else 'a user'}",
                 email_templates.feedback_notification_email(kind, message, user.email if user else "", item.page_url))
    return {"ok": True, "id": item.id}


@router.get("/api/feedback")
async def list_feedback(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(Feedback, User.email)
        .outerjoin(User, User.id == Feedback.user_id)
        .order_by(Feedback.created_at.desc())
        .limit(200)
        .all()
    )
    return {"feedback": [
        {"id": f.id, "kind": f.kind, "message": f.message, "page_url": f.page_url, "status": f.status,
         "user_email": email, "created_at": f.created_at.isoformat() if f.created_at else None}
        for f, email in rows
    ]}


@router.patch("/api/feedback/{feedback_id}")
async def update_feedback(feedback_id: int, request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    data = await request.json()
    status = data.get("status")
    if status not in FEEDBACK_STATUSES:
        raise HTTPException(400, detail={"error": "Unknown status"})
    item = db.query(Feedback).get(feedback_id)
    if not item:
        raise HTTPException(404, detail={"error": "Not found"})
    item.status = status
    db.commit()
    return {"ok": True, "id": item.id, "status": item.status}


# ===================== FEATURE REQUEST BOARD =====================
@router.get("/api/feature-requests")
async def list_feature_requests(sort: str = "top", status: str = "all",
                                user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    query = db.query(FeatureRequest)
    if status in REQUEST_STATUSES:
        query = query.filter(FeatureRequest.status == status)
    if sort == "new":
        query = query.order_by(FeatureRequest.created_at.desc())
    else:
        query = query.order_by(FeatureRequest.votes_count.desc(), FeatureRequest.created_at.desc())
    requests = query.limit(200).all()

    voted_ids = {
        v.request_id for v in db.query(FeatureVote.request_id)
        .filter(FeatureVote.user_id == user_id, FeatureVote.request_id.in_([r.id for r in requests]))
    } if requests else set()
    authors = {u.id: u for u in db.query(User).filter(User.id.in_({r.created_by for r in requests if r.created_by}))} \
        if requests else {}
    me = db.query(User).get(user_id)

    return {
        "requests": [_serialize_request(r, authors.get(r.created_by), r.id in voted_ids, user_id) for r in requests],
        "is_admin": is_admin(me),
    }


def _add_vote(db: Session, req: FeatureRequest, user_id: int) -> bool:
    if db.query(FeatureVote).filter_by(request_id=req.id, user_id=user_id).first():
        return False
    db.add(FeatureVote(request_id=req.id, user_id=user_id))
    req.votes_count = (req.votes_count or 0) + 1
    return True


@router.post("/api/feature-requests", status_code=201)
async def create_feature_request(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    data = await request.json()
    title = _clean(data.get("title"), 120)
    description = _clean(data.get("description"), 2000)
    if len(title) < 5:
        raise HTTPException(400, detail={"error": "Give your idea a short title (at least 5 characters)."})

    # Same idea already on the board? Count it as a vote instead of a duplicate.
    existing = db.query(FeatureRequest).filter(func.lower(FeatureRequest.title) == title.lower()).first()
    if existing:
        _add_vote(db, existing, user_id)
        db.commit()
        return {"ok": True, "duplicate": True, "request": _serialize_request(existing, None, True, user_id)}

    user = db.query(User).get(user_id)
    req = FeatureRequest(title=title, description=description, created_by=user_id)
    db.add(req)
    db.flush()
    _add_vote(db, req, user_id)
    db.commit()

    _notify_team(f"[Feature request] {title}",
                 email_templates.feature_request_email(title, description, user.email if user else ""))
    return {"ok": True, "duplicate": False, "request": _serialize_request(req, user, True, user_id)}


@router.post("/api/feature-requests/{request_id}/vote")
async def toggle_vote(request_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    req = db.query(FeatureRequest).get(request_id)
    if not req:
        raise HTTPException(404, detail={"error": "Feature request not found"})

    vote = db.query(FeatureVote).filter_by(request_id=request_id, user_id=user_id).first()
    if vote:
        db.delete(vote)
        req.votes_count = max(0, (req.votes_count or 0) - 1)
        voted = False
    else:
        _add_vote(db, req, user_id)
        voted = True
    db.commit()
    return {"voted": voted, "votes": req.votes_count}


@router.patch("/api/feature-requests/{request_id}")
async def update_feature_request(request_id: int, request: Request,
                                 admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    req = db.query(FeatureRequest).get(request_id)
    if not req:
        raise HTTPException(404, detail={"error": "Feature request not found"})
    data = await request.json()
    if data.get("status") not in REQUEST_STATUSES:
        raise HTTPException(400, detail={"error": f"Status must be one of: {', '.join(sorted(REQUEST_STATUSES))}"})
    req.status = data["status"]
    db.commit()
    return {"ok": True, "status": req.status}


@router.delete("/api/feature-requests/{request_id}")
async def delete_feature_request(request_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    req = db.query(FeatureRequest).get(request_id)
    if not req:
        raise HTTPException(404, detail={"error": "Feature request not found"})
    db.query(FeatureVote).filter_by(request_id=request_id).delete()
    db.delete(req)
    db.commit()
    return {"ok": True}

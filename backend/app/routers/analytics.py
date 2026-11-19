"""
OmniMeetX - Analytics Router
Activity feed, usage intensity, processing performance, meeting insights, productivity, leaderboard.
"""
import os
import re
import json
import logging
from datetime import datetime, timedelta, timezone
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, load_only
from sqlalchemy import func, case

from app.db import get_db
from app.models import Meeting, Activity, User
from app.core.security import get_current_user_id
from app.services.notes_format import text_list

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analytics"])


# ===================== ACTIVITIES =====================
@router.get("/api/activities")
async def get_activities(
    limit: int = 50,
    offset: int = 0,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    activities = (
        db.query(Activity)
        .filter_by(user_id=user_id)
        .order_by(Activity.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    total = db.query(Activity).filter_by(user_id=user_id).count()
    return {
        "activities": [
            {
                "id": a.id,
                "type": a.type,
                "title": a.title,
                "description": a.description,
                "timestamp": a.timestamp.isoformat(),
                "meeting_id": a.meeting_id,
                "metadata": json.loads(a.activity_metadata or "{}"),
            }
            for a in activities
        ],
        "total": total,
    }


# ===================== STATS =====================
@router.get("/api/stats")
async def stats(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meetings = db.query(Meeting).filter_by(user_id=user_id).all()
    total_uploads = len(meetings)
    total_words = sum(len(json.loads(m.notes or "{}").get("summary", "").split()) for m in meetings)

    today = datetime.now(timezone.utc).date()
    last_7_days = [(today - timedelta(days=i)).strftime("%a") for i in range(6, -1, -1)]
    uploads_by_day = Counter(m.upload_date.date().strftime("%a") for m in meetings)
    uploads_data = [uploads_by_day.get(day, 0) for day in last_7_days]

    return {
        "total_meetings": total_uploads,
        "completed_meetings": len([m for m in meetings if m.status == "completed"]),
        "total_words": total_words,
        "labels": last_7_days,
        "uploads": uploads_data,
    }


# ===================== USAGE INTENSITY =====================
@router.get("/api/analytics/usage-intensity")
async def get_usage_intensity(
    period: str = "weekly",
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        if period == "weekly":
            start_date = datetime.now(timezone.utc) - timedelta(days=7)
        elif period == "monthly":
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
        else:
            start_date = datetime.now(timezone.utc) - timedelta(days=365)

        meetings = (
            db.query(Meeting)
            .options(load_only(Meeting.id, Meeting.upload_date, Meeting.duration))
            .filter(Meeting.user_id == user_id, Meeting.upload_date >= start_date)
            .all()
        )
        uploads_count = len(meetings)

        meeting_dates = {m.upload_date.date() for m in meetings if m.upload_date}
        activities_in_period = (
            db.query(Activity)
            .options(load_only(Activity.id, Activity.timestamp))
            .filter(Activity.user_id == user_id, Activity.timestamp >= start_date)
            .all()
        )
        activity_dates = {a.timestamp.date() for a in activities_in_period if a.timestamp}
        all_active_dates = meeting_dates.union(activity_dates)
        active_days = len(all_active_dates)

        total_duration_seconds = sum(m.duration if m.duration else 1800 for m in meetings)
        if active_days > 0:
            avg_secs = total_duration_seconds / active_days
            avg_duration_str = f"{int(avg_secs // 3600)}:{int((avg_secs % 3600) // 60):02d}"
        else:
            avg_duration_str = "0:00"

        hour_counts = {}
        for m in meetings:
            if m.upload_date:
                hour_counts[m.upload_date.hour] = hour_counts.get(m.upload_date.hour, 0) + 1
        for a in activities_in_period:
            if a.timestamp:
                hour_counts[a.timestamp.hour] = hour_counts.get(a.timestamp.hour, 0) + 1

        peak_hours = [{"hour": h, "count": c} for h, c in sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)] if hour_counts else [{"hour": 0, "count": 0}]

        return {"active_days": active_days, "uploads_count": uploads_count, "avg_activities_per_day": avg_duration_str, "peak_hours": peak_hours, "period": period}
    except Exception as e:
        logger.error(f"Usage intensity error: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== PROCESSING PERFORMANCE =====================
@router.get("/api/analytics/processing-performance")
async def get_processing_performance(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        # One query for every status instead of four separate counts.
        by_status = dict(
            db.query(Meeting.status, func.count(Meeting.id)).filter(Meeting.user_id == user_id).group_by(Meeting.status).all()
        )
        total_meetings = sum(by_status.values())
        completed_meetings = by_status.get("completed", 0)
        success_rate = (completed_meetings / total_meetings * 100) if total_meetings > 0 else 0

        language_distribution = (
            db.query(Meeting.transcript_language, func.count(Meeting.id))
            .filter(Meeting.user_id == user_id, Meeting.transcript_language.isnot(None))
            .group_by(Meeting.transcript_language)
            .all()
        )

        return {
            "success_rate": round(success_rate, 1),
            "total_processed": total_meetings,
            "completed": completed_meetings,
            "processing": by_status.get("processing", 0),
            "failed": by_status.get("failed", 0),
            "language_distribution": [{"language": lang, "count": count} for lang, count in language_distribution],
            "average_processing_time": 120,
        }
    except Exception as e:
        logger.error(f"Processing performance error: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== MEETING INSIGHTS =====================
@router.get("/api/analytics/meeting-insights")
async def get_meeting_insights(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        stop_words = {
            'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what',
            'when', 'where', 'how', 'why', 'all', 'any', 'both', 'each', 'few',
            'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
            'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just',
            'should', 'now', 'with', 'that', 'from', 'they', 'specific',
            'speaker', 'their', 'about', 'discussion', 'strong', 'would', 'could',
            'there', 'which', 'these', 'those', 'being', 'having', 'doing',
            'through', 'during', 'before', 'after', 'above', 'below', 'between',
            'important', 'however', 'therefore', 'furthermore', 'additionally',
            'this', 'them', 'then', 'here', 'been', 'have', 'has', 'had',
            'does', 'did', 'may', 'might', 'must', 'shall',
        }

        meetings = db.query(Meeting).options(load_only(Meeting.id, Meeting.notes, Meeting.upload_date)).filter_by(user_id=user_id).all()
        all_notes = []
        for meeting in meetings:
            if meeting.notes:
                try:
                    notes_data = json.loads(meeting.notes)
                    if isinstance(notes_data, dict):
                        combined = " ".join([str(notes_data.get('summary') or '')] + [" ".join(text_list(notes_data.get(k))) for k in ("key_points", "action_items", "decisions")])
                        all_notes.append(combined)
                except Exception:
                    pass

        word_freq = {}
        for note in all_notes:
            words = re.findall(r'\b[a-zA-Z]{5,}\b', note.lower())
            for word in words:
                if word not in stop_words:
                    word_freq[word] = word_freq.get(word, 0) + 1

        top_topics = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        final_topics = [(t, f) for t, f in top_topics if t not in stop_words and len(t) >= 5][:5]

        # Upload patterns (simplified for SQLite)
        upload_by_day = []
        day_counts = {}
        for m in meetings:
            if m.upload_date:
                day_name = m.upload_date.strftime("%A")
                day_counts[day_name] = day_counts.get(day_name, 0) + 1
        upload_by_day = [{"day": d, "count": c} for d, c in day_counts.items()]

        # The DB returns naive datetimes (stored as UTC), so compare against naive UTC now.
        first_upload = min((m.upload_date for m in meetings if m.upload_date), default=None)
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        weeks = max((now_utc - first_upload.replace(tzinfo=None)).days / 7, 1) if first_upload else 1

        return {
            "total_meetings_analyzed": len(meetings),
            "top_topics": [{"topic": t.title(), "frequency": f} for t, f in final_topics],
            "upload_patterns": upload_by_day,
            "average_meetings_per_week": len(meetings) / weeks,
            "most_active_day": max(upload_by_day, key=lambda x: x["count"]) if upload_by_day else None,
        }
    except Exception as e:
        logger.error(f"Meeting insights error: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== PRODUCTIVITY =====================
@router.get("/api/analytics/productivity")
async def get_productivity_metrics(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        completed = db.query(Meeting).options(load_only(Meeting.id, Meeting.notes)).filter_by(user_id=user_id, status="completed").all()
        completed_count = len(completed)
        estimated_time_saved = completed_count * 30

        total_action_items = 0
        for m in completed:
            if m.notes:
                try:
                    nd = json.loads(m.notes)
                    total_action_items += len(text_list(nd.get("action_items")))
                except Exception:
                    pass

        export_count = db.query(Activity).filter_by(user_id=user_id, type="export").count()

        return {
            "estimated_time_saved_minutes": estimated_time_saved,
            "estimated_time_saved_hours": round(estimated_time_saved / 60, 1),
            "total_action_items_generated": total_action_items,
            "average_action_items_per_meeting": round(total_action_items / max(completed_count, 1), 1),
            "exports_count": export_count,
            "productivity_score": min(100, completed_count * 10 + total_action_items * 2 + export_count * 5),
        }
    except Exception as e:
        logger.error(f"Productivity metrics error: {e}")
        raise HTTPException(500, detail={"error": str(e)})


# ===================== LEADERBOARD =====================
@router.get("/api/leaderboard")
async def get_leaderboard(
    period: str = "weekly",
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        today = datetime.now(timezone.utc)
        start_date = datetime(today.year, today.month, 1, tzinfo=timezone.utc)

        leaderboard_data = (
            db.query(
                User.id,
                User.full_name,
                User.email,
                func.count(Meeting.id).label("meetings_count"),
                func.sum(case((Meeting.status == "completed", 1), else_=0)).label("completed_count"),
            )
            .join(Meeting, User.id == Meeting.user_id)
            .filter(Meeting.upload_date >= start_date, User.is_active == True)
            .group_by(User.id, User.full_name, User.email)
            .order_by(func.sum(case((Meeting.status == "completed", 1), else_=0)).desc())
            .limit(5)
            .all()
        )

        ranked = []
        for rank, (uid, full_name, email, total, completed) in enumerate(leaderboard_data, 1):
            mine = uid == user_id
            ranked.append({
                "rank": rank,
                # Other customers are strangers: only your own name is shown, never anyone's email.
                "full_name": (full_name or email.split("@")[0]) if mine else "Another member",
                "score": (completed or 0) * 10,
                "completed_meetings": completed or 0,
                "total_meetings": total,
                "is_current_user": mine,
            })

        return {"leaderboard": ranked, "period": "monthly", "updated_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"Leaderboard error: {e}")
        raise HTTPException(500, detail={"error": str(e)})


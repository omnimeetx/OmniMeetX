"""
OmniMeetX - Activity feed, usage metrics and leaderboard models.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey

from app.db.base import Base


class Activity(Base):
    __tablename__ = "activity"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="SET NULL"))  # history outlives a deleted meeting
    activity_metadata = Column(Text, default="{}")


class UserMetrics(Base):
    __tablename__ = "user_metrics"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    date = Column(Date, nullable=False)
    uploads_count = Column(Integer, default=0)
    processing_time_total = Column(Integer, default=0)
    exports_count = Column(Integer, default=0)
    active_minutes = Column(Integer, default=0)
    languages_used = Column(Text, default="[]")


class Leaderboard(Base):
    __tablename__ = "leaderboard"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    period = Column(String(20), nullable=False)
    score = Column(Integer, default=0)
    rank = Column(Integer, default=0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

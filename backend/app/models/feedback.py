"""
OmniMeetX - User feedback and the public feature-request board.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, UniqueConstraint

from app.db.base import Base


class Feedback(Base):
    """A private message from a user: bug report, idea or general feedback."""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    kind = Column(String(20), nullable=False, default="other")      # bug | idea | other
    message = Column(Text, nullable=False)
    page_url = Column(String(500), nullable=True)                   # where the user was
    status = Column(String(20), nullable=False, default="new")      # new | reviewed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class FeatureRequest(Base):
    """A public idea users can upvote — the voted list tells us what to build next."""
    __tablename__ = "feature_requests"

    id = Column(Integer, primary_key=True)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="open")     # open | planned | in_progress | done | declined
    created_by = Column(Integer, ForeignKey("user.id"), nullable=True)
    votes_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("idx_feature_votes_count", "votes_count"),)


class FeatureVote(Base):
    __tablename__ = "feature_votes"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("feature_requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("request_id", "user_id", name="uq_feature_vote"),)

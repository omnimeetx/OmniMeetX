"""
OmniMeetX - Billing models: subscriptions, credit ledger, Paddle webhook log.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index

from app.db.base import Base


class Subscription(Base):
    """
    One row per Paddle subscription lifecycle.
    Tracks plan, billing interval, and renewal dates.
    """
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    paddle_subscription_id = Column(String(100), unique=True, nullable=False)
    paddle_customer_id = Column(String(100), nullable=True)
    plan = Column(String(20), nullable=False)           # pro | premium
    status = Column(String(30), default="active")       # active | past_due | paused | canceled
    billing_interval = Column(String(10), default="month")  # month | year
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at = Column(DateTime, nullable=True)          # scheduled cancellation (end of paid period)
    canceled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class CreditLedger(Base):
    """
    Double-entry audit log for credit changes.
    Every grant, deduction, or refund is a row here.
    """
    __tablename__ = "credit_ledger"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    change = Column(Integer, nullable=False)             # +N for grants, -N for deductions
    balance_after = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)         # e.g. "monthly_refill", "processing", "refund", "top_up"
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True)  # ledger outlives a deleted meeting
    idempotency_key = Column(String(200), nullable=True, unique=True)  # prevents double-processing
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_credit_user", "user_id"),
        Index("idx_credit_idempotency", "idempotency_key"),
    )


class PaddleWebhookEvent(Base):
    """
    Idempotency table: every processed Paddle webhook event ID is stored here
    so we never double-grant or double-revoke credits.
    """
    __tablename__ = "paddle_events"

    id = Column(Integer, primary_key=True)
    event_id = Column(String(200), unique=True, nullable=False)
    event_type = Column(String(100), nullable=False)
    processed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    payload_summary = Column(Text, default="{}")

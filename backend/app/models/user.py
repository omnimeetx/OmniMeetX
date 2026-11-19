"""
OmniMeetX - User model (account, verification, 2FA, billing state).
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime

from app.db.base import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    phone_number = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)  # scrypt hashes are 162 characters
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    reset_token = Column(String(100), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    email_otp = Column(String(6), nullable=True)
    email_verified = Column(Boolean, default=False)
    email_token = Column(String(100), nullable=True)
    email_token_expires = Column(DateTime, nullable=True)
    phone_verified = Column(Boolean, default=False)
    phone_otp = Column(String(6), nullable=True)
    phone_otp_expires = Column(DateTime, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    is_verified = Column(Boolean, default=False)
    password_updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    two_factor_pin_hash = Column(String(255), nullable=True)
    two_factor_enabled = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    deactivated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # --- Billing / subscription ---
    plan = Column(String(20), default="free")           # free | pro | premium | enterprise
    credits_remaining = Column(Integer, default=60)     # audio minutes left this period
    credits_total = Column(Integer, default=60)         # total granted this period
    paddle_customer_id = Column(String(100), nullable=True)
    paddle_subscription_id = Column(String(100), nullable=True)
    subscription_status = Column(String(30), default="none")  # none | active | trialing | past_due | paused | canceled
    current_period_end = Column(DateTime, nullable=True)
    credits_reset_at = Column(DateTime, nullable=True)  # next monthly allowance refill (UTC)

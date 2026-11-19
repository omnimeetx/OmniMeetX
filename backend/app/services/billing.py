"""
OmniMeetX — Billing Service

Plans, credit metering (1 credit = 1 audio minute), monthly allowances and
Paddle Billing: webhook verification, subscription lifecycle, customer portal.
"""
import calendar
import hashlib
import hmac
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User, CreditLedger, Subscription, PaddleWebhookEvent

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Plan definitions — single source of truth
# ---------------------------------------------------------------------------
PLANS = {
    "free": {
        "name": "Starter",
        "monthly_minutes": 60,
        "price_monthly": 0,
        "price_yearly": 0,
        "features": [
            "60 audio minutes / month",
            "Basic AI transcription",
            "AI summaries",
            "50+ languages",
            "PDF export",
        ],
        "model_tier": "cheap",   # Groq + Flash-Lite
    },
    "pro": {
        "name": "Pro",
        "monthly_minutes": 1200,
        "price_monthly": 12,
        "price_yearly": 120,     # 2 months free
        "paddle_monthly_price_id": settings.PADDLE_PRO_MONTHLY_PRICE_ID,
        "paddle_yearly_price_id": settings.PADDLE_PRO_YEARLY_PRICE_ID,
        "features": [
            "1,200 audio minutes / month (20 hrs)",
            "Advanced AI transcription",
            "Action item extraction",
            "Sentiment analysis",
            "Full AI Q&A",
            "Priority processing",
            "Bulk exports (PDF, DOCX)",
        ],
        "model_tier": "standard",  # Groq + Gemini Flash
    },
    "premium": {
        "name": "Premium",
        "monthly_minutes": 3000,
        "price_monthly": 29,
        "price_yearly": 290,
        "paddle_monthly_price_id": settings.PADDLE_PREMIUM_MONTHLY_PRICE_ID,
        "paddle_yearly_price_id": settings.PADDLE_PREMIUM_YEARLY_PRICE_ID,
        "features": [
            "3,000 audio minutes / month (50 hrs)",
            "Speaker diarization (who said what)",
            "Everything in Pro",
            "Advanced analytics dashboard",
            "Team collaboration features",
        ],
        "model_tier": "premium",   # AssemblyAI + Gemini Flash
    },
    "enterprise": {
        "name": "Enterprise",
        "monthly_minutes": 12000,
        "price_monthly": 99,
        "price_yearly": 990,
        "features": [
            "12,000+ audio minutes / month",
            "Custom LLM fine-tuning",
            "SSO / SOC2 / GDPR",
            "Dedicated support",
            "On-premise option",
            "Volume discounting",
        ],
        "model_tier": "premium",
    },
}


def get_plan(plan_name: str) -> dict:
    """Return plan config by name, defaulting to free."""
    return PLANS.get(plan_name, PLANS["free"])


def plan_for_price_id(price_id: str) -> Optional[str]:
    """Resolve a Paddle price ID to a plan name."""
    if not price_id:
        return None
    for name, cfg in PLANS.items():
        if price_id in (cfg.get("paddle_monthly_price_id"), cfg.get("paddle_yearly_price_id")):
            return name
    return None


# ---------------------------------------------------------------------------
# Time helpers (the database stores naive UTC datetimes)
# ---------------------------------------------------------------------------
def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_time(value: Optional[str]) -> Optional[datetime]:
    """RFC 3339 string from Paddle -> naive UTC datetime."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
    except ValueError:
        return None


def add_months(moment: datetime, months: int = 1) -> datetime:
    """Same day next month, clamped to the month's last day (Jan 31 -> Feb 28/29)."""
    month_index = moment.month - 1 + months
    year, month = moment.year + month_index // 12, month_index % 12 + 1
    return moment.replace(year=year, month=month, day=min(moment.day, calendar.monthrange(year, month)[1]))


# ---------------------------------------------------------------------------
# Monthly allowance
# ---------------------------------------------------------------------------
def refresh_monthly_allowance(db: Session, user: User) -> bool:
    """
    Reset the user's minutes to their plan allowance once a month.

    Free users refill here. Paid users also refill on each successful Paddle
    payment; this keeps yearly subscribers (charged once a year) topped up every
    month too. Past-due, paused or canceled subscriptions are not refilled.
    Returns True when a refill happened.
    """
    now = _utcnow()
    if user.credits_reset_at is None:
        user.credits_reset_at = add_months(now)
        db.commit()
        return False
    if now < user.credits_reset_at:
        return False
    plan = user.plan or "free"
    if plan != "free" and user.subscription_status not in ("active", "trialing"):
        return False

    period = user.credits_reset_at
    grant_credits(db, user.id, get_plan(plan)["monthly_minutes"], reason="monthly_refill",
                  idempotency_key=f"refill-{user.id}-{period:%Y%m%d}", set_total=True)
    while period <= now:
        period = add_months(period)
    user.credits_reset_at = period
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Credit helpers
# ---------------------------------------------------------------------------
def check_credits(db: Session, user_id: int, required_minutes: int) -> dict:
    """
    Check if a user has enough credits.
    Returns {"ok": True/False, "remaining": N, "required": N, "plan": "..."}
    """
    user = db.query(User).get(user_id)
    if not user:
        return {"ok": False, "remaining": 0, "required": required_minutes, "plan": "free"}
    refresh_monthly_allowance(db, user)
    remaining = user.credits_remaining or 0
    return {
        "ok": remaining >= required_minutes,
        "remaining": remaining,
        "required": required_minutes,
        "plan": user.plan or "free",
    }


def deduct_credits(
    db: Session,
    user_id: int,
    minutes: int,
    reason: str = "processing",
    meeting_id: Optional[int] = None,
    idempotency_key: Optional[str] = None,
) -> dict:
    """
    Deduct audio minutes from a user's balance.
    Returns {"ok": True, "remaining": N} or {"ok": False, "error": "..."}.
    """
    if idempotency_key:
        existing = db.query(CreditLedger).filter_by(idempotency_key=idempotency_key).first()
        if existing:
            user = db.query(User).get(user_id)
            return {"ok": True, "remaining": user.credits_remaining if user else 0, "note": "already_processed"}

    user = db.query(User).get(user_id)
    if not user:
        return {"ok": False, "error": "User not found"}

    remaining = user.credits_remaining or 0
    if remaining < minutes:
        return {
            "ok": False,
            "error": "Insufficient credits",
            "remaining": remaining,
            "required": minutes,
            "plan": user.plan or "free",
        }

    user.credits_remaining = remaining - minutes
    entry = CreditLedger(
        user_id=user_id,
        change=-minutes,
        balance_after=user.credits_remaining,
        reason=reason,
        meeting_id=meeting_id,
        idempotency_key=idempotency_key,
    )
    db.add(entry)
    db.commit()
    logger.info(f"Deducted {minutes} min from user {user_id} ({reason}). Remaining: {user.credits_remaining}")
    return {"ok": True, "remaining": user.credits_remaining}


def grant_credits(
    db: Session,
    user_id: int,
    minutes: int,
    reason: str = "monthly_refill",
    idempotency_key: Optional[str] = None,
    set_total: bool = False,
) -> dict:
    """
    Add audio minutes to a user's balance.
    If set_total=True, reset balance to `minutes` instead of adding.
    """
    if idempotency_key:
        existing = db.query(CreditLedger).filter_by(idempotency_key=idempotency_key).first()
        if existing:
            user = db.query(User).get(user_id)
            return {"ok": True, "remaining": user.credits_remaining if user else 0, "note": "already_processed"}

    user = db.query(User).get(user_id)
    if not user:
        return {"ok": False, "error": "User not found"}

    old_balance = user.credits_remaining or 0
    if set_total:
        user.credits_remaining = minutes
        user.credits_total = minutes
        change = minutes - old_balance
    else:
        user.credits_remaining = old_balance + minutes
        change = minutes

    entry = CreditLedger(
        user_id=user_id,
        change=change,
        balance_after=user.credits_remaining,
        reason=reason,
        idempotency_key=idempotency_key,
    )
    db.add(entry)
    db.commit()
    logger.info(f"Granted {minutes} min to user {user_id} ({reason}). Balance: {user.credits_remaining}")
    return {"ok": True, "remaining": user.credits_remaining}


def refund_credits(
    db: Session,
    user_id: int,
    minutes: int,
    meeting_id: Optional[int] = None,
    idempotency_key: Optional[str] = None,
) -> dict:
    """
    Refund minutes when processing fails on our side.

    Pass the key of the processing attempt being refunded. Without one, every
    call is a distinct refund — the old default (user + meeting + minutes)
    made a second refund of the same amount silently do nothing.
    """
    key = idempotency_key or f"refund-{user_id}-{meeting_id}-{uuid.uuid4().hex}"
    return grant_credits(db, user_id, minutes, reason="refund", idempotency_key=key)


def get_billing_status(db: Session, user_id: int) -> dict:
    """Aggregate billing info for the /api/billing/status endpoint."""
    user = db.query(User).get(user_id)
    if not user:
        return {"error": "User not found"}
    refresh_monthly_allowance(db, user)

    plan_name = user.plan or "free"
    plan_cfg = get_plan(plan_name)
    sub = None
    if user.paddle_subscription_id:
        sub = db.query(Subscription).filter_by(paddle_subscription_id=user.paddle_subscription_id).first()

    # Recent ledger entries
    recent = (
        db.query(CreditLedger)
        .filter_by(user_id=user_id)
        .order_by(CreditLedger.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "plan": plan_name,
        "plan_name": plan_cfg["name"],
        "credits_remaining": user.credits_remaining or 0,
        "credits_total": user.credits_total or plan_cfg["monthly_minutes"],
        "credits_reset_at": user.credits_reset_at.isoformat() if user.credits_reset_at else None,
        "subscription_status": user.subscription_status or "none",
        "current_period_end": user.current_period_end.isoformat() if user.current_period_end else None,
        "cancel_at": sub.cancel_at.isoformat() if sub and sub.cancel_at else None,
        "can_manage_subscription": bool(user.paddle_customer_id),
        "features": plan_cfg["features"],
        "usage_history": [
            {
                "id": e.id,
                "change": e.change,
                "balance_after": e.balance_after,
                "reason": e.reason,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in recent
        ],
    }


def has_paid_subscription(user: User) -> bool:
    """A live paid subscription the customer should manage instead of buying another."""
    return (user.plan or "free") != "free" and user.subscription_status in ("active", "trialing", "past_due", "paused")


# ---------------------------------------------------------------------------
# Paddle webhook verification & processing
# ---------------------------------------------------------------------------
def verify_paddle_signature(signature_header: str, raw_body: bytes, now: Optional[float] = None) -> bool:
    """
    Verify a Paddle `Paddle-Signature` header: `ts=<unix>;h1=<hex>[;h1=<hex>]`.

    h1 = HMAC-SHA256(secret, f"{ts}:{raw_body}"). Several h1 values appear while
    a secret is being rotated, so any match is accepted. Old timestamps are
    rejected so a captured webhook cannot be replayed later.
    """
    secret = settings.PADDLE_WEBHOOK_SECRET
    if not secret or not signature_header:
        return False
    try:
        ts, signatures = None, []
        for part in signature_header.split(";"):
            key, _, value = part.strip().partition("=")
            if key == "ts":
                ts = value
            elif key == "h1":
                signatures.append(value)
        if not ts or not signatures:
            return False
        current = time.time() if now is None else now
        if abs(current - int(ts)) > settings.PADDLE_WEBHOOK_TOLERANCE_SECONDS:
            logger.warning("Paddle webhook rejected: timestamp outside tolerance (possible replay)")
            return False
        expected = hmac.new(secret.encode(), f"{ts}:".encode() + raw_body, hashlib.sha256).hexdigest()
        return any(hmac.compare_digest(expected, sig) for sig in signatures)
    except Exception as e:
        logger.error(f"Paddle signature verification error: {e}")
        return False


def _plan_from_items(items) -> Optional[str]:
    for item in items or []:
        price = item.get("price") or {}
        plan = plan_for_price_id(price.get("id") or item.get("price_id"))
        if plan:
            return plan
    return None


def _find_user_for_event(db: Session, event_type: str, entity: dict) -> Optional[User]:
    """custom_data.user_id from checkout, else the known subscription, else the known customer."""
    custom = entity.get("custom_data") or {}
    if custom.get("user_id"):
        try:
            user = db.query(User).get(int(custom["user_id"]))
            if user:
                return user
        except (TypeError, ValueError):
            pass

    sub_id = entity.get("id") if event_type.startswith("subscription.") else entity.get("subscription_id")
    if sub_id:
        sub = db.query(Subscription).filter_by(paddle_subscription_id=sub_id).first()
        if sub:
            return db.query(User).get(sub.user_id)

    customer_id = entity.get("customer_id")
    if customer_id:
        return db.query(User).filter_by(paddle_customer_id=customer_id).first()
    return None


def _upsert_subscription(db: Session, user: User, sub_id: str, plan: Optional[str], **fields) -> Subscription:
    sub = db.query(Subscription).filter_by(paddle_subscription_id=sub_id).first()
    if sub is None:
        sub = Subscription(user_id=user.id, paddle_subscription_id=sub_id, plan=plan or user.plan or "pro")
        db.add(sub)
    if plan:
        sub.plan = plan
    for key, value in fields.items():
        setattr(sub, key, value)
    return sub


def _downgrade_to_free(db: Session, user: User, event_id: str) -> None:
    """Paid period is over: back to the free allowance (never adds minutes)."""
    free_minutes = get_plan("free")["monthly_minutes"]
    user.plan = "free"
    user.subscription_status = "canceled"
    remaining = min(user.credits_remaining or 0, free_minutes)
    grant_credits(db, user.id, remaining, reason="subscription_ended",
                  idempotency_key=f"downgrade-{event_id}", set_total=True)
    user.credits_total = free_minutes
    user.credits_reset_at = add_months(_utcnow())


def _handle_subscription_event(db: Session, user: User, event_type: str, event_id: str, entity: dict) -> str:
    sub_id = entity.get("id", "")
    status = entity.get("status") or ("canceled" if event_type == "subscription.canceled" else "active")
    plan = _plan_from_items(entity.get("items")) or (entity.get("custom_data") or {}).get("plan")
    if plan not in PLANS or plan == "free":
        plan = None
    period = entity.get("current_billing_period") or {}
    scheduled = entity.get("scheduled_change") or {}
    cancel_at = _parse_time(scheduled.get("effective_at")) if scheduled.get("action") == "cancel" else None

    _upsert_subscription(
        db, user, sub_id, plan,
        status=status,
        paddle_customer_id=entity.get("customer_id"),
        billing_interval=(entity.get("billing_cycle") or {}).get("interval") or "month",
        current_period_start=_parse_time(period.get("starts_at")),
        current_period_end=_parse_time(period.get("ends_at")),
        cancel_at=cancel_at,
        canceled_at=_parse_time(entity.get("canceled_at")) if status == "canceled" else None,
    )
    if entity.get("customer_id"):
        user.paddle_customer_id = entity["customer_id"]
    user.paddle_subscription_id = sub_id
    user.current_period_end = _parse_time(period.get("ends_at")) or user.current_period_end

    if status == "canceled":
        _downgrade_to_free(db, user, event_id)
        return "subscription_canceled"

    user.subscription_status = status
    if plan and status in ("active", "trialing"):
        user.plan = plan
    return f"subscription_{status}" + (" (cancels at period end)" if cancel_at else "")


def _handle_transaction_completed(db: Session, user: User, event_id: str, entity: dict) -> str:
    """A successful subscription payment (first purchase, renewal or upgrade): reset minutes."""
    sub_id = entity.get("subscription_id")
    origin = entity.get("origin") or ""
    if not sub_id:
        return "ignored_one_time_transaction"
    if origin == "subscription_payment_method_change":
        return "ignored_payment_method_change"

    plan = _plan_from_items(entity.get("items")) or (entity.get("custom_data") or {}).get("plan")
    if plan not in PLANS or plan == "free":
        logger.warning(f"Paddle transaction {entity.get('id')} has no recognised plan price")
        return "ignored_unknown_price"

    period = entity.get("billing_period") or {}
    _upsert_subscription(db, user, sub_id, plan, status="active", paddle_customer_id=entity.get("customer_id"))
    user.plan = plan
    user.subscription_status = "active"
    user.paddle_subscription_id = sub_id
    if entity.get("customer_id"):
        user.paddle_customer_id = entity["customer_id"]
    user.current_period_end = _parse_time(period.get("ends_at")) or user.current_period_end

    grant_credits(db, user.id, get_plan(plan)["monthly_minutes"], reason=f"subscription_payment:{origin or 'web'}",
                  idempotency_key=f"txn-{entity.get('id') or event_id}", set_total=True)
    user.credits_reset_at = add_months(_utcnow())
    return f"credited_{plan}"


def process_paddle_event(db: Session, event_type: str, data: dict) -> dict:
    """
    Idempotent Paddle Billing webhook processor.

    Minutes are only granted on `transaction.completed` (money actually
    collected); subscription.* events keep plan and status in sync.
    Returns {"ok": True, "action": "..."} or {"ok": False, "error": "..."}.
    """
    event_id = data.get("event_id", "")
    if not event_id:
        return {"ok": False, "error": "Missing event_id"}

    if db.query(PaddleWebhookEvent).filter_by(event_id=event_id).first():
        return {"ok": True, "action": "already_processed"}

    entity = data.get("data") or {}
    user = _find_user_for_event(db, event_type, entity)

    if user is None:
        action = "ignored_no_user"
        logger.warning(f"Paddle webhook {event_type} ({event_id}) matches no user")
    elif event_type.startswith("subscription."):
        action = _handle_subscription_event(db, user, event_type, event_id, entity)
    elif event_type == "transaction.completed":
        action = _handle_transaction_completed(db, user, event_id, entity)
    else:
        action = "ignored"

    db.add(PaddleWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        payload_summary=json.dumps({"user_id": user.id if user else None, "action": action}),
    ))
    db.commit()

    logger.info(f"Paddle webhook processed: {event_type} → {action} (user={user.id if user else None})")
    return {"ok": True, "action": action}


# ---------------------------------------------------------------------------
# Paddle API
# ---------------------------------------------------------------------------
class PaddleNotConfigured(RuntimeError):
    """PADDLE_API_KEY is not set."""


def create_portal_session(customer_id: str, subscription_id: Optional[str] = None) -> dict:
    """
    Ask Paddle for a customer-portal session: a page where the customer can
    cancel, change payment method and see invoices. Links are temporary.
    """
    if not settings.PADDLE_API_KEY:
        raise PaddleNotConfigured("PADDLE_API_KEY is not set")
    body = {"subscription_ids": [subscription_id]} if subscription_id else {}
    resp = requests.post(
        f"{settings.paddle_api_base}/customers/{customer_id}/portal-sessions",
        headers={"Authorization": f"Bearer {settings.PADDLE_API_KEY}"},
        json=body,
        timeout=15,
    )
    resp.raise_for_status()
    urls = resp.json()["data"]["urls"]
    sub_urls = (urls.get("subscriptions") or [{}])[0]
    return {
        "overview_url": urls["general"]["overview"],
        "cancel_url": sub_urls.get("cancel_subscription"),
        "update_payment_method_url": sub_urls.get("update_subscription_payment_method"),
    }

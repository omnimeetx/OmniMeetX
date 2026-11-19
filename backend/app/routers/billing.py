"""
OmniMeetX — Billing Router

Plan info, credit status, Paddle checkout preparation, customer portal and
the Paddle webhook receiver.
"""
import json
import logging
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.security import get_current_user_id
from app.db import get_db
from app.models import User
from app.services import billing

logger = logging.getLogger(__name__)

router = APIRouter(tags=["billing"])


# ===================== PUBLIC PLAN INFO =====================
@router.get("/api/billing/plans")
async def list_plans():
    """Public endpoint — returns all plan details for the pricing page."""
    plans = []
    for key, cfg in billing.PLANS.items():
        plans.append({
            "id": key,
            "name": cfg["name"],
            "monthly_minutes": cfg["monthly_minutes"],
            "price_monthly": cfg["price_monthly"],
            "price_yearly": cfg.get("price_yearly", 0),
            "features": cfg["features"],
            "paddle_monthly_price_id": cfg.get("paddle_monthly_price_id", ""),
            "paddle_yearly_price_id": cfg.get("paddle_yearly_price_id", ""),
        })
    return {"plans": plans}


# ===================== USER BILLING STATUS =====================
@router.get("/api/billing/status")
async def billing_status(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Authenticated — current user's plan, credits, and usage history."""
    status = billing.get_billing_status(db, user_id)
    if "error" in status:
        raise HTTPException(404, detail={"error": status["error"]})
    return status


# ===================== PADDLE WEBHOOK =====================
@router.post("/api/billing/webhook")
async def paddle_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Paddle sends subscription and payment events here.
    Signature-verified (with replay protection) and idempotent.
    """
    raw_body = await request.body()
    signature = request.headers.get("Paddle-Signature", "")

    if settings.PADDLE_WEBHOOK_SECRET:
        if not billing.verify_paddle_signature(signature, raw_body):
            logger.warning("Paddle webhook: invalid or expired signature")
            raise HTTPException(401, detail={"error": "Invalid webhook signature"})
    elif settings.is_production:
        logger.error("Paddle webhook refused: PADDLE_WEBHOOK_SECRET is not set in production")
        raise HTTPException(503, detail={"error": "Webhook verification is not configured"})
    else:
        logger.warning("PADDLE_WEBHOOK_SECRET not set — accepting UNSIGNED webhook (development only)")

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(400, detail={"error": "Invalid JSON"})

    event_type = payload.get("event_type", "")
    result = billing.process_paddle_event(db, event_type, payload)
    if not result.get("ok"):
        logger.warning(f"Paddle webhook processing failed: {result}")
        # Return 200 anyway so Paddle doesn't retry endlessly for data issues
        return {"status": "error", "detail": result.get("error", "unknown")}

    return {"status": "ok", "action": result.get("action", "")}


# ===================== CREATE CHECKOUT =====================
@router.post("/api/billing/create-checkout")
async def create_checkout(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Prepare data for a Paddle checkout. The frontend opens Paddle.js with it;
    `custom_data.user_id` lets the webhook credit the right account.
    """
    data = await request.json()
    plan_id = data.get("plan", "pro")
    interval = "year" if data.get("interval") == "year" else "month"

    if plan_id not in ("pro", "premium"):
        raise HTTPException(400, detail={"error": f"Cannot subscribe to '{plan_id}' via checkout"})

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    if billing.has_paid_subscription(user):
        raise HTTPException(409, detail={
            "error": "You already have a subscription. Use Manage subscription to change or cancel it.",
            "code": "subscription_exists",
        })

    plan_cfg = billing.get_plan(plan_id)
    price_id = plan_cfg.get(f"paddle_{interval}ly_price_id", "")
    if not price_id:
        raise HTTPException(503, detail={
            "error": "Payments for this plan aren't set up yet. Please try again soon.",
            "code": "price_not_configured",
        })

    return {
        "price_id": price_id,
        "customer_email": user.email,
        "customer_id": user.paddle_customer_id or None,
        "custom_data": {
            "user_id": str(user_id),
            "plan": plan_id,
        },
        "sandbox": settings.PADDLE_SANDBOX,
        "plan": {
            "name": plan_cfg["name"],
            "price": plan_cfg["price_monthly"] if interval == "month" else plan_cfg.get("price_yearly", 0),
            "minutes": plan_cfg["monthly_minutes"],
        },
    }


# ===================== CUSTOMER PORTAL =====================
@router.post("/api/billing/portal")
async def customer_portal(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Paddle-hosted page where the customer cancels, changes card or downloads invoices."""
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})
    if not user.paddle_customer_id:
        raise HTTPException(400, detail={"error": "You don't have a subscription to manage yet."})

    try:
        return await run_in_threadpool(billing.create_portal_session, user.paddle_customer_id, user.paddle_subscription_id)
    except billing.PaddleNotConfigured:
        raise HTTPException(503, detail={"error": "Subscription management isn't available right now."})
    except requests.RequestException as e:
        logger.error(f"Paddle portal session failed for user {user_id}: {e}")
        raise HTTPException(502, detail={"error": "Couldn't reach the billing provider. Please try again."})


# ===================== DEV HELPER =====================
@router.post("/api/billing/dev-simulate-plan")
async def dev_simulate_plan(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    DEV ONLY — instantly switch a user's plan for testing.
    Disabled in production and whenever PADDLE_SANDBOX is false.
    """
    if not settings.PADDLE_SANDBOX or settings.is_production:
        raise HTTPException(403, detail={"error": "Only available in sandbox/dev mode"})

    data = await request.json()
    plan_id = data.get("plan", "pro")
    plan_cfg = billing.get_plan(plan_id)

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    old_plan = user.plan
    user.plan = plan_id
    user.subscription_status = "active" if plan_id != "free" else "none"

    billing.grant_credits(
        db, user_id, plan_cfg["monthly_minutes"],
        reason=f"dev_simulate_{plan_id}",
        idempotency_key=f"dev-sim-{user_id}-{plan_id}-{datetime.now(timezone.utc).isoformat()}",
        set_total=True,
    )

    logger.info(f"DEV: User {user_id} plan changed {old_plan} → {plan_id}")
    return {
        "ok": True,
        "plan": plan_id,
        "credits_remaining": user.credits_remaining,
        "credits_total": user.credits_total,
    }

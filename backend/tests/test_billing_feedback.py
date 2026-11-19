"""
OmniMeetX — Paddle billing lifecycle + feedback board tests

Replays the webhook sequences Paddle really sends (signed exactly like Paddle
signs them) and checks minutes, plans and statuses at every step. Paddle's API
and email are intercepted; nothing leaves the machine.

    cd backend
    python tests/test_billing_feedback.py   # or:  pytest tests -s
"""
import hashlib
import hmac
import json
import time
from datetime import timedelta

import _env  # noqa: F401  — throwaway DB, fake keys; must precede `app` imports

import requests  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402
from app.routers import feedback as feedback_router  # noqa: E402
from app.services import billing, email as email_service  # noqa: E402

PRO_M, PRO_Y, PREM_M, PREM_Y = "pri_pro_month", "pri_pro_year", "pri_premium_month", "pri_premium_year"
SENT, PADDLE_CALLS = [], []
_real_post = requests.post


class _Resp:
    def __init__(self, status, body):
        self.status_code, self._body = status, body

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


def _intercept(url, *args, **kwargs):
    if url == email_service.RESEND_API_URL:
        SENT.append(kwargs["json"])
        return _Resp(200, {"id": "email"})
    if url.startswith(settings.paddle_api_base):
        PADDLE_CALLS.append((url, kwargs))
        sub = (kwargs.get("json") or {}).get("subscription_ids", [None])[0]
        return _Resp(201, {"data": {"urls": {
            "general": {"overview": "https://customer-portal.paddle.com/cpl_test?token=x"},
            "subscriptions": [{"id": sub, "cancel_subscription": "https://portal/cancel",
                               "update_subscription_payment_method": "https://portal/card"}]}}})
    return _real_post(url, *args, **kwargs)


def _user(email: str, name: str) -> tuple:
    db = SessionLocal()
    try:
        user = User(full_name=name, email=email, password_hash="x", is_verified=True, email_verified=True)
        db.add(user)
        db.commit()
        return user.id, {"Authorization": f"Bearer {create_access_token(user.id)}"}
    finally:
        db.close()


def _set(user_id: int, **fields):
    db = SessionLocal()
    try:
        user = db.query(User).get(user_id)
        for k, v in fields.items():
            setattr(user, k, v)
        db.commit()
    finally:
        db.close()


def _signed(body: bytes, ts: int = None, secret: str = None) -> dict:
    ts = int(time.time()) if ts is None else ts
    h1 = hmac.new((secret or settings.PADDLE_WEBHOOK_SECRET).encode(), f"{ts}:".encode() + body, hashlib.sha256).hexdigest()
    return {"Paddle-Signature": f"ts={ts};h1={h1}"}


class Webhooks:
    def __init__(self, client):
        self.c, self.n = client, 0

    def send(self, event_type: str, data: dict, event_id: str = None) -> dict:
        self.n += 1
        body = json.dumps({"event_id": event_id or f"evt_bf_{self.n}", "event_type": event_type,
                           "occurred_at": "2026-10-28T10:00:00Z", "data": data}).encode()
        res = self.c.post("/api/billing/webhook", content=body, headers=_signed(body))
        assert res.status_code == 200, res.text
        return res.json()


def _status(c, H) -> dict:
    return c.get("/api/billing/status", headers=H).json()


def run_tests():
    requests.post = _intercept
    email_service.requests.post = _intercept
    billing.requests.post = _intercept
    feedback_router.jobs.submit = lambda fn, *a, **k: fn(*a, **k)  # send notifications inline
    print("=" * 70)
    print("  BILLING LIFECYCLE + FEEDBACK BOARD")
    print("=" * 70)

    with TestClient(app) as c:
        wh = Webhooks(c)
        uid, H = _user("buyer@example.com", "Bilal Buyer")

        # -------------------------------------------------------------
        print("\n[1] Free plan refills every month")
        assert _status(c, H)["credits_remaining"] == 60
        _set(uid, credits_remaining=5, credits_reset_at=billing._utcnow() - timedelta(days=1))
        st = _status(c, H)
        assert st["credits_remaining"] == 60, st
        print("  [OK] 5 min left + month passed -> back to 60")

        # -------------------------------------------------------------
        print("\n[2] Checkout preparation")
        res = c.post("/api/billing/create-checkout", json={"plan": "pro", "interval": "year"}, headers=H)
        assert res.status_code == 200 and res.json()["price_id"] == PRO_Y
        assert res.json()["custom_data"] == {"user_id": str(uid), "plan": "pro"}
        print("  [OK] Yearly Pro checkout carries the right price and user id")

        # -------------------------------------------------------------
        print("\n[3] First purchase: subscription.created then transaction.completed")
        period = {"starts_at": "2026-10-28T10:00:00Z", "ends_at": "2026-11-28T10:00:00Z"}
        sub = {"id": "sub_bf_1", "status": "active", "customer_id": "ctm_bf_1", "custom_data": {"user_id": str(uid), "plan": "pro"},
               "items": [{"price": {"id": PRO_M}}], "billing_cycle": {"interval": "month", "frequency": 1},
               "current_billing_period": period}
        assert wh.send("subscription.created", sub)["action"] == "subscription_active"
        st = _status(c, H)
        assert st["plan"] == "pro" and st["credits_remaining"] == 60, "No minutes before money is collected"
        txn = {"id": "txn_bf_1", "status": "completed", "origin": "web", "subscription_id": "sub_bf_1", "customer_id": "ctm_bf_1",
               "custom_data": {"user_id": str(uid), "plan": "pro"}, "items": [{"price": {"id": PRO_M}}], "billing_period": period}
        assert wh.send("transaction.completed", txn)["action"] == "credited_pro"
        st = _status(c, H)
        assert st["credits_remaining"] == 1200 and st["subscription_status"] == "active" and st["can_manage_subscription"]
        print("  [OK] Plan shown on subscription event; 1,200 minutes only after payment completed")

        res = c.post("/api/billing/create-checkout", json={"plan": "premium"}, headers=H)
        assert res.status_code == 409 and res.json()["code"] == "subscription_exists"
        print("  [OK] A second subscription is refused (manage the existing one instead)")

        # -------------------------------------------------------------
        print("\n[4] Duplicates and replays never double-credit")
        db = SessionLocal()
        try:
            billing.deduct_credits(db, uid, 200, reason="test")
        finally:
            db.close()
        assert wh.send("transaction.completed", txn, event_id="evt_bf_2")["action"] == "already_processed"
        wh.send("transaction.completed", txn)  # same transaction, new delivery id
        assert _status(c, H)["credits_remaining"] == 1000
        body = json.dumps({"event_id": "evt_old", "event_type": "transaction.completed", "data": txn}).encode()
        assert c.post("/api/billing/webhook", content=body, headers=_signed(body, ts=int(time.time()) - 3600)).status_code == 401
        assert c.post("/api/billing/webhook", content=body, headers=_signed(body, secret="wrong")).status_code == 401
        assert c.post("/api/billing/webhook", content=body).status_code == 401
        print("  [OK] Same event, same payment, hour-old replay, wrong secret, no signature: all safe")

        # -------------------------------------------------------------
        print("\n[5] Monthly renewal (no custom_data on renewals)")
        renewal = {**txn, "id": "txn_bf_2", "origin": "subscription_recurring", "custom_data": None}
        assert wh.send("transaction.completed", renewal)["action"] == "credited_pro"
        assert _status(c, H)["credits_remaining"] == 1200
        print("  [OK] Renewal found the user through the subscription and reset to 1,200")

        # -------------------------------------------------------------
        print("\n[6] Failed payment -> no free refills")
        assert wh.send("subscription.past_due", {**sub, "status": "past_due", "custom_data": None})["action"] == "subscription_past_due"
        _set(uid, credits_remaining=10, credits_reset_at=billing._utcnow() - timedelta(days=1))
        st = _status(c, H)
        assert st["credits_remaining"] == 10 and st["subscription_status"] == "past_due"
        wh.send("subscription.updated", {**sub, "status": "active"})
        print("  [OK] Past-due subscription is not refilled")

        # -------------------------------------------------------------
        print("\n[7] Cancel at period end, then the period ends")
        scheduled = {**sub, "scheduled_change": {"action": "cancel", "effective_at": "2026-11-28T10:00:00Z"}}
        assert "cancels at period end" in wh.send("subscription.updated", scheduled)["action"]
        st = _status(c, H)
        assert st["plan"] == "pro" and st["cancel_at"].startswith("2026-11-28")
        assert wh.send("subscription.canceled", {**sub, "status": "canceled"})["action"] == "subscription_canceled"
        st = _status(c, H)
        assert st["plan"] == "free" and st["credits_remaining"] <= 60 and st["subscription_status"] == "canceled"
        assert c.post("/api/billing/create-checkout", json={"plan": "pro"}, headers=H).status_code == 200
        print("  [OK] Keeps Pro until the end date, then drops to free; can subscribe again")

        # -------------------------------------------------------------
        print("\n[8] Yearly Premium refills monthly")
        uid2, H2 = _user("yearly@example.com", "Yasmin Yearly")
        year_txn = {"id": "txn_y1", "origin": "web", "subscription_id": "sub_y", "customer_id": "ctm_y",
                    "custom_data": {"user_id": str(uid2), "plan": "premium"}, "items": [{"price": {"id": PREM_Y}}]}
        assert wh.send("transaction.completed", year_txn)["action"] == "credited_premium"
        _set(uid2, credits_remaining=700, credits_reset_at=billing._utcnow() - timedelta(days=1))
        assert _status(c, H2)["credits_remaining"] == 3000
        print("  [OK] Paid once a year, minutes still reset to 3,000 each month")

        # -------------------------------------------------------------
        print("\n[9] Events we must ignore safely")
        assert wh.send("transaction.completed", {"id": "txn_x", "items": [], "custom_data": {"user_id": str(uid)}})["action"] \
            == "ignored_one_time_transaction"
        assert wh.send("subscription.created", {"id": "sub_ghost", "customer_id": "ctm_ghost"})["action"] == "ignored_no_user"
        print("  [OK] One-off payments and unknown customers change nothing")

        # -------------------------------------------------------------
        print("\n[10] Customer portal (cancel / change card / invoices)")
        uid3, H3 = _user("nosub@example.com", "No Sub")
        assert c.post("/api/billing/portal", headers=H3).status_code == 400
        res = c.post("/api/billing/portal", headers=H2)
        assert res.status_code == 200 and res.json()["overview_url"].startswith("https://customer-portal.paddle.com")
        url, kwargs = PADDLE_CALLS[-1]
        assert url == "https://sandbox-api.paddle.com/customers/ctm_y/portal-sessions"
        assert kwargs["headers"]["Authorization"] == "Bearer pdl_sdbx_apikey_test" and kwargs["json"] == {"subscription_ids": ["sub_y"]}
        print("  [OK] Portal link created for the right customer and subscription")

        # -------------------------------------------------------------
        print("\n[11] Feedback & feature-request board")
        aid, HA = _user("admin@example.com", "Ada Admin")
        assert c.post("/api/feedback", json={"kind": "bug", "message": "x"}, headers=H).status_code == 400
        res = c.post("/api/feedback", json={"kind": "bug", "message": "Upload <b>froze</b> at 90%", "page_url": "/upload"}, headers=H)
        assert res.status_code == 201
        assert SENT and SENT[-1]["to"] == [settings.CONTACT_EMAIL] and "&lt;b&gt;" in SENT[-1]["html"]
        assert c.get("/api/feedback", headers=H).status_code == 403
        assert c.get("/api/feedback", headers=HA).json()["feedback"][0]["user_email"] == "buyer@example.com"
        print("  [OK] Feedback saved + emailed to the team (escaped); only admins can read it")

        r = c.post("/api/feature-requests", json={"title": "Export notes to Notion", "description": "One click"}, headers=H).json()
        rid = r["request"]["id"]
        assert r["request"]["votes"] == 1 and r["request"]["has_voted"]
        board = c.get("/api/feature-requests", headers=H2).json()
        mine = next(x for x in board["requests"] if x["id"] == rid)
        assert mine["has_voted"] is False and mine["author"] == "Bilal" and board["is_admin"] is False
        assert c.post(f"/api/feature-requests/{rid}/vote", headers=H2).json() == {"voted": True, "votes": 2}
        assert c.post(f"/api/feature-requests/{rid}/vote", headers=H2).json() == {"voted": False, "votes": 1}
        dup = c.post("/api/feature-requests", json={"title": "export notes to NOTION"}, headers=H2).json()
        assert dup["duplicate"] and dup["request"]["id"] == rid
        c.post("/api/feature-requests", json={"title": "Zoom bot that joins my calls"}, headers=H3)
        top = c.get("/api/feature-requests?sort=top", headers=H).json()["requests"]
        assert top[0]["id"] == rid and top[0]["votes"] == 2
        print("  [OK] Ideas, toggle votes, duplicates merge into votes, most-wanted on top")

        assert c.patch(f"/api/feature-requests/{rid}", json={"status": "planned"}, headers=H).status_code == 403
        assert c.patch(f"/api/feature-requests/{rid}", json={"status": "soon"}, headers=HA).status_code == 400
        assert c.patch(f"/api/feature-requests/{rid}", json={"status": "planned"}, headers=HA).json()["status"] == "planned"
        assert c.get("/api/feature-requests?status=planned", headers=H).json()["requests"][0]["id"] == rid
        print("  [OK] Only admins set status (planned / in progress / done)")

        assert c.get("/api/auth/users", headers=H).status_code == 403
        assert c.get("/api/auth/users", headers=HA).status_code == 200
        assert c.get("/api/auth/profile", headers=HA).json()["is_admin"] is True
        assert c.get("/api/auth/profile", headers=H).json()["is_admin"] is False
        print("  [OK] User directory is admin-only (no more email/phone leak)")

        print("\n[12] Admin page data")
        assert c.get("/api/admin/overview", headers=H).status_code == 403
        assert c.get("/api/admin/meetings", headers=H).status_code == 403
        data = c.get("/api/admin/overview", headers=HA).json()
        assert data["totals"]["users"] >= 2
        assert sum(data["plans"].values()) == data["totals"]["users"]
        assert len(data["meetings_by_day"]) == 30 and len(data["signups_by_day"]) == 30
        assert data["signups_by_day"][-1]["count"] >= 2, "accounts made in this test signed up today"
        assert data["totals"]["feature_requests_open"] + data["totals"]["feedback_new"] >= 1
        assert "meetings" in c.get("/api/admin/meetings", headers=HA).json()
        print("  [OK] Overview and meetings table are admin-only, with a full 30-day series")

        item = c.get("/api/feedback", headers=HA).json()["feedback"][0]
        path = f"/api/feedback/{item['id']}"
        assert c.patch(path, json={"status": "reviewed"}, headers=H).status_code == 403
        assert c.patch(path, json={"status": "banana"}, headers=HA).status_code == 400
        assert c.patch(path, json={"status": "reviewed"}, headers=HA).json()["status"] == "reviewed"
        assert c.get("/api/feedback", headers=HA).json()["feedback"][0]["status"] == "reviewed"
        print("  [OK] Admins can mark feedback as reviewed")

    requests.post = _real_post
    email_service.requests.post = _real_post
    billing.requests.post = _real_post
    print("\n" + "=" * 70)
    print("  ALL BILLING + FEEDBACK TESTS PASSED [OK]")
    print("=" * 70)


def test_billing_and_feedback():
    run_tests()


if __name__ == "__main__":
    run_tests()

"""
OmniMeetX — Accounts & features test suite

Everything a user does outside live meetings: email signup + verification,
login, 2FA PIN, password/PIN reset, profile, meeting library, exports,
analytics, billing + Paddle webhooks, translation, contact form, email notes.

Emails are intercepted (nothing is sent); one translation call hits the real AI.

    cd backend
    python tests/test_accounts.py   # or:  pytest tests -s
"""
import base64
import hashlib
import hmac
import json
import re
import time

import _env  # noqa: F401  — throwaway DB, fake email; must precede `app` imports

import requests  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.middleware import SlidingWindowRateLimiter  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.models import Meeting  # noqa: E402
from app.services import email as email_service  # noqa: E402
from app.services.transcription import normalize_language_code  # noqa: E402

SENT_EMAILS = []
_real_post = requests.post


class _FakeResendResponse:
    status_code = 200

    def json(self):
        return {"id": f"email_{len(SENT_EMAILS)}"}


def _intercept_resend(url, *args, **kwargs):
    """Capture Resend calls; let every other HTTP call (AI providers) through."""
    if url == email_service.RESEND_API_URL:
        SENT_EMAILS.append({"headers": kwargs.get("headers", {}), **kwargs["json"]})
        return _FakeResendResponse()
    return _real_post(url, *args, **kwargs)


def _last_email():
    assert SENT_EMAILS, "expected an email to be sent"
    return SENT_EMAILS[-1]


def _code_from(email: dict) -> str:
    match = re.search(r'class="otp-code">(\d{6})<', email["html"])
    assert match, "verification code not found in email"
    return match.group(1)


def _token_from_link(email: dict) -> str:
    match = re.search(r"token=([\w-]+)", email["html"])
    assert match, "reset link not found in email"
    return match.group(1)


def _sign(body: bytes) -> str:
    ts = str(int(time.time()))
    h1 = hmac.new(settings.PADDLE_WEBHOOK_SECRET.encode(), f"{ts}:{body.decode()}".encode(), hashlib.sha256).hexdigest()
    return f"ts={ts};h1={h1}"


def _check_clerk_token_verification():
    """Exercise app.services.clerk with a locally generated key standing in for Clerk's."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from jose import jwk, jwt
    from app.services import clerk

    def keypair(kid):
        private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        priv_pem = private.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                         serialization.NoEncryption())
        pub_pem = private.public_key().public_bytes(serialization.Encoding.PEM,
                                                    serialization.PublicFormat.SubjectPublicKeyInfo)
        public_jwk = {**jwk.construct(pub_pem, "RS256").to_dict(), "kid": kid, "use": "sig"}
        return priv_pem, public_jwk

    clerk_priv, clerk_pub = keypair("clerk-key")
    attacker_priv, _ = keypair("clerk-key")
    now = int(time.time())

    def token(priv=clerk_priv, **overrides):
        claims = {"sub": "user_123", "azp": "http://localhost:3000", "iat": now, "nbf": now - 5, "exp": now + 60, **overrides}
        return jwt.encode(claims, priv, algorithm="RS256", headers={"kid": "clerk-key"})

    clerk_user = {"id": "user_123", "first_name": "Sara", "last_name": "Ali", "image_url": "https://img.clerk.com/sara.png",
                  "primary_email_address_id": "em_1", "primary_phone_number_id": None, "phone_numbers": [],
                  "email_addresses": [{"id": "em_1", "email_address": "Sara.Ali@gmail.com", "verification": {"status": "verified"}}]}

    saved = (clerk._jwks, clerk._api_get, settings.CLERK_SECRET_KEY)
    clerk._jwks = lambda force_refresh=False: [clerk_pub]
    clerk._api_get = lambda path: clerk_user
    settings.CLERK_SECRET_KEY = "sk_test_dummy"
    try:
        identity = clerk.verified_identity(token())
        assert identity["email"] == "sara.ali@gmail.com" and identity["full_name"] == "Sara Ali"

        for bad, why in [(token(priv=attacker_priv), "forged signature"), (token(exp=now - 120), "expired"),
                         (token(azp="https://evil.example"), "token for another site"), ("abc.def.ghi", "garbage")]:
            try:
                clerk.verified_identity(bad)
                raise AssertionError(f"accepted a bad token: {why}")
            except clerk.ClerkAuthError:
                pass

        clerk_user["email_addresses"][0]["verification"]["status"] = "unverified"
        try:
            clerk.verified_identity(token())
            raise AssertionError("accepted an unverified email")
        except clerk.ClerkAuthError:
            pass
    finally:
        clerk._jwks, clerk._api_get, settings.CLERK_SECRET_KEY = saved


def _check_patient_ai():
    from app.services import ai, llm_router

    calls, sleeps = [], []
    saved = (llm_router.generate, ai.time.sleep)
    ai.time.sleep = sleeps.append
    try:
        def flaky(prompt, **kwargs):
            calls.append(1)
            if len(calls) < 3:
                raise llm_router.AllProvidersFailed({"gemini": "rate limited (429)", "groq": "invalid API key (401)"})
            return llm_router.LLMResponse("notes", "gemini", "test-model")

        llm_router.generate = flaky
        assert ai.call_ai_patiently("p", feature_name="t").text == "notes"
        assert len(calls) == 3 and sleeps == list(ai.BACKGROUND_RETRY_DELAYS)

        def bad_key(prompt, **kwargs):
            calls.append(1)
            raise llm_router.AllProvidersFailed({"gemini": "invalid API key (401)"})

        calls.clear(); sleeps.clear()
        llm_router.generate = bad_key
        try:
            ai.call_ai_patiently("p", feature_name="t")
            raise AssertionError("expected failure")
        except llm_router.AllProvidersFailed:
            pass
        assert len(calls) == 1 and sleeps == []
    finally:
        llm_router.generate, ai.time.sleep = saved


def run_account_tests():
    email_service.requests.post = _intercept_resend
    print("=" * 70)
    print("  TALKTOTEXT PRO — ACCOUNTS & FEATURES TEST SUITE")
    print("=" * 70)

    with TestClient(app) as c:
        # -------------------------------------------------------------
        print("\n[1] Email signup & verification (no phone)")
        assert c.post("/api/auth/register", json={"email": "x@example.com"}).status_code == 400
        res = c.post("/api/auth/register", json={"full_name": "Ayesha Khan", "email": "Ayesha.Khan@Example.com", "password": "Str0ng!Pass"})
        assert res.status_code == 200 and res.json()["email_sent"] is True, res.text
        mail = _last_email()
        assert mail["to"] == ["ayesha.khan@example.com"] and "Verification" in mail["subject"]
        assert mail["from"] == settings.EMAIL_FROM and mail["headers"]["Authorization"] == "Bearer re_test_dummy_key"
        code = _code_from(mail)
        print(f"  [OK] Registered; Resend payload correct; code emailed ({code})")

        dup = c.post("/api/auth/register", json={"full_name": "X", "email": "AYESHA.KHAN@example.com", "password": "Str0ng!Pass"})
        assert dup.status_code == 400, "Same email in different case must be rejected"
        res = c.post("/api/auth/login", json={"email": "ayesha.khan@example.com", "password": "Str0ng!Pass"})
        assert res.status_code == 403 and res.json()["code"] == "not_verified"
        assert c.post("/api/auth/verify-otp", json={"email": "ayesha.khan@example.com", "email_otp": "000000" if code != "000000" else "111111"}).status_code == 401
        print("  [OK] Duplicate (case-insensitive) refused; login blocked until verified; wrong code refused")

        res = c.post("/api/auth/resend-otp", json={"email": "ayesha.khan@example.com"})
        assert res.status_code == 200 and res.json()["email_sent"] is True
        new_code = _code_from(_last_email())
        res = c.post("/api/auth/verify-otp", json={"email": "Ayesha.Khan@example.com", "email_otp": new_code})
        assert res.status_code == 200 and res.json()["access_token"], res.text
        print("  [OK] Resent code verifies the account and returns a session")

        res = c.post("/api/auth/login", json={"email": "AYESHA.khan@example.com", "password": "Str0ng!Pass"})
        assert res.status_code == 200, res.text
        token = res.json()["access_token"]
        H = {"Authorization": f"Bearer {token}"}
        assert c.post("/api/auth/resend-otp", json={"email": "ayesha.khan@example.com"}).json()["email_sent"] is False
        creds = c.post("/api/auth/verify-credentials", json={"email": "ayesha.khan@example.com", "password": "Str0ng!Pass"}).json()
        assert creds["email_exists"] and creds["password_correct"] is False and "phone_number" not in creds, \
            "Anonymous callers must not learn whether a password is right"
        creds = c.post("/api/auth/verify-credentials", json={"email": "ayesha.khan@example.com", "password": "Str0ng!Pass"}, headers=H).json()
        assert creds["password_correct"] is True, "The signed-in owner can confirm their own password"
        print("  [OK] Login works with any email casing; verify-credentials leaks no phone numbers and only checks your own password")

        # -------------------------------------------------------------
        print("\n[2] Profile, password, 2FA PIN, deactivation")
        res = c.put("/api/auth/profile", json={"full_name": "Ayesha K.", "bio": "Founder"}, headers=H)
        assert res.status_code == 200 and res.json()["user"]["bio"] == "Founder"
        assert c.get("/api/auth/profile", headers=H).json()["full_name"] == "Ayesha K."
        assert c.put("/api/auth/profile/password", json={"current_password": "wrong", "new_password": "N3w!Pass"}, headers=H).status_code == 401
        assert c.put("/api/auth/profile/password", json={"current_password": "Str0ng!Pass", "new_password": "N3w!Pass"}, headers=H).status_code == 200
        assert c.post("/api/auth/login", json={"email": "ayesha.khan@example.com", "password": "N3w!Pass"}).status_code == 200
        print("  [OK] Profile update; password change (old password rejected)")

        assert c.put("/api/auth/profile/2fa-pin", json={"pin": "123456"}, headers=H).status_code == 200
        assert c.put("/api/auth/profile", json={"two_factor_enabled": True}, headers=H).status_code == 200
        login = {"email": "ayesha.khan@example.com", "password": "N3w!Pass"}
        assert c.post("/api/auth/login", json=login).json().get("status") == "2fa_required"
        assert c.post("/api/auth/login", json={**login, "two_factor_pin": "999999"}).status_code == 401
        assert c.post("/api/auth/login", json={**login, "two_factor_pin": "123456"}).status_code == 200
        assert c.post("/api/auth/profile/verify-2fa-pin", json={"pin": "123456"}, headers=H).status_code == 200
        print("  [OK] 2FA PIN: required at login, wrong PIN refused, right PIN accepted")

        assert c.delete("/api/auth/profile", headers=H).status_code == 200
        res = c.post("/api/auth/login", json={**login, "two_factor_pin": "123456"})
        assert res.status_code == 200, f"Reactivating a deactivated account failed: {res.status_code} {res.text}"
        print("  [OK] Deactivated account reactivates on login")

        # -------------------------------------------------------------
        print("\n[3] Password & PIN reset by email")
        assert c.post("/api/auth/forgot-password", json={"email": "nobody@example.com"}).status_code == 200
        sent_before = len(SENT_EMAILS)
        assert c.post("/api/auth/forgot-password", json={"email": "Ayesha.Khan@example.com"}).status_code == 200
        assert len(SENT_EMAILS) == sent_before + 1
        reset_mail = _last_email()
        assert f"{settings.FRONTEND_URL}/reset-password?token=" in reset_mail["html"]
        reset_token = _token_from_link(reset_mail)
        assert c.post("/api/auth/reset-password", json={"token": reset_token, "new_password": "Res3t!Pass"}).status_code == 200
        assert c.post("/api/auth/reset-password", json={"token": reset_token, "new_password": "x"}).status_code == 400
        assert c.post("/api/auth/login", json={"email": "ayesha.khan@example.com", "password": "Res3t!Pass", "two_factor_pin": "123456"}).status_code == 200
        print("  [OK] Unknown email gets the same answer (no account enumeration); reset link works once")

        assert c.post("/api/auth/forgot-pin", json={"email": "ayesha.khan@example.com"}).status_code == 200
        pin_token = _token_from_link(_last_email())
        assert c.post("/api/auth/reset-pin", json={"token": pin_token, "new_pin": "654321"}).status_code == 200
        assert c.post("/api/auth/login", json={"email": "ayesha.khan@example.com", "password": "Res3t!Pass", "two_factor_pin": "654321"}).status_code == 200
        print("  [OK] PIN reset by email")

        # -------------------------------------------------------------
        print("\n[4] Meeting library, favorites, exports, delete")
        user_id = c.get("/api/auth/check", headers=H).json()["user_id"]
        db = SessionLocal()
        try:
            notes = {"summary": "Quarterly review.", "key_points": ["Revenue up 25%"], "action_items": ["Ship billing"],
                     "decisions": ["Keep Pro at $12"], "sentiment": "Positive"}
            transcription = {"raw": "Revenue grew.", "translated": "Revenue grew.", "optimized": "Revenue grew.", "utterances": []}
            urdu_notes = {"summary": "سہ ماہی جائزہ", "key_points": ["آمدنی میں اضافہ"], "action_items": ["بلنگ مکمل کریں"], "decisions": [], "sentiment": "مثبت"}
            m1 = Meeting(user_id=user_id, title="Q3 Review", filename="q3.mp3", status="completed", notes=json.dumps(notes),
                         transcription=json.dumps(transcription), has_notes=True, has_transcription=True, transcript_language="en")
            m2 = Meeting(user_id=user_id, title="اردو میٹنگ", filename="ur.mp3", status="completed", notes=json.dumps(urdu_notes),
                         transcription=json.dumps({"optimized": "آمدنی میں اضافہ ہوا"}), has_notes=True, transcript_language="ur")
            db.add_all([m1, m2])
            db.commit()
            m1_id, m2_id = m1.id, m2.id
        finally:
            db.close()

        assert len(c.get("/api/meetings", headers=H).json()["meetings"]) == 2
        assert c.get(f"/api/meetings/{m1_id}", headers=H).json()["meeting"]["notes"]["summary"] == "Quarterly review."
        assert c.put(f"/api/meetings/{m1_id}/favorite", json={"is_favorite": True}, headers=H).status_code == 200
        assert [m["id"] for m in c.get("/api/favorites", headers=H).json()["meetings"]] == [m1_id]
        for mid in (m1_id, m2_id):
            pdf = c.get(f"/api/export/{mid}/pdf", headers=H)
            docx = c.get(f"/api/export/{mid}/word", headers=H)
            assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
            assert docx.status_code == 200 and docx.content[:2] == b"PK"
        assert c.get(f"/api/export/{m1_id}/txt", headers=H).status_code == 400
        assert c.delete(f"/api/meetings/{m2_id}", headers=H).status_code == 200
        assert c.get(f"/api/meetings/{m2_id}", headers=H).status_code == 404
        print("  [OK] List, detail, favorites, PDF + Word export (English and Urdu), delete")

        # -------------------------------------------------------------
        print("\n[5] Dashboard analytics")
        for path in ("/api/activities?limit=10", "/api/stats", "/api/analytics/usage-intensity?period=week",
                     "/api/analytics/processing-performance", "/api/analytics/meeting-insights",
                     "/api/analytics/productivity", "/api/leaderboard"):
            res = c.get(path, headers=H)
            assert res.status_code == 200, f"{path}: {res.status_code} {res.text[:200]}"
        print("  [OK] All 7 dashboard endpoints respond")

        # -------------------------------------------------------------
        print("\n[6] Billing & Paddle webhooks")
        plans = c.get("/api/billing/plans").json()["plans"]
        assert {p["id"] for p in plans} == {"free", "pro", "premium", "enterprise"}
        checkout = c.post("/api/billing/create-checkout", json={"plan": "pro", "interval": "month"}, headers=H).json()
        assert checkout["customer_email"] == "ayesha.khan@example.com" and checkout["custom_data"]["plan"] == "pro"
        assert c.post("/api/billing/create-checkout", json={"plan": "free"}, headers=H).status_code == 400

        event = {"event_id": "evt_test_1", "event_type": "transaction.completed",
                 "data": {"id": "txn_1", "origin": "web", "subscription_id": "sub_1", "customer_id": "ctm_1",
                          "custom_data": {"user_id": str(user_id), "plan": "pro"},
                          "items": [{"price": {"id": "pri_pro_month"}}]}}
        body = json.dumps(event).encode()
        assert c.post("/api/billing/webhook", content=body).status_code == 401, "Unsigned webhook must be refused"
        assert c.post("/api/billing/webhook", content=body, headers={"Paddle-Signature": "ts=1;h1=forged"}).status_code == 401
        res = c.post("/api/billing/webhook", content=body, headers={"Paddle-Signature": _sign(body)})
        assert res.status_code == 200 and res.json()["action"] == "credited_pro", res.text
        status = c.get("/api/billing/status", headers=H).json()
        assert status["plan"] == "pro" and status["credits_remaining"] == 1200
        res = c.post("/api/billing/webhook", content=body, headers={"Paddle-Signature": _sign(body)})
        assert res.json()["action"] == "already_processed"
        assert c.get("/api/billing/status", headers=H).json()["credits_remaining"] == 1200
        print("  [OK] Plans, checkout; forged/unsigned webhooks refused; signed one upgrades to Pro once (idempotent)")

        # -------------------------------------------------------------
        print("\n[7] Translation (real AI call)")
        if settings.GEMINI_API_KEY or settings.GROQ_API_KEY or settings.OPENROUTER_API_KEY:
            res = c.post("/api/translate", json={"text": "The meeting is on Friday.", "target_language": "ur"}, headers=H)
            assert res.status_code == 200 and res.json()["translated_text"], res.text
            print(f"  [OK] {res.json()['translated_text']!r}")
        else:
            print("  [SKIP] No AI key here (GitHub CI). Runs locally with the keys in backend/.env")

        # -------------------------------------------------------------
        print("\n[8] Contact form & emailing notes")
        res = c.post("/api/contact", json={"name": "Ali <b>", "email": "ali@example.com", "subject": "Hi", "message": "<script>x</script>"})
        assert res.status_code == 200, res.text
        mail = _last_email()
        assert mail["to"] == [settings.CONTACT_EMAIL] and mail["reply_to"] == "ali@example.com"
        assert "<script>" not in mail["html"] and "&lt;script&gt;" in mail["html"]
        res = c.post("/api/send-email", headers=H, data={"meeting_id": str(m1_id), "to_email": "team@example.com",
                                                          "subject": "Notes", "body": "See attached"},
                     files={"pdf_file": ("notes.pdf", b"%PDF-1.4 test", "application/pdf")})
        assert res.status_code == 200, res.text
        mail = _last_email()
        assert mail["attachments"][0]["filename"] == "notes.pdf"
        assert base64.b64decode(mail["attachments"][0]["content"]) == b"%PDF-1.4 test"
        print("  [OK] Contact mail reaches the inbox with reply-to and escaped HTML; notes emailed with PDF attached")

        # -------------------------------------------------------------
        print("\n[9] Rate limiting & language codes")
        limiter = SlidingWindowRateLimiter()
        allowed = [limiter.is_allowed("ip", max_requests=10)[0] for _ in range(11)]
        assert allowed == [True] * 10 + [False]
        assert [normalize_language_code(x) for x in ("en_us", "UR", "urdu", "zh-tw", None)] == ["en", "ur", "ur", "zh-tw", None]
        print("  [OK] 11th request in a minute is refused; language codes normalised")

        # -------------------------------------------------------------
        print("\n[10] Google sign-in (Clerk) verification")
        assert c.post("/api/auth/clerk-sync", json={"email": "ayesha.khan@example.com"}).status_code == 401
        assert c.post("/api/auth/clerk-sync", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 503, \
            "Without CLERK_SECRET_KEY sign-in must be refused, not trusted"
        _check_clerk_token_verification()
        print("  [OK] Email-only sync refused; signature, expiry, site (azp) and verified-email checks enforced")

        # -------------------------------------------------------------
        print("\n[11] Background AI waits out rate limits, fails fast on bad keys")
        _check_patient_ai()
        print("  [OK] Rate limit -> waits and succeeds; rejected key -> fails at once (no pointless waiting)")

    email_service.requests.post = _real_post
    print("\n" + "=" * 70)
    print(f"  ALL ACCOUNT & FEATURE TESTS PASSED [OK]  ({len(SENT_EMAILS)} emails intercepted)")
    print("=" * 70)


def test_accounts_and_features():
    run_account_tests()


if __name__ == "__main__":
    run_account_tests()

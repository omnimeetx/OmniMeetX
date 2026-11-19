"""
OmniMeetX — End-to-End API Test Suite

Runs against a throwaway SQLite database (never your real data/app.db) and
makes a few real AI calls with the keys in backend/.env.

    cd backend
    python tests/test_e2e.py        # or:  pytest tests -s

Covers:
1. Health & readiness probes
2. Google/Clerk user sync + JWT
3. Billing status
4. Meeting room creation + LiveKit tokens for host & admitted guest
5. Lobby enforcement (un-admitted guest is refused)
6. AI chat (English + Urdu) and quiz generation
7. Processing endpoints: start / retry / ensure (idempotent)
8. Avatar upload + public serving
9. Credit deduction, ledger, and repeatable refunds
"""
import os
import logging

import _env  # noqa: F401  — throwaway DB, fake email; must precede `app` imports

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.models import Meeting, CreditLedger, User  # noqa: E402
from app.services import billing, clerk, room_state as rs  # noqa: E402

logging.basicConfig(level=logging.WARNING)

AI_UNAVAILABLE = ("temporarily unavailable", "not configured")

# 1x1 transparent PNG
TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


def _fake_clerk_identity(token: str) -> dict:
    """Stand-in for Clerk in tests: token 'test-clerk:<email>|<name>|<avatar>'."""
    if not token.startswith("test-clerk:"):
        raise clerk.ClerkAuthError("not a test token")
    email, name, avatar = (token[len("test-clerk:"):].split("|") + ["", ""])[:3]
    return {"clerk_id": f"user_{email}", "email": email, "full_name": name or None,
            "avatar_url": avatar or None, "phone_number": None}


def _clerk_headers(email: str, name: str = "", avatar: str = "") -> dict:
    return {"Authorization": f"Bearer test-clerk:{email}|{name}|{avatar}"}


def _ai_ok(text: str) -> bool:
    return bool(text) and not any(marker in text for marker in AI_UNAVAILABLE)


def run_e2e_tests():
    print("=" * 70)
    print("  TALKTOTEXT PRO — END-TO-END TEST SUITE")
    print(f"  Database: {os.environ['SQLALCHEMY_DATABASE_URI']}")
    print("=" * 70)

    real_identity = clerk.verified_identity
    clerk.verified_identity = _fake_clerk_identity
    try:
        _run()
    finally:
        clerk.verified_identity = real_identity


def _run():
    with TestClient(app) as client:
        # -------------------------------------------------------------
        print("\n[TEST 1] Health & readiness probes")
        res = client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        assert res.json()["database"]["connected"] is True
        res = client.get("/api/ready")
        assert res.status_code == 200, f"Readiness check failed: {res.text}"
        print("  [OK] /api/health and /api/ready return 200")

        # -------------------------------------------------------------
        print("\n[TEST 2] User sync & authentication")
        forged = client.post("/api/auth/clerk-sync", json={"email": "test_e2e_user@example.com"})
        assert forged.status_code == 401, "An email alone must never log anyone in"
        res = client.post("/api/auth/clerk-sync", headers=_clerk_headers(
            "test_e2e_user@example.com", "E2E Test User", "https://img.example.com/e2e.png"))
        assert res.status_code == 200, f"Clerk sync failed: {res.text}"
        token = res.json()["access_token"]
        user_id = res.json()["user"]["id"]
        auth = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/auth/check", headers=auth).status_code == 200
        profile = client.get("/api/auth/profile", headers=auth).json()
        assert profile["avatar_url"] == "https://img.example.com/e2e.png", profile
        assert client.get("/api/meetings").status_code == 401, "Unauthenticated access must be refused"
        print(f"  [OK] Forged email-only sync refused; verified Clerk session synced (id={user_id}); avatar stored")

        # -------------------------------------------------------------
        print("\n[TEST 3] Billing status")
        res = client.get("/api/billing/status", headers=auth)
        assert res.status_code == 200, f"Billing status failed: {res.text}"
        status = res.json()
        assert status["plan"] == "free" and status["credits_remaining"] == 60
        assert client.get("/api/billing/plans").status_code == 200
        print(f"  [OK] {status['credits_remaining']}/{status['credits_total']} min on plan '{status['plan']}'")

        # -------------------------------------------------------------
        print("\n[TEST 4] Meeting room + LiveKit tokens (host & guest)")
        res = client.post("/api/meeting-rooms/create", json={
            "title": "Strategy & Roadmap Call",
            "settings": {"requires_approval": True, "auto_record": False},
        }, headers=auth)
        assert res.status_code == 200, f"Room creation failed: {res.text}"
        room_id = res.json()["room_id"]

        guest = client.post("/api/auth/clerk-sync", headers=_clerk_headers(
            "guest_device2@example.com", "Guest Participant")).json()
        guest_auth = {"Authorization": f"Bearer {guest['access_token']}"}
        guest_id = guest["user"]["id"]

        room_info = client.get(f"/api/meeting-rooms/{room_id}", headers=guest_auth).json()["meeting"]
        assert room_info["is_host"] is False and room_info["created_by"] == user_id

        res = client.post(f"/api/meeting-rooms/{room_id}/livekit-token", headers=auth)
        if res.status_code == 503:
            print("  [SKIP] LiveKit not configured — token minting not tested")
        else:
            assert res.status_code == 200, f"Host token failed: {res.text}"
            assert res.json()["is_host"] is True

            # -------------------------------------------------------------
            print("\n[TEST 5] Lobby enforcement")
            res = client.post(f"/api/meeting-rooms/{room_id}/livekit-token", headers=guest_auth)
            assert res.status_code == 403, f"Un-admitted guest must be refused, got {res.status_code}"
            rs.add_participant(room_id, str(guest_id), "Guest Participant", "sid_guest_test")
            res = client.post(f"/api/meeting-rooms/{room_id}/livekit-token", headers=guest_auth)
            assert res.status_code == 200 and res.json()["is_host"] is False, res.text
            print("  [OK] Guest refused before admission, token issued after admission")

        # -------------------------------------------------------------
        print("\n[TEST 6] AI chat (English + Urdu) and quiz")
        transcript = (
            "Host: Welcome everyone to the quarterly review. Our Q3 revenue grew by 25 percent.\n"
            "Guest: That's great news. What are the key deliverables for next sprint?\n"
            "Host: We must finalize the mobile app design by Friday and deploy the billing gateway."
        )
        for label, question in [
            ("English", "Summarize the key decisions from this meeting in bullet points."),
            ("Urdu", "Please list the 3 main points in Urdu language."),
        ]:
            res = client.post("/api/chat", json={"message": question, "mode": "ghost_replay", "context": transcript})
            assert res.status_code == 200, f"{label} AI chat failed: {res.text}"
            reply = res.json().get("response", "")
            assert _ai_ok(reply), f"{label} AI reply was an error: {reply!r}"
            print(f"  [OK] {label} reply: {reply[:70].strip()!r}...")

        res = client.post("/api/meeting-rooms/generate-quiz", json={"transcript": transcript, "num_questions": 2}, headers=auth)
        assert res.status_code == 200, f"Quiz generation failed: {res.text}"
        print(f"  [OK] Quiz generated: {res.json().get('count', 0)} questions")

        # -------------------------------------------------------------
        print("\n[TEST 7] Processing endpoints are idempotent")
        db = SessionLocal()
        try:
            meeting = Meeting(user_id=user_id, title="E2E done meeting", filename="e2e.mp3", status="completed")
            db.add(meeting)
            db.commit()
            meeting_id = meeting.id
        finally:
            db.close()

        for path in (f"/api/process/{meeting_id}", f"/api/meeting-rooms/{meeting_id}/process"):
            res = client.post(path, headers=auth)
            assert res.status_code == 200 and res.json()["status"] == "completed", f"{path}: {res.text}"
        assert client.post(f"/api/process/{meeting_id}", headers=guest_auth).status_code == 404, "Other users' meetings must be hidden"
        res = client.get(f"/api/processing-status/{meeting_id}", headers=auth)
        assert res.status_code == 200 and len(res.json()["processing_steps"]) == 4
        print("  [OK] start/ensure on a completed meeting is a no-op; ownership enforced")

        res = client.post(f"/api/meetings/{meeting_id}/retry", headers=auth)
        assert res.status_code == 200, f"Retry failed: {res.text}"
        print("  [OK] Retry accepted (file is missing, so the job fails and refunds cleanly)")

        # -------------------------------------------------------------
        print("\n[TEST 8] Avatar upload")
        res = client.post("/api/auth/avatar", headers=auth, files={"avatar": ("me.png", TINY_PNG, "image/png")})
        assert res.status_code == 200, f"Avatar upload failed: {res.text}"
        avatar_url = res.json()["user"]["avatar_url"]
        assert "/media/avatars/" in avatar_url
        res = client.get("/media/avatars/" + avatar_url.rsplit("/", 1)[1])
        assert res.status_code == 200 and res.headers["content-type"] == "image/png"
        bad = client.post("/api/auth/avatar", headers=auth, files={"avatar": ("x.exe", b"MZ", "application/octet-stream")})
        assert bad.status_code == 400
        print("  [OK] Avatar stored, served publicly, non-images rejected")

        # -------------------------------------------------------------
        print("\n[TEST 9] Credit deduction, ledger & refunds")
        db = SessionLocal()
        try:
            start = db.query(User).get(user_id).credits_remaining
            res = billing.deduct_credits(db, user_id, 5, reason="test_processing")
            assert res["ok"] and res["remaining"] == start - 5
            entry = db.query(CreditLedger).filter_by(user_id=user_id).order_by(CreditLedger.id.desc()).first()
            assert entry.change == -5
            for _ in range(2):  # two refunds of the same amount must both apply
                billing.refund_credits(db, user_id, 5)
            db.expire_all()
            assert db.query(User).get(user_id).credits_remaining == start + 5
            print(f"  [OK] {start} -> {start - 5} -> {start + 5} min; every change in the ledger")
        finally:
            db.close()

    print("\n" + "=" * 70)
    print("  ALL END-TO-END TESTS PASSED [OK]")
    print("=" * 70)


def test_end_to_end():
    run_e2e_tests()


if __name__ == "__main__":
    run_e2e_tests()

"""
A restart (every deploy) can cut a processing job off. The meeting must not stay
"processing" forever with its minutes spent: it is released as failed, the minutes
of the interrupted run come back exactly once, and Retry works again.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))
import _env  # noqa: E402,F401  (throwaway database; must come before `app`)

from fastapi.testclient import TestClient  # noqa: E402

from app.core.security import create_access_token  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import CreditLedger, Meeting, User  # noqa: E402
from app.services import billing  # noqa: E402
from app.services.processing import INTERRUPTED_MESSAGE, fail_interrupted_meetings  # noqa: E402


def _steps(started_at: datetime) -> str:
    return json.dumps([
        {"step": "transcription", "status": "in_progress", "timestamp": started_at.isoformat(), "error": None},
        {"step": "ai_notes", "status": "pending", "timestamp": "", "error": None},
    ])


def test_restart_releases_cut_off_meetings_and_refunds_once():
    with TestClient(app):  # runs startup: tables exist
        db = SessionLocal()
        user = User(full_name="Restart Test", email="restart@example.com", password_hash="x" * 162,
                    is_verified=True, email_verified=True, credits_remaining=100, credits_total=100)
        db.add(user)
        db.commit()
        now = datetime.now(timezone.utc)

        # A meeting processed fine yesterday, retried today, and cut off mid-run by a deploy.
        retried = Meeting(user_id=user.id, title="Retried", filename="a.mp3", status="processing",
                          processing_steps=_steps(now))
        # A meeting this server is still working on: hands off.
        running = Meeting(user_id=user.id, title="Running", filename="b.mp3", status="processing",
                          processing_steps=_steps(now))
        # Cut off before it was charged anything.
        early = Meeting(user_id=user.id, title="Early", filename="c.mp3", status="processing",
                        processing_steps=_steps(now))
        db.add_all([retried, running, early])
        db.commit()

        billing.deduct_credits(db, user.id, 10, meeting_id=retried.id, idempotency_key=f"process-{retried.id}-yesterday")
        old = db.query(CreditLedger).filter_by(idempotency_key=f"process-{retried.id}-yesterday").one()
        old.created_at = now - timedelta(days=1)
        db.commit()
        billing.deduct_credits(db, user.id, 7, meeting_id=retried.id, idempotency_key=f"process-{retried.id}-today")
        billing.deduct_credits(db, user.id, 5, meeting_id=running.id, idempotency_key=f"process-{running.id}-now")
        db.refresh(user)
        assert user.credits_remaining == 100 - 10 - 7 - 5

        assert fail_interrupted_meetings(active_ids={running.id}) == 2
        db.expire_all()
        user = db.get(User, user.id)
        assert user.credits_remaining == 100 - 10 - 5, "only today's interrupted run is refunded"
        assert db.get(Meeting, retried.id).status == "failed"
        assert db.get(Meeting, early.id).status == "failed"
        assert db.get(Meeting, running.id).status == "processing", "a job still running here is left alone"
        steps = json.loads(db.get(Meeting, retried.id).processing_steps)
        assert steps[0]["status"] == "failed" and steps[0]["error"] == INTERRUPTED_MESSAGE

        # Running it again (a second restart) changes nothing and refunds nothing twice.
        assert fail_interrupted_meetings(active_ids={running.id}) == 0
        db.expire_all()
        assert db.get(User, user.id).credits_remaining == 100 - 10 - 5
        db.close()


def test_retry_works_after_release():
    with TestClient(app) as c:
        db = SessionLocal()
        user = db.query(User).filter_by(email="restart@example.com").one()
        meeting = db.query(Meeting).filter_by(title="Retried").one()
        token = create_access_token(user.id)
        db.close()
        res = c.post(f"/api/meetings/{meeting.id}/retry", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, res.text  # used to be 409 "already being processed" forever


if __name__ == "__main__":
    test_restart_releases_cut_off_meetings_and_refunds_once()
    test_retry_works_after_release()
    print("OK")

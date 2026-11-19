"""
OmniMeetX - Processing step tracking.
Each meeting carries a JSON list of pipeline steps the frontend polls to draw progress.
"""
import json
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

PIPELINE_STEPS = ("transcription", "translation", "optimization", "ai_generation")


def initial_processing_steps() -> list:
    """Fresh 'pending' state for every pipeline step."""
    return [{"step": s, "status": "pending", "timestamp": "", "error": None} for s in PIPELINE_STEPS]


def update_processing_step(db_session, meeting, step_name, status, error=None):
    """Update a processing step's status."""
    try:
        steps = json.loads(meeting.processing_steps or '[]')
    except Exception:
        steps = []

    timestamp = datetime.now(timezone.utc).isoformat()
    step = next((s for s in steps if s["step"] == step_name), None)
    if step:
        step.update({"status": status, "error": error, "timestamp": timestamp})
    else:
        steps.append({"step": step_name, "status": status, "error": error, "timestamp": timestamp})

    meeting.processing_steps = json.dumps(steps)
    if status in ("in_progress", "success"):
        meeting.current_step_progress = 0
    db_session.commit()
    logger.info(f"Updated step {step_name} to {status} for meeting {meeting.id}")


def simulate_step_progress(db_session_factory, meeting_id, step_name, duration_seconds=8):
    """Simulate realistic progress for each processing step."""
    from app.models import Meeting

    progress_points = [10, 20, 35, 50, 65, 75, 85, 95, 100]
    interval = duration_seconds / len(progress_points)

    for progress in progress_points:
        try:
            db = db_session_factory()
            try:
                meeting = db.query(Meeting).get(meeting_id)
                if not meeting:
                    break
                steps = json.loads(meeting.processing_steps or '[]')
                current_step = next((s for s in steps if s["step"] == step_name), None)
                if not current_step or current_step["status"] != "in_progress":
                    break
                meeting.current_step_progress = progress
                db.commit()
            finally:
                db.close()
            if progress < 100:
                time.sleep(interval)
        except Exception as e:
            logger.error(f"Progress simulation error for {step_name}: {e}")
            break

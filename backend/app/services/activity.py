"""
OmniMeetX - User activity feed logging.
"""
import json
import logging

from app.models import Activity

logger = logging.getLogger(__name__)


def log_activity(db_session, user_id, activity_type, title, description, meeting_id=None, metadata=None):
    """Log user activity. Never raises — a failed log must not break the caller."""
    try:
        activity = Activity(
            user_id=user_id,
            type=activity_type,
            title=title,
            description=description,
            meeting_id=meeting_id,
            activity_metadata=json.dumps(metadata or {}),
        )
        db_session.add(activity)
        db_session.commit()
        logger.info(f"Logged activity: {activity_type} for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")
        db_session.rollback()

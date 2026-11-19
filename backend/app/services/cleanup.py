"""
OmniMeetX - Data Retention & Media Cleanup Service

Periodically purges raw source audio/video recordings older than MEDIA_RETENTION_DAYS (default 30 days)
to preserve disk space and comply with privacy best practices.
Lightweight transcripts and AI summary notes in the database are retained permanently.
"""
import os
import time
import logging
import threading
from datetime import datetime, timedelta, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)


def purge_expired_media(retention_days: int = None) -> int:
    """
    Delete audio/video source files older than retention_days.
    Returns the number of purged files.
    """
    days = retention_days if retention_days is not None else settings.MEDIA_RETENTION_DAYS
    if days <= 0:
        logger.info("Media retention purge disabled (MEDIA_RETENTION_DAYS <= 0)")
        return 0

    cutoff_timestamp = time.time() - (days * 86400)
    purged_count = 0
    purged_bytes = 0

    directories = [settings.UPLOAD_FOLDER, settings.RECORDINGS_FOLDER]

    for directory in directories:
        if not os.path.exists(directory):
            continue

        for filename in os.listdir(directory):
            # Skip hidden files or lock files
            if filename.startswith("."):
                continue

            filepath = os.path.join(directory, filename)
            try:
                if os.path.isfile(filepath):
                    stat = os.stat(filepath)
                    if stat.st_mtime < cutoff_timestamp:
                        file_size = stat.st_size
                        os.remove(filepath)
                        purged_count += 1
                        purged_bytes += file_size
                        logger.info(f"Purged expired media file ({days}d policy): {filename} ({(file_size / (1024*1024)):.2f} MB)")
            except Exception as e:
                logger.warning(f"Failed to purge {filepath}: {e}")

    purged_count += _purge_stored_recordings(days)

    if purged_count > 0:
        logger.info(f"Data Retention Cleanup completed: {purged_count} files removed ({(purged_bytes / (1024*1024)):.2f} MB freed locally)")
    return purged_count


def _purge_stored_recordings(days: int) -> int:
    """Same policy for recordings kept in Supabase Storage: transcripts and notes stay."""
    from app.db import SessionLocal
    from app.models import Meeting
    from app.services import storage

    if not storage.enabled():
        return 0
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    db = SessionLocal()
    removed = 0
    try:
        expired = (
            db.query(Meeting)
            .filter(Meeting.storage_path.isnot(None), Meeting.upload_date < cutoff)
            .limit(500)
            .all()
        )
        for i in range(0, len(expired), 100):
            batch = expired[i:i + 100]
            storage.delete_files([m.storage_path for m in batch])
            for m in batch:
                m.storage_path = None
            db.commit()
            removed += len(batch)
        if removed:
            logger.info(f"Purged {removed} stored recordings older than {days} days")
    except Exception as e:
        db.rollback()
        logger.warning(f"Stored recording purge failed: {e}")
    finally:
        db.close()
    return removed


def _cleanup_loop():
    """Background worker loop running once every 24 hours."""
    while True:
        try:
            purge_expired_media()
        except Exception as e:
            logger.error(f"Error in data retention cleanup loop: {e}")
        # Sleep 24 hours
        time.sleep(86400)


def start_cleanup_scheduler():
    """Launch the retention cleanup worker in a daemon thread."""
    thread = threading.Thread(target=_cleanup_loop, daemon=True, name="MediaCleanupWorker")
    thread.start()
    logger.info("Media retention cleanup scheduler started (runs every 24h)")

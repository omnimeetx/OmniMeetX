"""
OmniMeetX - where a meeting's recording lives.

The local file in UPLOAD_FOLDER is a working copy for processing. When Supabase
Storage is configured, the recording is also kept in the private bucket
(meeting.storage_path), played back through a signed link, and the local copy
can disappear (a redeploy wipes it) without losing anything.
"""
import logging
import os
import threading
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Meeting
from app.services import storage
from app.services.media import compact_playback_audio

logger = logging.getLogger(__name__)


def local_path(meeting: Meeting) -> str:
    return os.path.join(settings.UPLOAD_FOLDER, os.path.basename(meeting.filename))


def ensure_local(meeting: Meeting) -> str:
    """The working copy, fetched back from storage if this server doesn't have it."""
    path = local_path(meeting)
    if os.path.exists(path):
        return path
    if meeting.storage_path and storage.enabled():
        # The stored copy may be the compact playback MP3; processing reads any audio.
        stored_name = os.path.basename(meeting.storage_path)
        target = path if stored_name == os.path.basename(path) else os.path.join(settings.UPLOAD_FOLDER, stored_name)
        logger.info(f"Meeting {meeting.id}: fetching recording back from storage")
        return storage.download_file(meeting.storage_path, target)
    raise FileNotFoundError(f"Recording for meeting {meeting.id} is not on this server or in storage")


def store(db: Session, meeting: Meeting, path: str) -> Optional[str]:
    """
    Keep the recording in Supabase Storage. Best effort: if storage is down the
    meeting still processes from the local copy, and a later run stores it.
    Files over the size limit are stored as a compact MP3 instead.
    """
    if not storage.enabled() or meeting.storage_path:
        return meeting.storage_path
    try:
        source = path
        if os.path.getsize(path) > storage.MAX_STORED_BYTES:
            compact = os.path.splitext(path)[0] + ".playback.mp3"
            if not compact_playback_audio(path, compact) or os.path.getsize(compact) > storage.MAX_STORED_BYTES:
                logger.warning(f"Meeting {meeting.id}: recording too large to store, keeping the local copy only")
                return None
            source = compact
        key = storage.recording_key(meeting.user_id, source)
        storage.put_file(source, key)
        meeting.storage_path = key
        if source != path:
            meeting.media_kind = "audio"  # only the compact audio copy is kept for playback
        db.commit()
        if source != path:
            os.remove(source)
        logger.info(f"Meeting {meeting.id}: recording stored")
        return key
    except Exception as e:
        logger.warning(f"Meeting {meeting.id}: could not store recording yet: {e}")
        db.rollback()
        return None


def store_in_background(meeting_id: int, path: str) -> None:
    """
    Upload to storage alongside processing instead of before it: a big video can
    take a minute to upload, and the progress bar used to sit at 0% all that time.
    Whichever finishes last (this upload or the processing) removes the local copy.
    """
    if not storage.enabled():
        return

    def run() -> None:
        from app.db import SessionLocal  # here, not at import time, to avoid a cycle

        db = SessionLocal()
        try:
            meeting = db.query(Meeting).get(meeting_id)
            if not meeting or meeting.storage_path:
                return
            if store(db, meeting, path):
                db.refresh(meeting)  # processing may have finished meanwhile
                if meeting.status == "completed":
                    drop_local_copy(meeting)
        except Exception as e:
            logger.warning(f"Meeting {meeting_id}: background storage failed: {e}")
        finally:
            db.close()

    threading.Thread(target=run, daemon=True, name=f"store-recording-{meeting_id}").start()


def drop_local_copy(meeting: Meeting) -> None:
    """Free the server's disk once the recording is safely in storage."""
    if not (meeting.storage_path and storage.enabled()):
        return
    path = local_path(meeting)
    if os.path.exists(path):
        try:
            os.remove(path)
        except OSError as e:
            logger.warning(f"Meeting {meeting.id}: could not remove local copy: {e}")


def playback_url(meeting: Meeting) -> Optional[str]:
    """A signed link to the stored recording, valid for an hour."""
    if meeting.storage_path and storage.enabled():
        return storage.signed_url(meeting.storage_path, expires_in=3600)
    return None


def remove(meeting: Meeting) -> None:
    """Delete both copies (used when a meeting is deleted)."""
    path = local_path(meeting)
    if os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass
    if meeting.storage_path and storage.enabled():
        try:
            storage.delete_files([meeting.storage_path])
        except Exception as e:
            logger.warning(f"Meeting {meeting.id}: stored recording not deleted: {e}")

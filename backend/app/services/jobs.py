"""
OmniMeetX - Background job runner.

Meeting processing runs on an in-process thread pool today. Every route that
kicks off background work goes through this module, so moving to a real queue
(Redis + Arq/Celery workers) only means changing the functions below.
"""
import logging
import threading
import time
from concurrent.futures import Future, ThreadPoolExecutor

from app.core.config import settings

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(
    max_workers=settings.PROCESSING_WORKERS,
    thread_name_prefix="processing",
)

# Meetings this server process is working on right now. Anything else marked
# "processing" was cut off by a restart (a deploy, a crash) and will never finish.
_active_lock = threading.Lock()
_active_meetings: set[int] = set()


def _tracked(meeting_id: int, fn, *args):
    with _active_lock:
        _active_meetings.add(meeting_id)
    try:
        return fn(*args)
    finally:
        with _active_lock:
            _active_meetings.discard(meeting_id)


def active_meeting_ids() -> set[int]:
    with _active_lock:
        return set(_active_meetings)


def _log_failure(future: Future) -> None:
    exc = future.exception()
    if exc:
        logger.error(f"Background job crashed: {exc!r}", exc_info=exc)


def submit(fn, *args, **kwargs) -> Future:
    """Run `fn(*args, **kwargs)` in the background."""
    future = _executor.submit(fn, *args, **kwargs)
    future.add_done_callback(_log_failure)
    return future


def enqueue_meeting_processing(meeting_id: int) -> Future:
    """Transcribe + summarise a meeting whose status is 'uploaded'."""
    from app.services.processing import start_processing
    return submit(_tracked, meeting_id, start_processing, meeting_id)


def enqueue_video_processing(meeting_id: int, video_path: str) -> Future:
    """Extract audio from a recorded video, then run the normal pipeline."""
    from app.services.processing import process_meeting_video
    return submit(_tracked, meeting_id, process_meeting_video, meeting_id, video_path)


def schedule_interrupted_job_recovery(delay_seconds: int) -> None:
    """
    After a restart, release meetings the previous server process left half done.

    Waits first: during a deploy the old process keeps finishing its jobs for a
    few minutes (Render's shutdown delay), and those must not be touched.
    """
    def run():
        time.sleep(delay_seconds)
        from app.services.processing import fail_interrupted_meetings
        try:
            fail_interrupted_meetings(active_meeting_ids())
        except Exception:
            logger.exception("Interrupted-job recovery failed")

    threading.Thread(target=run, daemon=True, name="InterruptedJobRecovery").start()

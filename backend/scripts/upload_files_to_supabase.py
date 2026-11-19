"""
OmniMeetX - move existing recordings and profile pictures into Supabase Storage.

Run after scripts/migrate_to_supabase.py, with SUPABASE_URL and
SUPABASE_SECRET_KEY in .env:

    cd backend
    python scripts/upload_files_to_supabase.py            # dry run: lists what would move
    python scripts/upload_files_to_supabase.py --upload   # uploads and updates the Supabase database

Updates the database at SUPABASE_DB_URL (or --db). Local files are only read,
never deleted. Recordings older than MEDIA_RETENTION_DAYS are skipped because
the retention cleanup would remove them anyway. Safe to run again: anything
already stored is skipped.
"""
import argparse
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.url import safe_db_url  # noqa: E402
from app.models import Meeting, User  # noqa: E402
from app.services import recordings, storage  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", default=settings.SUPABASE_DB_URL, help="database to update (default: SUPABASE_DB_URL)")
    parser.add_argument("--upload", action="store_true", help="actually upload (default is a dry run)")
    args = parser.parse_args()

    if not storage.enabled():
        print("Set SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env first.")
        return 2
    if not args.db:
        print("No database. Set SUPABASE_DB_URL in backend/.env or pass --db.")
        return 2

    url = safe_db_url(args.db)
    db = sessionmaker(bind=create_engine(url, pool_pre_ping=True))()
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=settings.MEDIA_RETENTION_DAYS)

    try:
        meetings = db.query(Meeting).filter(Meeting.storage_path.is_(None)).order_by(Meeting.id).all()
        to_move, old, missing = [], 0, 0
        for m in meetings:
            if m.upload_date and m.upload_date < cutoff:
                old += 1
            elif os.path.exists(recordings.local_path(m)):
                to_move.append(m)
            else:
                missing += 1
        avatars = [u for u in db.query(User).filter(User.avatar_url.like("%/media/avatars/%")).all()
                   if os.path.isfile(os.path.join(settings.AVATAR_FOLDER, os.path.basename(u.avatar_url)))]

        print(f"recordings to store: {len(to_move)} | older than {settings.MEDIA_RETENTION_DAYS} days, skipped: {old} | file not on this PC: {missing}")
        print(f"profile pictures to store: {len(avatars)}")
        if not args.upload:
            print("Dry run. Run again with --upload to upload.")
            return 0

        stored = failed = 0
        for m in to_move:
            key = recordings.store(db, m, recordings.local_path(m))
            if key:
                stored += 1
            else:
                failed += 1
            print(f"  meeting {m.id}: {'stored' if key else 'FAILED'}")

        for u in avatars:
            name = os.path.basename(u.avatar_url)
            key = f"{u.id}/{name}"
            try:
                storage.put_file(os.path.join(settings.AVATAR_FOLDER, name), key, bucket=storage.AVATAR_BUCKET, public=True)
                u.avatar_url = storage.public_url(key)
                db.commit()
                print(f"  avatar of user {u.id}: stored")
            except Exception as e:
                db.rollback()
                failed += 1
                print(f"  avatar of user {u.id}: FAILED ({e})")

        print(f"done: {stored} recordings and {len(avatars)} pictures attempted, {failed} failed")
        return 1 if failed else 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())

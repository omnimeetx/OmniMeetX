"""
OmniMeetX - Database package.

    from app.db import get_db, SessionLocal, Base
"""
from app.db.base import Base
from app.db.session import engine, SessionLocal, get_db
from app.db.migrations import run_migrations


def init_db() -> None:
    """Create tables for every model and patch older SQLite schemas."""
    import app.models  # noqa: F401  — registers all models on Base.metadata

    Base.metadata.create_all(bind=engine)
    run_migrations()
    if engine.url.get_backend_name().startswith("postgres"):
        # Supabase exposes public tables through its Data API with a public key.
        # RLS without policies blocks that; the backend owns the tables, so it isn't affected.
        from sqlalchemy import text
        with engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                conn.execute(text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY'))


__all__ = ["Base", "engine", "SessionLocal", "get_db", "init_db", "run_migrations"]

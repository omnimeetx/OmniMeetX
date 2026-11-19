"""
OmniMeetX - Database engine & sessions
SQLite locally (data/app.db), PostgreSQL in production via SQLALCHEMY_DATABASE_URI.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.url import safe_db_url

IS_SQLITE = settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite")

if IS_SQLITE:
    os.makedirs("data", exist_ok=True)

engine = create_engine(
    safe_db_url(settings.SQLALCHEMY_DATABASE_URI),
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

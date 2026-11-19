"""
OmniMeetX - Lightweight auto-migration.

`create_all` makes missing tables but never adds columns to existing ones.

- SQLite (old local databases): the column lists below.
- PostgreSQL (Supabase): every model column the live table lacks is added,
  typed from the model. Additive only: nothing is dropped, renamed or retyped.
  Anything beyond adding a column needs a real migration tool (Alembic).
"""
import logging

from sqlalchemy import inspect, literal, text

from app.db.session import engine, IS_SQLITE

logger = logging.getLogger(__name__)

USER_COLUMNS = {
    'reset_token': 'TEXT',
    'reset_token_expiry': 'DATETIME',
    'phone_number': 'TEXT',
    'email_otp': 'TEXT',
    'phone_otp': 'TEXT',
    'is_verified': 'BOOLEAN DEFAULT 0',
    'otp_expiry': 'DATETIME',
    'email_verified': 'BOOLEAN DEFAULT 0',
    'email_token': 'TEXT',
    'email_token_expires': 'DATETIME',
    'phone_verified': 'BOOLEAN DEFAULT 0',
    'phone_otp_expires': 'DATETIME',
    'bio': 'TEXT',
    'avatar_url': 'VARCHAR(500)',
    'password_updated_at': 'DATETIME',
    'two_factor_pin_hash': 'VARCHAR(255)',
    'two_factor_enabled': 'BOOLEAN DEFAULT 0',
    'is_active': 'BOOLEAN DEFAULT 1',
    'deactivated_at': 'DATETIME',
    'created_at': 'DATETIME',
    # Billing
    'plan': "VARCHAR(20) DEFAULT 'free'",
    'credits_remaining': "INTEGER DEFAULT 60",
    'credits_total': "INTEGER DEFAULT 60",
    'paddle_customer_id': "VARCHAR(100)",
    'paddle_subscription_id': "VARCHAR(100)",
    'subscription_status': "VARCHAR(30) DEFAULT 'none'",
    'current_period_end': "DATETIME",
    'credits_reset_at': "DATETIME",
}

SUBSCRIPTION_COLUMNS = {
    'cancel_at': "DATETIME",
}

MEETING_COLUMNS = {
    'source': "VARCHAR(50) DEFAULT 'upload'",
    'participant_mapping': "TEXT DEFAULT '{}'",
    'processing_steps': "TEXT DEFAULT '[]'",
    'current_step_progress': "INTEGER DEFAULT 0",
    'video_webm_path': "VARCHAR(500)",
    'video_mp4_path': "VARCHAR(500)",
    'has_video': "BOOLEAN DEFAULT 0",
    'video_duration': "FLOAT DEFAULT 0.0",
    'filepath': "VARCHAR(500)",
    'storage_path': "VARCHAR(500)",
    'media_kind': "VARCHAR(10)",
    'source_url': "VARCHAR(1000)",
    'transcript': "TEXT",
    'duration': "FLOAT DEFAULT 0.0",
    'participants_count': "INTEGER DEFAULT 0",
    'is_favorite': "BOOLEAN DEFAULT 0",
    'meeting_room_id': "VARCHAR(200)",
    'recording_started_at': "DATETIME",
}


def _add_missing_columns(conn, table: str, wanted: dict) -> None:
    existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()}
    for col_name, col_type in wanted.items():
        if col_name not in existing:
            logger.info(f"Migrating: Adding {col_name} to {table} table")
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))


def _add_missing_model_columns(conn) -> None:
    """PostgreSQL: add model columns the live tables lack, so a new column in a model can't break every query."""
    from app.db.base import Base

    inspector = inspect(conn)
    quote = conn.dialect.identifier_preparer.quote
    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue  # create_all just made it with every column
        existing = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing:
                continue
            ddl = (f"ALTER TABLE {quote(table.name)} ADD COLUMN IF NOT EXISTS "
                   f"{quote(column.name)} {column.type.compile(dialect=conn.dialect)}")
            default = column.default
            # Fill existing rows with a plain default (False, 0, 'upload'); callables like utcnow stay NULL.
            if default is not None and default.is_scalar:
                value = literal(default.arg, type_=column.type).compile(
                    dialect=conn.dialect, compile_kwargs={"literal_binds": True})
                ddl += f" DEFAULT {value}"
            logger.info("Migrating: adding %s.%s", table.name, column.name)
            conn.execute(text(ddl))


def run_migrations() -> None:
    """Add columns that existing databases are missing."""
    if not IS_SQLITE:
        try:
            with engine.begin() as conn:
                # Never queue behind a long query while holding up every other request.
                conn.execute(text("SET LOCAL lock_timeout = '5s'"))
                _add_missing_model_columns(conn)
        except Exception:
            # Fail the start loudly: serving with a missing column would 500 on every meeting query.
            logger.exception("Schema migration failed")
            raise
        return
    try:
        with engine.connect() as conn:
            _add_missing_columns(conn, "user", USER_COLUMNS)
            _add_missing_columns(conn, "meetings", MEETING_COLUMNS)
            _add_missing_columns(conn, "subscriptions", SUBSCRIPTION_COLUMNS)
            conn.commit()
    except Exception as e:
        logger.error(f"Schema migration error: {e}")

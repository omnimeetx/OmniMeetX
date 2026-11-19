"""
OmniMeetX - copy every row from the local SQLite database into Supabase Postgres.

    cd backend
    python scripts/migrate_to_supabase.py            # dry run: checks only, writes nothing
    python scripts/migrate_to_supabase.py --copy     # creates the tables and copies the data

Source: data/app.db (or --source). Target: SUPABASE_DB_URL in .env (or --target).

Safe to run more than once: it refuses to copy into a database that already has
rows, and everything is copied in one transaction, so a failure leaves the target
empty instead of half-filled. IDs are kept, so links between tables stay intact.
Prints table names and counts only, never row contents or connection strings.
"""
import argparse
import math
import os
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import Boolean, Integer, String, create_engine, func, inspect, select, text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.url import safe_db_url  # noqa: E402
import app.models  # noqa: E402,F401  registers every table on Base.metadata

BATCH = 500


def _engine(url: str):
    url = safe_db_url(url)
    kwargs = {"pool_pre_ping": True}
    if url.startswith("postgresql"):
        kwargs["connect_args"] = {"connect_timeout": 15}
    return create_engine(url, **kwargs)


def _host(url: str) -> str:
    """Where we are connecting, without the password."""
    return url.split("@")[-1].split("/")[0] if "@" in url else url.split("///")[-1]


def lock_down(engine) -> None:
    """
    Supabase publishes every table in the public schema through its Data API, and
    the publishable key is public. Row-level security with no policies closes that
    door; the backend connects as the table owner, which RLS doesn't restrict.
    """
    if not engine.url.get_backend_name().startswith("postgres"):
        return
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            conn.execute(text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY'))
    print("row-level security on for", len(Base.metadata.sorted_tables), "tables (Data API can't read them)")


def preflight(src, tables) -> list:
    """Problems Postgres would reject that SQLite let through: too-long text, missing required values."""
    problems = []
    src_tables = set(inspect(src).get_table_names())
    for table in tables:
        if table.name not in src_tables:
            continue
        src_cols = {c["name"] for c in inspect(src).get_columns(table.name)}
        with src.connect() as conn:
            for col in table.columns:
                if col.name not in src_cols:
                    continue
                if isinstance(col.type, String) and col.type.length:
                    longest = conn.execute(select(func.max(func.length(text(f'"{col.name}"')))).select_from(text(f'"{table.name}"'))).scalar()
                    if longest and longest > col.type.length:
                        problems.append(f"{table.name}.{col.name}: longest value is {longest} characters, Postgres allows {col.type.length}")
                if not col.nullable and not col.primary_key and col.default is None and col.server_default is None:
                    nulls = conn.execute(text(f'SELECT COUNT(*) FROM "{table.name}" WHERE "{col.name}" IS NULL')).scalar()
                    if nulls:
                        problems.append(f"{table.name}.{col.name}: {nulls} rows are empty but the column is required")
    return problems


def _clean(row: dict, table) -> dict:
    """Coerce SQLite's loose values into what Postgres expects."""
    out = {}
    for col in table.columns:
        if col.name not in row:
            continue
        value = row[col.name]
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            value = None
        if isinstance(col.type, Boolean) and value is not None and not isinstance(value, bool):
            value = str(value).strip().lower() in ("1", "true", "t", "yes")
        if isinstance(col.type, Integer) and isinstance(value, str) and value.strip().lstrip("-").isdigit():
            value = int(value)
        out[col.name] = value
    return out


def _shared_columns(src, table):
    """Columns both sides have: an older local file may lack columns added since (they start empty)."""
    present = {c["name"] for c in inspect(src).get_columns(table.name)}
    return [c for c in table.columns if c.name in present]


def _comparable(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=None).isoformat(timespec="seconds")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float):
        return round(value, 6)
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", default="sqlite:///data/app.db")
    parser.add_argument("--target", default=settings.SUPABASE_DB_URL)
    parser.add_argument("--copy", action="store_true", help="actually copy (default is a dry run)")
    args = parser.parse_args()

    if not args.target:
        print("No target. Put SUPABASE_DB_URL in backend/.env (Supabase > Connect > Session pooler).")
        return 2

    src, dst = _engine(args.source), _engine(args.target)
    tables = Base.metadata.sorted_tables  # parents before children, so foreign keys hold
    print(f"source: {_host(args.source)}  ->  target: {_host(args.target)}")

    with dst.connect() as conn:
        version = conn.execute(text("SELECT version()")).scalar() or ""
    print("target reachable:", version.split(",")[0])

    src_tables = set(inspect(src).get_table_names())
    known = {t.name for t in tables}
    for extra in sorted(src_tables - known):
        print(f"note: table '{extra}' exists locally but no model uses it; it will not be copied")
    for table in tables:
        if table.name in src_tables:
            missing = {c["name"] for c in inspect(src).get_columns(table.name)} - {c.name for c in table.columns}
            if missing:
                print(f"note: {table.name} has old columns no model uses, not copied: {sorted(missing)}")

    problems = preflight(src, tables)
    for p in problems:
        print("PROBLEM:", p)
    if problems:
        print("Fix these first; nothing was copied.")
        return 1

    counts = {}
    with src.connect() as conn:
        for table in tables:
            counts[table.name] = conn.execute(select(func.count()).select_from(table)).scalar() if table.name in src_tables else 0
    print("rows to copy:", {k: v for k, v in counts.items() if v} or "none")

    existing = set(inspect(dst).get_table_names())
    if existing & known:
        with dst.connect() as conn:
            filled = {t.name: conn.execute(select(func.count()).select_from(t)).scalar() for t in tables if t.name in existing}
        filled = {k: v for k, v in filled.items() if v}
        if filled:
            print("Target already has data, refusing to copy on top of it:", filled)
            return 1

    if not args.copy:
        print("Dry run passed. Run again with --copy to copy.")
        return 0

    Base.metadata.create_all(bind=dst)
    lock_down(dst)
    with src.connect() as s, dst.begin() as d:  # one transaction: all tables or none
        for table in tables:
            if table.name not in src_tables:
                continue
            rows = [_clean(dict(r), table) for r in s.execute(select(*_shared_columns(src, table))).mappings()]
            for i in range(0, len(rows), BATCH):
                d.execute(table.insert(), rows[i:i + BATCH])
            pk = list(table.primary_key.columns)
            if len(pk) == 1 and isinstance(pk[0].type, Integer):
                # Keep new rows from reusing copied IDs.
                d.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('\"{table.name}\"', '{pk[0].name}'), "
                    f"COALESCE((SELECT MAX(\"{pk[0].name}\") FROM \"{table.name}\"), 1), "
                    f"(SELECT MAX(\"{pk[0].name}\") FROM \"{table.name}\") IS NOT NULL)"
                ))
            print(f"copied {table.name}: {len(rows)}")

    # Verify: same counts, and every row identical after normalising types.
    bad = []
    with src.connect() as s, dst.connect() as d:
        for table in tables:
            if table.name not in src_tables:
                continue
            order = list(table.primary_key.columns)
            cols = _shared_columns(src, table)
            a = [tuple(_comparable(v) for v in _clean(dict(r), table).values()) for r in s.execute(select(*cols).order_by(*order)).mappings()]
            b = [tuple(_comparable(v) for v in _clean(dict(r), table).values()) for r in d.execute(select(*cols).order_by(*order)).mappings()]
            if a != b:
                bad.append(table.name)
    if bad:
        print("VERIFY FAILED for:", bad)
        return 1
    print("verified: every table matches row for row")
    return 0


if __name__ == "__main__":
    sys.exit(main())

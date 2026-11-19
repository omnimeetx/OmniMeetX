"""
OmniMeetX - Health & readiness probes
Used by Render health checks, Cloudflare and uptime monitors.
"""
import os
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.services import llm_router
from app.services.livekit import livekit_configured

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


def _db_ok(db: Session) -> bool:
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Health check DB probe failed: {e}")
        return False


@router.get("/")
async def root():
    return {"status": "Backend running!", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/health")
@router.get("/api/health")
async def health(db: Session = Depends(get_db)):
    """
    Uptime & liveness probe.
    200 when the service is alive and the DB responds, 503 otherwise.
    """
    db_ok = _db_ok(db)
    providers = llm_router.provider_status()

    body = {
        "status": "healthy" if db_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.RELEASE_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {"connected": db_ok},
        "ai": {
            "healthy": any(p["available"] for p in providers),
            "available_now": [p["name"] for p in providers if p["available"]],
        },
        "video_calling": {
            "configured": livekit_configured(),
            "provider": "livekit",
        },
        "transcription": {
            "assemblyai": bool(settings.ASSEMBLYAI_API_KEY),
            "groq_whisper": bool(settings.GROQ_API_KEY),
        },
    }
    return JSONResponse(status_code=200 if db_ok else 503, content=body)


@router.get("/ready")
@router.get("/api/ready")
async def ready(db: Session = Depends(get_db)):
    """
    Readiness probe for load balancers before routing traffic.
    Checks DB connectivity and filesystem storage write access.
    """
    checks = {"database": _db_ok(db)}

    try:
        os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
        test_file = os.path.join(settings.UPLOAD_FOLDER, ".probe_test")
        with open(test_file, "w") as f:
            f.write("probe")
        if os.path.exists(test_file):
            os.remove(test_file)
        checks["storage"] = True
    except Exception:
        checks["storage"] = False

    if not all(checks.values()):
        raise HTTPException(503, detail={"status": "not_ready", "checks": checks, "error": "not_ready"})

    return {"status": "ready", "checks": checks, "timestamp": datetime.now(timezone.utc).isoformat()}

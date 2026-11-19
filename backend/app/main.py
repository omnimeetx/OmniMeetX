"""
OmniMeetX - FastAPI application entry point.

    uvicorn app.main:socket_app --host 0.0.0.0 --port 5000 --reload

`socket_app` wraps the REST API with the Socket.IO server; always run that one.
"""
import logging
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.middleware import SecurityHeadersMiddleware, RateLimiterMiddleware
from app.db import init_db
from app.routers import ALL_ROUTERS
from app.sockets import create_socket_server

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    from app.core.startup import require_safe_production_settings
    require_safe_production_settings()
    settings.ensure_storage_dirs()
    init_db()

    from app.core.observability import init_observability
    init_observability()

    from app.services.cleanup import start_cleanup_scheduler
    start_cleanup_scheduler()

    from app.services.jobs import schedule_interrupted_job_recovery
    schedule_interrupted_job_recovery(settings.INTERRUPTED_JOB_CHECK_SECONDS)

    from app.core.startup import print_startup_summary
    print_startup_summary()

    yield

    # --- SHUTDOWN ---
    logger.info("Shutting down OmniMeetX...")


app = FastAPI(
    title="OmniMeetX API",
    version=settings.RELEASE_VERSION,
    description="AI-powered meeting transcription, notes and video calling",
    lifespan=lifespan,
    # Interactive API docs locally only; in production they'd publish a map of every endpoint.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# Middlewares execute in reverse order of addition: CORS -> rate limit -> security headers
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Retry-After"],
)

register_exception_handlers(app)

for router in ALL_ROUTERS:
    app.include_router(router)

# Socket.IO wraps the FastAPI app so both share one port.
sio = create_socket_server(settings.cors_origins)
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:socket_app", host="0.0.0.0", port=5000, reload=True, log_level="info")

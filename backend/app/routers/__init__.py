"""
OmniMeetX - API routers.
Add a new feature area by creating a module here and listing its router below.
"""
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.uploads import router as uploads_router
from app.routers.meetings import router as meetings_router
from app.routers.media import router as media_router
from app.routers.meeting_rooms import router as meeting_rooms_router
from app.routers.analytics import router as analytics_router
from app.routers.billing import router as billing_router
from app.routers.ai import router as ai_router
from app.routers.contact import router as contact_router
from app.routers.feedback import router as feedback_router
from app.routers.admin import router as admin_router

ALL_ROUTERS = [
    health_router,
    auth_router,
    uploads_router,
    meetings_router,
    media_router,
    meeting_rooms_router,
    analytics_router,
    billing_router,
    ai_router,
    contact_router,
    feedback_router,
    admin_router,
]

"""
OmniMeetX - LiveKit integration (access tokens)

Mints LiveKit access tokens. A LiveKit token is a plain HS256 JWT signed with
the project API secret, so we use python-jose (already a dependency) rather
than pulling in the full livekit-api SDK.

Token spec: https://docs.livekit.io/home/get-started/authentication/
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)


class LiveKitNotConfigured(RuntimeError):
    """Raised when LiveKit credentials are missing from the environment."""


def livekit_configured() -> bool:
    return bool(
        settings.LIVEKIT_URL
        and settings.LIVEKIT_API_KEY
        and settings.LIVEKIT_API_SECRET
    )


def build_access_token(
    room: str,
    identity: str,
    name: str,
    *,
    can_publish: bool = True,
    can_subscribe: bool = True,
    is_host: bool = False,
    metadata: Optional[dict] = None,
    ttl_hours: Optional[int] = None,
) -> str:
    """
    Build a signed LiveKit access token granting `identity` access to `room`.

    `identity` must be stable and unique per user — LiveKit disconnects an older
    session when a new one joins with the same identity, which is what we want
    for "same user opened a second tab".
    """
    if not livekit_configured():
        raise LiveKitNotConfigured(
            "LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET are not set"
        )

    now = datetime.now(timezone.utc)
    ttl = timedelta(hours=ttl_hours or settings.LIVEKIT_TOKEN_TTL_HOURS)

    grant = {
        "room": room,
        "roomJoin": True,
        "canPublish": can_publish,
        "canSubscribe": can_subscribe,
        "canPublishData": True,
        # Hosts may mute/remove others and end the room for everyone.
        "roomAdmin": is_host,
    }

    payload = {
        "iss": settings.LIVEKIT_API_KEY,
        "sub": identity,
        "nbf": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "name": name,
        "video": grant,
    }

    if metadata:
        payload["metadata"] = json.dumps(metadata)

    return jwt.encode(payload, settings.LIVEKIT_API_SECRET, algorithm="HS256")


def participant_identity(user_id) -> str:
    """Stable LiveKit identity for one of our users."""
    return f"user-{user_id}"


def user_id_from_identity(identity: str):
    """Inverse of participant_identity(). Returns None if it doesn't match."""
    if isinstance(identity, str) and identity.startswith("user-"):
        return identity[len("user-"):]
    return None


def livekit_url() -> str:
    """The wss:// URL clients should connect to."""
    return settings.LIVEKIT_URL

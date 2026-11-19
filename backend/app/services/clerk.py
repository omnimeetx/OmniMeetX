"""
OmniMeetX - Clerk (Google sign-in) verification.

The browser signs in with Clerk, then calls /api/auth/clerk-sync with its Clerk
session token. We check that token's signature against Clerk's public keys and
read the user's *verified* email from Clerk's API — never from the request
body, which anyone could forge to log in as someone else.

Needs CLERK_SECRET_KEY (Clerk dashboard -> API keys).
"""
import logging
import threading
import time
from typing import Optional

import requests
from jose import jwt, JWTError

from app.core.config import settings

logger = logging.getLogger(__name__)

CLERK_API = "https://api.clerk.com/v1"
JWKS_TTL_SECONDS = 3600
CLOCK_SKEW_SECONDS = 10


class ClerkNotConfigured(RuntimeError):
    """CLERK_SECRET_KEY is missing or rejected by Clerk."""


class ClerkAuthError(RuntimeError):
    """The session token or the Clerk account is not acceptable."""


_jwks_cache = {"keys": None, "fetched_at": 0.0}
_jwks_lock = threading.Lock()


def clerk_configured() -> bool:
    # A key copied from the dashboard's masked view contains "…", which can't be sent in a header.
    return bool(settings.CLERK_SECRET_KEY) and settings.CLERK_SECRET_KEY.isascii()


def _api_get(path: str) -> dict:
    resp = requests.get(
        f"{CLERK_API}{path}",
        headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
        timeout=10,
    )
    if resp.status_code in (401, 403):
        raise ClerkNotConfigured("CLERK_SECRET_KEY was rejected by Clerk")
    if resp.status_code == 404:
        raise ClerkAuthError("Clerk user not found")
    resp.raise_for_status()
    return resp.json()


def _jwks(force_refresh: bool = False) -> list:
    """Clerk's public signing keys, cached for an hour."""
    with _jwks_lock:
        stale = time.time() - _jwks_cache["fetched_at"] > JWKS_TTL_SECONDS
        if force_refresh or stale or not _jwks_cache["keys"]:
            _jwks_cache["keys"] = _api_get("/jwks").get("keys", [])
            _jwks_cache["fetched_at"] = time.time()
        return _jwks_cache["keys"]


def verify_session_token(token: str) -> dict:
    """Validate a Clerk session JWT and return its claims."""
    try:
        kid = jwt.get_unverified_header(token).get("kid")
    except JWTError as e:
        raise ClerkAuthError("Malformed session token") from e

    key = next((k for k in _jwks() if k.get("kid") == kid), None)
    if key is None:  # Clerk may have rotated its keys since we cached them
        key = next((k for k in _jwks(force_refresh=True) if k.get("kid") == kid), None)
    if key is None:
        raise ClerkAuthError("Session token signed with an unknown key")

    try:
        claims = jwt.decode(
            token, key, algorithms=["RS256"],
            options={"verify_aud": False, "leeway": CLOCK_SKEW_SECONDS},
        )
    except JWTError as e:
        raise ClerkAuthError(f"Invalid session token: {e}") from e

    # `azp` is the site that requested the token; refuse tokens minted for other sites.
    azp = claims.get("azp")
    origins = settings.cors_origins
    if azp and origins != ["*"] and azp.rstrip("/") not in origins:
        raise ClerkAuthError(f"Session token was issued for another site ({azp})")
    if not claims.get("sub"):
        raise ClerkAuthError("Session token has no user")
    return claims


def _verified(item: Optional[dict]) -> bool:
    return bool(item) and (item.get("verification") or {}).get("status") == "verified"


def verified_identity(session_token: str) -> dict:
    """
    Verify a Clerk session and return the signed-in person's identity:
    {"clerk_id", "email", "full_name", "avatar_url", "phone_number"}.
    """
    if not clerk_configured():
        raise ClerkNotConfigured("CLERK_SECRET_KEY is not set")

    claims = verify_session_token(session_token)
    user = _api_get(f"/users/{claims['sub']}")

    primary_email = next(
        (e for e in user.get("email_addresses", []) if e.get("id") == user.get("primary_email_address_id")),
        None,
    )
    if not _verified(primary_email):
        raise ClerkAuthError("This Google/Clerk account has no verified email address")

    primary_phone = next(
        (p for p in user.get("phone_numbers", []) if p.get("id") == user.get("primary_phone_number_id")),
        None,
    )
    full_name = " ".join(filter(None, [user.get("first_name"), user.get("last_name")])).strip()

    return {
        "clerk_id": user.get("id"),
        "email": primary_email["email_address"].strip().lower(),
        "full_name": full_name or None,
        "avatar_url": user.get("image_url"),
        "phone_number": primary_phone["phone_number"] if _verified(primary_phone) else None,
    }

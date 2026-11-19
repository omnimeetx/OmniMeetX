"""
OmniMeetX - Authentication & password security
JWT creation/verification via python-jose, password hashing via werkzeug,
and the FastAPI dependencies that resolve the current user.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from werkzeug.security import generate_password_hash, check_password_hash

from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Passwords & PINs
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash a password or 2FA PIN for storage."""
    return generate_password_hash(password)


def verify_password(password_hash: Optional[str], password: str) -> bool:
    """Check a plain password/PIN against its stored hash."""
    if not password_hash:
        return False
    return check_password_hash(password_hash, password)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
def create_access_token(identity, fresh: bool = False) -> str:
    """Create a JWT access token for a user id."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(identity),
        "iat": now,
        "exp": now + settings.JWT_ACCESS_TOKEN_EXPIRES,
        "fresh": fresh,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token. Returns the payload dict."""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Token has expired",
                "message": "Your session has expired. Please log in again.",
                "code": "token_expired",
            },
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "Invalid token",
                "message": "The provided token is invalid. Please log in again.",
                "code": "token_invalid",
            },
        )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------
def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> int:
    """Require a valid Bearer token and return its user id."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Authorization required",
                "message": "Please provide a valid authorization token.",
                "code": "token_missing",
            },
        )
    payload = decode_token(credentials.credentials)
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail={"error": "Invalid token payload"})
    return int(sub)


def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[int]:
    """Return the user id if a valid token is present, None otherwise."""
    if credentials is None:
        return None
    try:
        payload = decode_token(credentials.credentials)
        sub = payload.get("sub")
        return int(sub) if sub else None
    except HTTPException:
        return None


def verify_token_from_query(token: str) -> int:
    """Verify a JWT passed as a query parameter (EventSource / <video src>)."""
    if not token:
        raise HTTPException(status_code=401, detail={"error": "Missing token"})
    payload = decode_token(token)
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail={"error": "Invalid token"})
    return int(sub)

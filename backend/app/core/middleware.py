"""
OmniMeetX - Security & Rate Limiting Middlewares

1. SecurityHeadersMiddleware: Injects OWASP recommended security headers.
2. RateLimiterMiddleware: Sliding-window rate limiter preventing brute-force and DDoS attacks.
"""
import time
import threading
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from app.core.config import settings

# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        headers = response.headers
        headers["X-Content-Type-Options"] = "nosniff"
        headers["X-Frame-Options"] = "DENY"
        headers["X-XSS-Protection"] = "1; mode=block"
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        headers["Permissions-Policy"] = "camera=(self), microphone=(self), display-capture=(self)"
        
        # In non-localhost environments, enforce HSTS
        if not request.base_url.hostname or request.base_url.hostname not in ("localhost", "127.0.0.1"):
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            
        return response


# ---------------------------------------------------------------------------
# Sliding-Window Rate Limiter
# ---------------------------------------------------------------------------
class SlidingWindowRateLimiter:
    """Thread-safe sliding-window in-memory rate limiter."""
    def __init__(self):
        self._lock = threading.RLock()
        self._requests: Dict[str, List[float]] = {}
        self._last_cleanup = time.time()

    def _cleanup(self, now: float, window_seconds: float = 60.0):
        """Purge entries older than window_seconds."""
        if now - self._last_cleanup < 30.0:
            return
        self._last_cleanup = now
        cutoff = now - window_seconds
        keys_to_delete = []
        for key, timestamps in self._requests.items():
            valid = [ts for ts in timestamps if ts > cutoff]
            if valid:
                self._requests[key] = valid
            else:
                keys_to_delete.append(key)
        for key in keys_to_delete:
            del self._requests[key]

    def is_allowed(self, key: str, max_requests: int, window_seconds: float = 60.0) -> Tuple[bool, int]:
        """
        Check if request is allowed under the rate limit.
        Returns (is_allowed, retry_after_seconds).
        """
        now = time.time()
        with self._lock:
            self._cleanup(now, window_seconds)
            cutoff = now - window_seconds
            timestamps = self._requests.get(key, [])
            # Filter timestamps in current window
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]
            
            if len(valid_timestamps) >= max_requests:
                oldest_in_window = valid_timestamps[0]
                retry_after = max(1, int(window_seconds - (now - oldest_in_window)))
                return False, retry_after
            
            valid_timestamps.append(now)
            self._requests[key] = valid_timestamps
            return True, 0


limiter = SlidingWindowRateLimiter()


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        
        # Don't rate-limit OPTIONS preflight, health checks, or static media
        if request.method == "OPTIONS" or path in ("/api/health", "/api/ai/providers", "/docs", "/openapi.json"):
            return await call_next(request)
        
        # Determine client identifier (IP + authorization token if present)
        client_ip = request.client.host if request.client else "unknown"
        auth_header = request.headers.get("Authorization", "")
        client_id = f"{client_ip}:{auth_header[-16:]}" if auth_header else client_ip
        
        # Determine rule based on endpoint path
        if path in (
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/reset-pin",
            "/api/auth/forgot-pin",
            "/api/auth/verify-credentials",
            "/api/auth/verify-otp",
            "/api/auth/resend-otp",
            "/api/auth/resend-verification",
        ):
            limit = settings.RATE_LIMIT_AUTH_PER_MINUTE
            bucket = f"auth:{client_id}"
        elif path.startswith("/api/upload") or path.startswith("/api/meeting-rooms/recording"):
            limit = settings.RATE_LIMIT_UPLOAD_PER_MINUTE
            bucket = f"upload:{client_id}"
        else:
            limit = settings.RATE_LIMIT_GENERAL_PER_MINUTE
            bucket = f"gen:{client_id}"
            
        allowed, retry_after = limiter.is_allowed(bucket, max_requests=limit, window_seconds=60.0)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "detail": f"Rate limit exceeded. Please retry after {retry_after} seconds.",
                    "retry_after": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )
            
        return await call_next(request)

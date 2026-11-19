"""
OmniMeetX — Observability & Sentry Error Tracking

Initializes Sentry SDK with strict PII scrubbing:
- Never transmits raw meeting transcripts, audio data, passwords, or JWT tokens.
- Only captures user_id for session context (no email or IP address).
"""
import logging
from typing import Optional, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Keys that must be scrubbed from all error context and payloads
SENSITIVE_KEYS = {
    "password", "password_hash", "token", "access_token", "jwt", "authorization",
    "secret", "api_key", "transcript", "raw_text", "utterances", "notes",
    "summary", "transcription", "content", "two_factor_pin", "phone_otp", "email_otp"
}


def _scrub_dict(data: Any) -> Any:
    """Recursively scrub sensitive keys from dictionaries and lists."""
    if isinstance(data, dict):
        scrubbed = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                scrubbed[k] = "[SCRUBBED]"
            elif isinstance(v, (dict, list)):
                scrubbed[k] = _scrub_dict(v)
            else:
                scrubbed[k] = v
        return scrubbed
    elif isinstance(data, list):
        return [_scrub_dict(item) for item in data]
    return data


def sentry_before_send(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Sentry before_send hook: enforce PII removal."""
    try:
        # Scrub user object — only keep ID, remove IP and email
        if "user" in event:
            user = event["user"]
            if isinstance(user, dict):
                event["user"] = {
                    "id": str(user.get("id", "anonymous")),
                }

        # Scrub request data (form, json, headers)
        if "request" in event:
            req = event["request"]
            if "data" in req:
                req["data"] = _scrub_dict(req["data"])
            if "headers" in req:
                headers = req["headers"]
                if isinstance(headers, dict):
                    if "Authorization" in headers:
                        headers["Authorization"] = "[SCRUBBED]"
                    if "Cookie" in headers:
                        headers["Cookie"] = "[SCRUBBED]"

        # Scrub extra context
        if "extra" in event:
            event["extra"] = _scrub_dict(event["extra"])

    except Exception as e:
        logger.warning(f"Error in Sentry PII scrubbing: {e}")

    return event


def init_observability():
    """Initialize Sentry error tracking if SENTRY_DSN is configured."""
    if not settings.SENTRY_DSN:
        logger.info("Sentry DSN not configured — error tracking operating in local log mode")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            release=f"omnimeetx@{settings.RELEASE_VERSION}",
            traces_sample_rate=0.2,
            send_default_pii=False,
            before_send=sentry_before_send,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
        )
        logger.info(f"Sentry error tracking initialized (env={settings.ENVIRONMENT})")
    except ImportError:
        logger.warning("sentry-sdk not installed — skipping Sentry initialization")
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")

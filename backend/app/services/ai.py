"""
OmniMeetX - AI call helpers used across features.
Thin wrappers over the multi-provider LLM router (app/services/llm_router.py).
"""
import logging
import time

from app.services import llm_router

logger = logging.getLogger(__name__)

# Free AI tiers allow only a few requests per minute, and one meeting makes
# several calls back to back. Background jobs can afford to wait it out.
BACKGROUND_RETRY_DELAYS = (30, 60)


def call_ai_patiently(prompt, *, feature_name, model=None, temperature=0.7):
    """
    For background jobs only: when every provider is rate-limited, wait and
    retry instead of giving up. A rejected API key still fails immediately.
    Interactive requests should use call_gemini_api / call_gemini_safe.
    """
    delays = (0, *BACKGROUND_RETRY_DELAYS)
    for attempt, delay in enumerate(delays):
        if delay:
            logger.info(f"[{feature_name}] all AI providers are rate-limited; retrying in {delay}s")
            time.sleep(delay)
            llm_router.clear_rate_limit_cooldowns()
        try:
            return llm_router.generate(prompt, model=model, temperature=temperature, feature_name=feature_name)
        except llm_router.AllProvidersFailed as e:
            rate_limited = any("rate limited" in r or "cooling down" in r for r in e.attempts.values())
            if not rate_limited or attempt == len(delays) - 1:
                raise


def call_gemini_api(prompt, model=None, feature_name="unknown", temperature=0.7):
    """
    Send a prompt to the AI, falling back across providers automatically.

    Name kept for compatibility — it is no longer Gemini-only. Gemini is simply
    first in the chain; when it is out of quota the router moves straight to the
    next configured provider instead of retrying a request that cannot succeed.

    Returns an object with `.text`, matching the old Gemini response shape.
    """
    return llm_router.generate(
        prompt,
        model=model,
        temperature=temperature,
        feature_name=feature_name,
    )


def call_gemini_safe(prompt, feature_name="unknown"):
    """
    Text-returning wrapper that never raises.

    Only returns the apology string when *every* configured provider is down,
    rather than the moment Gemini hits its daily cap.
    """
    try:
        return call_gemini_api(prompt, feature_name=feature_name).text.strip()
    except llm_router.AllProvidersFailed as e:
        logger.error(f"All AI providers failed for {feature_name}: {e}")
        if not llm_router.configured_providers():
            return ("AI features are not configured on this server. "
                    "Add an API key for at least one provider.")
        return "AI features are temporarily unavailable. Please try again in a moment."
    except Exception as e:
        logger.error(f"AI call failed for {feature_name}: {e}")
        return "AI features are temporarily unavailable. Please try again in a moment."

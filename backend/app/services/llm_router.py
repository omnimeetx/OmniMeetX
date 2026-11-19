"""
OmniMeetX - LLM router with automatic provider failover.

Gemini's free tier runs out quickly, and the old code made that worse: it wrapped
every call in `backoff.expo(... max_tries=3)`, so a 429 quota error was retried
against the *same* exhausted key three times before failing. Quota errors are not
transient — retrying cannot fix them, only switching provider can.

This module tries a chain of providers in order and moves on the moment one is
rate-limited, putting that provider on a short cooldown so the next request does
not waste time on it either.

Every provider except Gemini speaks the OpenAI chat-completions format, so they
share a single adapter — adding another is one entry in PROVIDERS.

Configure whichever keys you have; missing ones are skipped silently.
"""
import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 90


class AllProvidersFailed(RuntimeError):
    """Every configured provider refused or errored."""

    def __init__(self, attempts: Dict[str, str]):
        self.attempts = attempts
        detail = "; ".join(f"{name}: {err}" for name, err in attempts.items()) or "none configured"
        super().__init__(f"All AI providers failed ({detail})")


class RateLimited(RuntimeError):
    """Provider is out of quota — do not retry it, move to the next one."""


class AuthFailed(RuntimeError):
    """
    Provider rejected the API key.

    Distinct from RateLimited because it never resolves on its own — someone has
    to fix the key. We park the provider for a long while so every subsequent
    request does not pay a wasted round trip, and log loudly enough to be noticed.
    """


class LLMResponse:
    """
    Mimics the shape callers already expect from `call_gemini_api` (`.text`),
    so existing call sites keep working unchanged.
    """

    def __init__(self, text: str, provider: str, model: str):
        self.text = text
        self.provider = provider
        self.model = model

    def __repr__(self) -> str:
        return f"<LLMResponse provider={self.provider} model={self.model} chars={len(self.text)}>"


@dataclass
class Provider:
    name: str
    model: str
    call: Callable[[str, str, float], str]
    api_key_getter: Callable[[], str]
    # Set when the provider reports quota exhaustion; skipped until this time.
    cooldown_until: float = 0.0
    cooldown_reason: str = ""   # "rate_limit" (recovers by itself) | "auth" (needs a new key)
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def available(self) -> bool:
        return bool(self.api_key_getter()) and time.time() >= self.cooldown_until

    def mark_rate_limited(self, seconds: int = 120, reason: str = "rate_limit"):
        with self._lock:
            self.cooldown_until = time.time() + seconds
            self.cooldown_reason = reason
        logger.warning(f"{self.name} unavailable ({reason}) — skipping it for {seconds}s")

    def clear_cooldown(self):
        with self._lock:
            self.cooldown_until = 0.0
            self.cooldown_reason = ""


# ---------------------------------------------------------------------------
# Provider adapters
# ---------------------------------------------------------------------------
def _openai_compatible(base_url: str, api_key: str, model: str, prompt: str,
                       temperature: float, extra_headers: Optional[dict] = None,
                       extra_payload: Optional[dict] = None) -> str:
    """Shared adapter for every provider that speaks OpenAI chat-completions."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **(extra_headers or {}),
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        **(extra_payload or {}),
    }

    resp = requests.post(
        f"{base_url}/chat/completions",
        headers=headers,
        json=payload,
        timeout=DEFAULT_TIMEOUT,
    )

    if resp.status_code == 401:
        raise AuthFailed(f"{resp.status_code} {resp.text[:200]}")
    if resp.status_code == 429:
        raise RateLimited(f"{resp.status_code} {resp.text[:200]}")
    # 402/403 usually mean the free allowance is spent — same handling as quota.
    if resp.status_code in (402, 403):
        raise RateLimited(f"{resp.status_code} {resp.text[:200]}")
    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")

    body = resp.json()
    choices = body.get("choices") or []
    if not choices:
        raise RuntimeError(f"No choices in response: {str(body)[:200]}")

    text = (choices[0].get("message") or {}).get("content") or ""
    if not text.strip():
        raise RuntimeError("Empty completion")
    return text


def _call_gemini(model: str, prompt: str, temperature: float) -> str:
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    instance = genai.GenerativeModel(model)
    try:
        response = instance.generate_content(
            prompt,
            generation_config={"temperature": temperature},
        )
    except Exception as e:
        message = str(e).lower()
        if any(t in message for t in ("401", "api key not valid", "invalid api key",
                                      "permission_denied", "unauthenticated")):
            raise AuthFailed(str(e)[:300]) from e
        if any(t in message for t in ("429", "quota", "rate limit", "resource_exhausted", "exhausted")):
            raise RateLimited(str(e)[:300]) from e
        raise

    text = getattr(response, "text", None)
    if not text or not text.strip():
        raise RuntimeError("Empty response from Gemini")
    return text


def _call_groq(model: str, prompt: str, temperature: float) -> str:
    return _openai_compatible(
        "https://api.groq.com/openai/v1", settings.GROQ_API_KEY, model, prompt, temperature
    )


def _call_cerebras(model: str, prompt: str, temperature: float) -> str:
    return _openai_compatible(
        "https://api.cerebras.ai/v1", settings.CEREBRAS_API_KEY, model, prompt, temperature
    )


def _call_openrouter(model: str, prompt: str, temperature: float) -> str:
    return _openai_compatible(
        "https://openrouter.ai/api/v1",
        settings.OPENROUTER_API_KEY,
        model,
        prompt,
        temperature,
        extra_headers={
            "X-Title": "OmniMeetX",
            **({"HTTP-Referer": settings.APP_PUBLIC_URL} if settings.APP_PUBLIC_URL else {}),
        },
        # Meeting text must never reach a free model that logs or trains on prompts.
        extra_payload={"provider": {"data_collection": "deny"}},
    )


# ---------------------------------------------------------------------------
# The chain, in priority order
# ---------------------------------------------------------------------------
PROVIDERS: List[Provider] = [
    Provider(
        name="gemini",
        model=settings.GEMINI_MODEL,
        call=lambda m, p, t: _call_gemini(m, p, t),
        api_key_getter=lambda: settings.GEMINI_API_KEY,
    ),
    # Same key, different model: Gemini quotas are per model, so this keeps
    # working when the main model's quota is used up.
    Provider(
        name="gemini-lite",
        model=settings.GEMINI_FALLBACK_MODEL,
        call=lambda m, p, t: _call_gemini(m, p, t),
        api_key_getter=lambda: settings.GEMINI_API_KEY if settings.GEMINI_FALLBACK_MODEL else "",
    ),
    Provider(
        name="groq",
        model=settings.GROQ_LLM_MODEL,
        call=lambda m, p, t: _call_groq(m, p, t),
        api_key_getter=lambda: settings.GROQ_API_KEY,
    ),
    Provider(
        name="cerebras",
        model="llama-3.3-70b",
        call=lambda m, p, t: _call_cerebras(m, p, t),
        api_key_getter=lambda: settings.CEREBRAS_API_KEY,
    ),
    Provider(
        name="openrouter",
        # OpenRouter's own router across its current free models. Individual free
        # models get retired without notice (the previous Llama one started returning 404).
        model="openrouter/free",
        call=lambda m, p, t: _call_openrouter(m, p, t),
        api_key_getter=lambda: settings.OPENROUTER_API_KEY,
    ),
]

_PROVIDERS_BY_NAME = {p.name: p for p in PROVIDERS}


def configured_providers() -> List[str]:
    """Names of providers that have an API key set."""
    return [p.name for p in PROVIDERS if p.api_key_getter()]


def provider_status() -> List[dict]:
    """Diagnostics for the health endpoint."""
    now = time.time()
    return [
        {
            "name": p.name,
            "model": p.model,
            "configured": bool(p.api_key_getter()),
            "available": p.available(),
            "cooling_down_for": max(0, round(p.cooldown_until - now)),
        }
        for p in PROVIDERS
    ]


def clear_rate_limit_cooldowns():
    """Let rate-limited providers be tried again (not ones whose key was rejected)."""
    for p in PROVIDERS:
        if p.cooldown_reason == "rate_limit":
            p.clear_cooldown()


def reset_all_cooldowns():
    """Clear cooldown on all providers immediately."""
    for p in PROVIDERS:
        p.clear_cooldown()
    logger.info("Cleared cooldowns for all AI providers")


def generate(
    prompt: str,
    *,
    model: Optional[str] = None,
    temperature: float = 0.7,
    prefer: Optional[str] = None,
    feature_name: str = "unknown",
) -> LLMResponse:
    """
    Run `prompt` through the provider chain and return the first success.

    `model` overrides the model for the *first* provider only — fallbacks use
    their own model, since a Gemini model name is meaningless to Groq.
    `prefer` moves a named provider to the front of the chain.
    """
    if not prompt or not prompt.strip():
        raise ValueError("Prompt is empty")

    chain = list(PROVIDERS)
    if prefer and prefer in _PROVIDERS_BY_NAME:
        preferred = _PROVIDERS_BY_NAME[prefer]
        chain = [preferred] + [p for p in chain if p.name != prefer]

    attempts: Dict[str, str] = {}
    first = True

    for provider in chain:
        if not provider.api_key_getter():
            continue
        if not provider.available():
            attempts[provider.name] = "cooling down after rate limit"
            continue

        use_model = model if (first and model) else provider.model
        first = False

        try:
            logger.info(f"[{feature_name}] trying {provider.name}/{use_model}")
            text = provider.call(use_model, prompt, temperature)
            provider.clear_cooldown()
            logger.info(f"[{feature_name}] {provider.name} succeeded ({len(text)} chars)")
            return LLMResponse(text=text.strip(), provider=provider.name, model=use_model)

        except AuthFailed as e:
            attempts[provider.name] = f"invalid API key ({e})"
            # 15 minutes: a bad key will not fix itself, and retrying it on every
            # request costs a wasted round trip each time.
            provider.mark_rate_limited(900, reason="auth")
            logger.error(
                f"{provider.name.upper()} REJECTED THE API KEY — check {provider.name.upper()}_API_KEY "
                f"in your .env. Skipping this provider for 15 minutes."
            )
            continue

        except RateLimited as e:
            attempts[provider.name] = f"rate limited ({e})"
            provider.mark_rate_limited()
            continue

        except requests.Timeout:
            attempts[provider.name] = "timed out"
            logger.warning(f"[{feature_name}] {provider.name} timed out")
            continue

        except Exception as e:
            attempts[provider.name] = str(e)[:200]
            logger.warning(f"[{feature_name}] {provider.name} failed: {e}")
            continue

    raise AllProvidersFailed(attempts)


def generate_text(prompt: str, **kwargs) -> str:
    """Convenience wrapper returning just the string."""
    return generate(prompt, **kwargs).text

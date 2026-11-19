"""
OmniMeetX - Startup diagnostics
Prints which integrations are configured so a missing key is obvious at boot.
"""
import logging

import requests

from app.core.config import settings, INSECURE_DEFAULT_JWT_SECRET

logger = logging.getLogger(__name__)


def _transcription_status() -> str:
    if settings.GROQ_API_KEY:
        try:
            r = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                timeout=5,
            )
            if r.status_code == 200:
                return "AssemblyAI (major langs) + Groq Whisper (Urdu etc.) [GROQ ACTIVE]"
            if r.status_code == 401:
                return "AssemblyAI (major langs) + Groq Whisper [GROQ KEY REJECTED 401 - please update in .env]"
            return f"AssemblyAI (major langs) + Groq Whisper [HTTP {r.status_code}]"
        except Exception:
            return "AssemblyAI (major langs) + Groq Whisper"
    if settings.ASSEMBLYAI_API_KEY:
        return "AssemblyAI only — Urdu will use the low-accuracy Nano model"
    return "NONE — uploads cannot be transcribed"


def require_safe_production_settings() -> None:
    """Refuse to start in production with settings that would let anyone forge a login."""
    if not settings.is_production:
        return
    secret = settings.JWT_SECRET_KEY or ""
    if secret == INSECURE_DEFAULT_JWT_SECRET or len(secret) < 32:
        raise RuntimeError(
            "JWT_SECRET_KEY must be a random value of at least 32 characters in production "
            "(generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\")"
        )


def print_startup_summary() -> None:
    from app.services import llm_router
    from app.services.livekit import livekit_configured

    ai_providers = llm_router.configured_providers()
    db_uri = settings.SQLALCHEMY_DATABASE_URI
    if "@" in db_uri:  # hide credentials; a password may itself contain @, so cut at the LAST one
        db_uri = db_uri.split("://", 1)[0] + "://***@" + db_uri.rsplit("@", 1)[1]

    print()
    print("=" * 65)
    print("  OmniMeetX — FastAPI Backend")
    print("=" * 65)
    print(f"  Environment         : {settings.ENVIRONMENT}")
    print(f"  Database            : {db_uri}")
    print(f"  Upload folder       : {settings.UPLOAD_FOLDER} (working copies)")
    print(f"  Recordings stored   : {'Supabase Storage, bucket ' + settings.SUPABASE_BUCKET if settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY else 'this disk only'}")
    print(f"  CORS origins        : {', '.join(settings.cors_origins)}")
    print(f"  AI providers        : {', '.join(f'{p.name} ({p.model})' for p in llm_router.PROVIDERS if p.api_key_getter()) or 'NONE — AI features will not work'}")
    if len(ai_providers) < 2:
        print("     ! Only one AI provider configured — add GROQ_API_KEY so AI")
        print("       features keep working when Gemini hits its daily quota.")
    print(f"  Transcription       : {_transcription_status()}")
    print(f"  Video calling       : {'LiveKit configured' if livekit_configured() else 'OFF — set LIVEKIT_* to enable camera/mic'}")
    print(f"  Google sign-in      : {'Clerk (verified server-side)' if settings.CLERK_SECRET_KEY and settings.CLERK_SECRET_KEY.isascii() else 'OFF — set the full CLERK_SECRET_KEY'}")
    print(f"  Email (Resend)      : {'from ' + settings.EMAIL_FROM if settings.RESEND_API_KEY else 'NOT CONFIGURED — signup codes are printed in this terminal'}")
    prices = sum(bool(p) for p in (settings.PADDLE_PRO_MONTHLY_PRICE_ID, settings.PADDLE_PRO_YEARLY_PRICE_ID,
                                   settings.PADDLE_PREMIUM_MONTHLY_PRICE_ID, settings.PADDLE_PREMIUM_YEARLY_PRICE_ID))
    paddle_mode = "SANDBOX" if settings.PADDLE_SANDBOX else "LIVE"
    print(f"  Paddle billing      : {paddle_mode} | API key {'set' if settings.PADDLE_API_KEY else 'MISSING'}"
          f" | webhook secret {'set' if settings.PADDLE_WEBHOOK_SECRET else 'MISSING'} | {prices}/4 prices")
    print(f"  Admins              : {', '.join(sorted(settings.admin_emails)) or 'none — set ADMIN_EMAILS'}")
    print(f"  Error tracking      : {'Sentry' if settings.SENTRY_DSN else 'local logs only'}")
    print("  API docs            : http://localhost:5000/docs")
    print("=" * 65)

    if settings.JWT_SECRET_KEY == INSECURE_DEFAULT_JWT_SECRET:
        logger.warning("JWT_SECRET_KEY is the insecure default — set a long random value in .env")
    if settings.is_production:
        if settings.PADDLE_SANDBOX:
            logger.warning("PADDLE_SANDBOX is on in production — /api/billing/dev-simulate-plan lets any user upgrade for free")
        if not settings.PADDLE_WEBHOOK_SECRET:
            logger.warning("PADDLE_WEBHOOK_SECRET is not set — webhook signatures are NOT verified")
        if settings.cors_origins == ["*"]:
            logger.warning("ALLOWED_ORIGINS is '*' in production — restrict it to your domain")
    print()

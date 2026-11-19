"""
OmniMeetX - Configuration
Environment variables mapped via Pydantic BaseSettings for validation.
Every value can be overridden in backend/.env — see .env.example.
"""
import os
import ssl
from datetime import timedelta
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEFAULT_JWT_SECRET = "your-super-secret-jwt-key-change-in-prod"


class Settings(BaseSettings):
    # --- App ---
    ENVIRONMENT: str = "development"           # development | staging | production
    RELEASE_VERSION: str = "2.0.0"
    FRONTEND_URL: str = "http://localhost:3000"  # used in password/PIN reset links
    BACKEND_PUBLIC_URL: str = ""                 # public URL of this API (avatar links); falls back to request URL
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000"

    # --- AI providers ---
    # Gemini is first in the LLM chain; the rest take over automatically when it
    # runs out of quota. Configure as many as you like — the router skips any
    # without a key. See app/services/llm_router.py
    GEMINI_API_KEY: str = ""
    # Change models here, never in code. Chosen by benchmark (Oct 2026): Flash-Lite
    # writes correct Urdu script, has no billed "thinking" tokens, and is cheapest.
    # Each Gemini model has its own quota, so fallbacks keep AI working when one is
    # rate-limited. gemini-3.5-flash-lite is text-only here: it transliterates Urdu audio.
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"           # notes, chat, translation, audio
    GEMINI_FALLBACK_MODEL: str = "gemini-3.5-flash-lite"  # text fallback
    GEMINI_AUDIO_FALLBACK_MODEL: str = "gemini-3.8-flash"  # audio fallback
    GROQ_API_KEY: str = ""        # console.groq.com  (Whisper for Urdu ASR + LLM fallback)
    GROQ_LLM_MODEL: str = "openai/gpt-oss-120b"            # llama-3.3-70b left self-serve in 2026
    CEREBRAS_API_KEY: str = ""    # cloud.cerebras.ai
    OPENROUTER_API_KEY: str = ""  # openrouter.ai
    ASSEMBLYAI_API_KEY: str = ""  # speech-to-text with speaker labels

    # Public URL of the deployed app (sent as the OpenRouter referer header)
    APP_PUBLIC_URL: str = ""

    # --- LiveKit (real-time video/audio SFU) ---
    LIVEKIT_URL: str = ""            # e.g. wss://your-project.livekit.cloud
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""
    LIVEKIT_TOKEN_TTL_HOURS: int = 6

    # --- Paddle billing (Merchant of Record) ---
    # Dashboard: Developer tools -> Authentication (API key), Notifications (webhook secret),
    # Catalog -> Products (price IDs). The browser's client-side token lives in the frontend env.
    PADDLE_API_KEY: str = ""                       # pdl_sdbx_apikey_... / pdl_live_apikey_...
    PADDLE_WEBHOOK_SECRET: str = ""                # pdl_ntfset_... (notification destination secret)
    PADDLE_SANDBOX: bool = True                    # False in production
    PADDLE_PRO_MONTHLY_PRICE_ID: str = ""          # pri_xxx from Paddle
    PADDLE_PREMIUM_MONTHLY_PRICE_ID: str = ""      # pri_xxx from Paddle
    PADDLE_PRO_YEARLY_PRICE_ID: str = ""
    PADDLE_PREMIUM_YEARLY_PRICE_ID: str = ""
    PADDLE_WEBHOOK_TOLERANCE_SECONDS: int = 300    # reject replayed webhooks older than this

    # --- Admins (comma-separated emails): see the user directory, all feedback,
    # and set feature-request statuses.
    ADMIN_EMAILS: str = ""

    # --- Clerk (Google sign-in). Secret key verifies sign-ins server-side. ---
    CLERK_SECRET_KEY: str = ""

    # --- JWT auth ---
    JWT_SECRET_KEY: str = INSECURE_DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    # Sliding session: the app renews the token while it's being used, so this is really
    # "signed out after N days without activity".
    JWT_ACCESS_TOKEN_EXPIRES_DAYS: int = 7

    # --- Database ---
    # Local SQLite by default. In production this is the Supabase Postgres URL
    # (the "Session pooler" connection string from Supabase > Connect).
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///data/app.db"
    # Where scripts/migrate_to_supabase.py copies the data to. Not used by the app.
    SUPABASE_DB_URL: str = ""

    # --- Supabase Storage (recordings) ---
    # With both set, uploaded recordings are kept in a private bucket; without
    # them, they stay on local disk (fine for development).
    SUPABASE_URL: str = ""                 # https://<project-ref>.supabase.co
    SUPABASE_SECRET_KEY: str = ""          # secret (sb_secret_...) or legacy service_role key; server only
    SUPABASE_BUCKET: str = "recordings"

    # --- File storage (local working copies; recordings also go to Supabase Storage when set) ---
    UPLOAD_FOLDER: str = "uploads"
    OUTPUT_FOLDER: str = "outputs"
    RECORDINGS_FOLDER: str = "recordings"
    MAX_FILE_SIZE_MB: int = 200
    MAX_AVATAR_SIZE_MB: int = 5
    MEDIA_RETENTION_DAYS: int = 30  # Auto-purge raw media older than N days (keeps transcripts/notes)

    # --- Background processing ---
    PROCESSING_WORKERS: int = 4     # parallel meetings processed per server process
    # After a restart, meetings still "processing" past this point were cut off and get released
    # (failed + minutes returned). Must exceed the host's shutdown grace period (Render: 300 s).
    INTERRUPTED_JOB_CHECK_SECONDS: int = 330

    # --- Email (Resend) ---
    RESEND_API_KEY: str = ""
    # Must be on a domain verified in Resend. The test sender below only
    # delivers to the email address that owns the Resend account.
    EMAIL_FROM: str = "OmniMeetX <onboarding@resend.dev>"
    CONTACT_EMAIL: str = ""          # inbox that receives contact-form messages

    # --- Redis (reserved for the job queue / shared rate limits) ---
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""

    # --- Rate limiting (requests per minute) ---
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    RATE_LIMIT_UPLOAD_PER_MINUTE: int = 10
    RATE_LIMIT_GENERAL_PER_MINUTE: int = 120

    # --- Observability ---
    SENTRY_DSN: str = ""

    # Escape hatch for machines with a broken certificate store. Never enable in
    # production: it turns off TLS verification for every outbound connection.
    DISABLE_SSL_VERIFY: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Derived values ---
    @property
    def JWT_ACCESS_TOKEN_EXPIRES(self) -> timedelta:
        return timedelta(days=self.JWT_ACCESS_TOKEN_EXPIRES_DAYS)

    @property
    def MAX_CONTENT_LENGTH(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def AVATAR_FOLDER(self) -> str:
        return os.path.join(self.UPLOAD_FOLDER, "avatars")

    @property
    def cors_origins(self) -> List[str]:
        """ALLOWED_ORIGINS as a list; ["*"] when unset or wildcarded."""
        origins = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        return ["*"] if not origins or "*" in origins else origins

    @property
    def admin_emails(self) -> set:
        return {e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()}

    @property
    def paddle_api_base(self) -> str:
        return "https://sandbox-api.paddle.com" if self.PADDLE_SANDBOX else "https://api.paddle.com"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    def ensure_storage_dirs(self) -> None:
        for folder in (self.UPLOAD_FOLDER, self.OUTPUT_FOLDER, self.RECORDINGS_FOLDER, self.AVATAR_FOLDER, "data"):
            os.makedirs(folder, exist_ok=True)


settings = Settings()

if settings.DISABLE_SSL_VERIFY:
    ssl._create_default_https_context = ssl._create_unverified_context

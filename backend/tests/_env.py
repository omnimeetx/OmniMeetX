"""
Shared test environment. Import this BEFORE anything from `app`, because the
app reads its settings once at import time.

- throwaway SQLite database and storage folders (never your real data)
- a dummy Resend key: tests intercept every email, nothing is really sent
- a known Paddle webhook secret so signed webhooks can be tested
"""
import os
import sys
import tempfile

TMP_DIR = tempfile.mkdtemp(prefix="omnimeetx-test-")

os.environ.setdefault("SQLALCHEMY_DATABASE_URI", f"sqlite:///{TMP_DIR}/test.db".replace("\\", "/"))
for _folder in ("UPLOAD_FOLDER", "OUTPUT_FOLDER", "RECORDINGS_FOLDER"):
    os.environ.setdefault(_folder, os.path.join(TMP_DIR, _folder.split("_")[0].lower()))

os.environ["ENVIRONMENT"] = "test"
# Never reach real outside services from tests, whatever backend/.env says:
# the real database and file storage (Supabase) and error reports (Sentry).
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SECRET_KEY"] = ""
os.environ["SUPABASE_DB_URL"] = ""
os.environ["SENTRY_DSN"] = ""
os.environ["RESEND_API_KEY"] = "re_test_dummy_key"
os.environ["EMAIL_FROM"] = "OmniMeetX Test <test@example.com>"
os.environ["CONTACT_EMAIL"] = "support@example.com"
os.environ["PADDLE_WEBHOOK_SECRET"] = "pdl_test_secret"
os.environ["CLERK_SECRET_KEY"] = ""  # Clerk is simulated in tests, never called for real
os.environ["PADDLE_API_KEY"] = "pdl_sdbx_apikey_test"  # Paddle API calls are intercepted
os.environ["PADDLE_PRO_MONTHLY_PRICE_ID"] = "pri_pro_month"
os.environ["PADDLE_PRO_YEARLY_PRICE_ID"] = "pri_pro_year"
os.environ["PADDLE_PREMIUM_MONTHLY_PRICE_ID"] = "pri_premium_month"
os.environ["PADDLE_PREMIUM_YEARLY_PRICE_ID"] = "pri_premium_year"
os.environ["ADMIN_EMAILS"] = "admin@example.com"
os.environ["PADDLE_SANDBOX"] = "true"
os.environ["RATE_LIMIT_AUTH_PER_MINUTE"] = "1000"

# Make `app` importable when run as `python tests/<file>.py`
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

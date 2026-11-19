"""
OmniMeetX - One-time verification codes.
Codes are emailed (see services/email.py). There is no SMS provider: phone
verification was removed to avoid per-message SMS costs.
"""
import secrets


def generate_otp() -> str:
    """Random 6-digit code from a cryptographically secure source."""
    return f"{secrets.randbelow(1_000_000):06d}"

"""
OmniMeetX - Input validators.
"""
import re

EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


def validate_email(email):
    """Validate email format."""
    return bool(EMAIL_PATTERN.match(email or ""))

"""
OmniMeetX - make a database URL safe to parse.

Supabase hands out connection strings with the password pasted in as typed.
A password containing @ : / ? or # then breaks parsing (an @ makes part of the
password look like the host name). Everything before the LAST @ is user and
password, so encode the password and leave the rest untouched. Passwords that
are already percent-encoded stay the same.
"""
from urllib.parse import quote, unquote


def safe_db_url(url: str) -> str:
    if not url or url.startswith("sqlite") or "://" not in url:
        return url
    scheme, rest = url.split("://", 1)
    if scheme == "postgres":  # some dashboards still give the old scheme name
        scheme = "postgresql"
    if "@" not in rest:
        return f"{scheme}://{rest}"
    credentials, host_and_path = rest.rsplit("@", 1)
    if ":" in credentials:
        user, password = credentials.split(":", 1)
        credentials = f"{user}:{quote(unquote(password), safe='')}"
    return f"{scheme}://{credentials}@{host_and_path}"

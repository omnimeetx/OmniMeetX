"""
OmniMeetX - Supabase Storage for recordings and profile pictures.

The server's own disk is only a working copy: on a host like Render it is wiped
on every redeploy. Recordings are kept in a private bucket and played back
through short-lived signed links; profile pictures go to a public bucket because
<img> tags can't send a token.

Without SUPABASE_URL and SUPABASE_SECRET_KEY everything stays on local disk,
which is how development works.

Uses Supabase's plain HTTP API (no extra SDK). The secret key never leaves the
server.
"""
import logging
import mimetypes
import os
from typing import Iterable, Optional
from urllib.parse import quote

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

AVATAR_BUCKET = "avatars"
TIMEOUT = 30
UPLOAD_TIMEOUT = 600  # big recordings on a slow link
# Supabase's free plan refuses single files over 50 MB; keep a margin.
MAX_STORED_BYTES = 45 * 1024 * 1024

_buckets_ready: set = set()


class StorageError(RuntimeError):
    """Supabase Storage refused or could not be reached."""


def enabled() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY)


def _base() -> str:
    return settings.SUPABASE_URL.rstrip("/") + "/storage/v1"


def _headers(extra: Optional[dict] = None) -> dict:
    key = settings.SUPABASE_SECRET_KEY
    headers = {"apikey": key}
    # Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys go in apikey only.
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    if extra:
        headers.update(extra)
    return headers


def _path(key: str) -> str:
    return quote(key.lstrip("/"), safe="/")


def _check(resp: requests.Response, action: str) -> requests.Response:
    if resp.status_code >= 400:
        try:
            detail = resp.json().get("message") or resp.text[:200]
        except ValueError:
            detail = resp.text[:200]
        raise StorageError(f"{action} failed: HTTP {resp.status_code}: {detail}")
    return resp


def ensure_bucket(bucket: str, public: bool = False) -> None:
    """Create the bucket once if it doesn't exist. Cheap after the first call."""
    if bucket in _buckets_ready:
        return
    resp = requests.get(f"{_base()}/bucket/{bucket}", headers=_headers(), timeout=TIMEOUT)
    if resp.status_code >= 400:
        created = requests.post(
            f"{_base()}/bucket",
            headers=_headers({"Content-Type": "application/json"}),
            json={"id": bucket, "name": bucket, "public": public},
            timeout=TIMEOUT,
        )
        # 409 / "already exists": another worker made it first.
        if created.status_code >= 400 and "exist" not in created.text.lower():
            _check(created, f"create bucket {bucket}")
    _buckets_ready.add(bucket)


def put_file(local_path: str, key: str, bucket: Optional[str] = None, public: bool = False) -> str:
    """Upload (or replace) a file. Returns the key."""
    bucket = bucket or settings.SUPABASE_BUCKET
    ensure_bucket(bucket, public=public)
    content_type = mimetypes.guess_type(local_path)[0] or "application/octet-stream"
    with open(local_path, "rb") as fh:
        resp = requests.post(
            f"{_base()}/object/{bucket}/{_path(key)}",
            headers=_headers({"Content-Type": content_type, "x-upsert": "true", "cache-control": "3600"}),
            data=fh,
            timeout=UPLOAD_TIMEOUT,
        )
    _check(resp, f"upload {key}")
    return key


def download_file(key: str, local_path: str, bucket: Optional[str] = None) -> str:
    """Fetch a stored file back to local disk (e.g. to reprocess after a redeploy)."""
    bucket = bucket or settings.SUPABASE_BUCKET
    with requests.get(f"{_base()}/object/{bucket}/{_path(key)}", headers=_headers(), stream=True, timeout=UPLOAD_TIMEOUT) as resp:
        _check(resp, f"download {key}")
        os.makedirs(os.path.dirname(local_path) or ".", exist_ok=True)
        tmp = local_path + ".part"
        with open(tmp, "wb") as fh:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):
                fh.write(chunk)
        os.replace(tmp, local_path)
    return local_path


def signed_url(key: str, expires_in: int = 3600, bucket: Optional[str] = None) -> str:
    """A link that plays the private file for `expires_in` seconds, then stops working."""
    bucket = bucket or settings.SUPABASE_BUCKET
    resp = requests.post(
        f"{_base()}/object/sign/{bucket}/{_path(key)}",
        headers=_headers({"Content-Type": "application/json"}),
        json={"expiresIn": expires_in},
        timeout=TIMEOUT,
    )
    _check(resp, f"sign {key}")
    signed = resp.json().get("signedURL") or resp.json().get("signedUrl")
    if not signed:
        raise StorageError(f"sign {key} failed: no URL in the answer")
    return signed if signed.startswith("http") else _base() + signed


def public_url(key: str, bucket: str = AVATAR_BUCKET) -> str:
    return f"{_base()}/object/public/{bucket}/{_path(key)}"


def delete_files(keys: Iterable[str], bucket: Optional[str] = None) -> None:
    keys = [k for k in keys if k]
    if not keys:
        return
    bucket = bucket or settings.SUPABASE_BUCKET
    resp = requests.delete(
        f"{_base()}/object/{bucket}",
        headers=_headers({"Content-Type": "application/json"}),
        json={"prefixes": keys},
        timeout=TIMEOUT,
    )
    _check(resp, f"delete {len(keys)} file(s)")


def recording_key(user_id: int, filename: str) -> str:
    """Recordings are grouped per account: <user id>/<file name>."""
    return f"{user_id}/{os.path.basename(filename)}"

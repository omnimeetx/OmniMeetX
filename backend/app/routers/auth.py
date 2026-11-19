"""
OmniMeetX - Auth Router
All authentication, verification, profile, and 2FA endpoints.
"""
import os
import hmac
import uuid
import random
import asyncio
import secrets
import logging
from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.permissions import is_admin, require_admin
from app.core.security import (
    create_access_token,
    decode_token,
    get_current_user_id,
    hash_password,
    verify_password,
)
from app.db import get_db
from app.models import User
from app.services import clerk, storage, email as email_service
from app.services.email import send_verification_email
from app.services.otp import generate_otp
from app.utils.validators import validate_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


VERIFICATION_CODE_TTL = timedelta(minutes=10)


def _find_user_by_email(db: Session, email: str):
    """Case-insensitive lookup: Ali@Gmail.com and ali@gmail.com are one account."""
    return db.query(User).filter(func.lower(User.email) == (email or "").strip().lower()).first()


def _issue_verification_code(db: Session, user: User) -> bool:
    """Store a fresh email code on the user and send it. Returns True if emailed."""
    code = generate_otp()
    user.email_otp = code
    user.otp_expiry = datetime.now(timezone.utc) + VERIFICATION_CODE_TTL
    db.commit()
    return send_verification_email(user.email, user.full_name, code)


# ===================== REGISTER =====================
@router.post("/register")
async def register(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    if not data or not all(data.get(k) for k in ("full_name", "email", "password")):
        raise HTTPException(400, detail={"error": "Missing required fields"})

    email = data["email"].strip().lower()
    if not validate_email(email):
        raise HTTPException(400, detail={"error": "Invalid email format"})

    if _find_user_by_email(db, email):
        raise HTTPException(400, detail={"error": "Email already registered"})

    new_user = User(
        full_name=data["full_name"].strip(),
        email=email,
        password_hash=hash_password(data["password"]),
        email_verified=False,
        is_verified=False,
        password_updated_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    email_sent = await run_in_threadpool(_issue_verification_code, db, new_user)

    return {
        "message": "Registration successful. We sent a 6-digit code to your email.",
        "email": new_user.email,
        "email_sent": email_sent,
    }


# ===================== VERIFY EMAIL CODE =====================
@router.post("/verify-otp")
async def verify_otp(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    code = str((data or {}).get("email_otp") or "").strip()
    if not data or not data.get("email") or not code:
        raise HTTPException(400, detail={"error": "Missing email or verification code"})

    user = _find_user_by_email(db, data["email"])
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    expiry = user.otp_expiry
    if expiry:
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expiry:
            raise HTTPException(401, detail={"error": "Code has expired. Please request a new one."})

    if not user.email_otp or not hmac.compare_digest(user.email_otp, code):
        raise HTTPException(401, detail={"error": "Invalid verification code"})

    user.email_verified = True
    user.is_verified = True
    user.email_otp = None
    user.otp_expiry = None
    db.commit()

    token = create_access_token(identity=str(user.id))
    return {
        "access_token": token,
        "user": {"id": user.id, "full_name": user.full_name, "email": user.email, "is_admin": is_admin(user)},
        "message": "Verification successful",
    }


# ===================== RESEND VERIFICATION CODE =====================
@router.post("/resend-verification")
async def resend_verification(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    email = (data or {}).get("email")
    if not email:
        raise HTTPException(400, detail={"error": "Email is required"})

    user = _find_user_by_email(db, email)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})
    if user.is_verified:
        return {"message": "This account is already verified. Please sign in.", "email_sent": False}

    email_sent = await run_in_threadpool(_issue_verification_code, db, user)
    return {"message": "A new verification code has been sent to your email.", "email_sent": email_sent}


@router.post("/resend-otp")
async def resend_otp(request: Request, db: Session = Depends(get_db)):
    return await resend_verification(request, db)


# ===================== LOGIN =====================
@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    if not data or not all(k in data for k in ("email", "password")):
        raise HTTPException(400, detail={"error": "Missing required fields"})

    user = _find_user_by_email(db, data["email"])
    if not user:
        raise HTTPException(404, detail={"error": "Email not registered"})

    if not verify_password(user.password_hash, data["password"]):
        raise HTTPException(401, detail={"error": "Incorrect password"})

    if not user.is_verified:
        raise HTTPException(403, detail={"error": "Account not verified", "code": "not_verified"})

    if user.two_factor_enabled:
        two_factor_pin = data.get("two_factor_pin")
        if not two_factor_pin:
            return {"status": "2fa_required", "message": "Two-factor authentication required", "email": user.email}
        if not verify_password(user.two_factor_pin_hash, two_factor_pin):
            raise HTTPException(401, detail={"error": "Incorrect 2FA PIN"})

    if not user.is_active:
        if user.deactivated_at:
            deactivated_at = user.deactivated_at
            if deactivated_at.tzinfo is None:  # the DB hands datetimes back without a timezone
                deactivated_at = deactivated_at.replace(tzinfo=timezone.utc)
            window_expiry = deactivated_at + timedelta(days=30)
            if datetime.now(timezone.utc) > window_expiry:
                raise HTTPException(403, detail={
                    "error": "Account deactivation permanent",
                    "code": "account_expired",
                    "message": "The 30-day reactivation period has expired.",
                })
            user.is_active = True
            user.deactivated_at = None
            db.commit()
        else:
            user.is_active = True
            db.commit()

    token = create_access_token(identity=str(user.id))
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "two_factor_enabled": user.two_factor_enabled,
            "has_2fa_pin": bool(user.two_factor_pin_hash),
            "is_admin": is_admin(user),
        },
    }


# ===================== REFRESH =====================
@router.post("/refresh")
async def refresh(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    new_token = create_access_token(identity=str(user_id))
    return {
        "access_token": new_token,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "two_factor_enabled": user.two_factor_enabled,
            "has_2fa_pin": bool(user.two_factor_pin_hash),
            "is_admin": is_admin(user),
        },
        "expires_in": 30 * 24 * 60 * 60,
    }


# ===================== FORGOT PASSWORD =====================
@router.post("/forgot-password")
async def forgot_password(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        email = data.get("email")
        if not email:
            raise HTTPException(400, detail={"error": "Email is required"})

        user = _find_user_by_email(db, email)
        if not user:
            await asyncio.sleep(random.uniform(0.1, 0.5))
            return {"message": "If your email is registered, you will receive a password reset link."}

        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiry = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
        db.commit()

        if email_service.email_configured():
            try:
                await run_in_threadpool(email_service.send_password_reset_email, email, user.full_name, token)
            except Exception as e:
                logger.error(f"Failed to send reset email: {e}")
                raise HTTPException(500, detail={"error": "Failed to send reset email"})
        else:
            logger.info(f"RESET TOKEN for {email}: {token}")

        return {"message": "If your email is registered, you will receive a password reset link."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(500, detail={"error": "Internal server error"})


# ===================== RESET PASSWORD =====================
@router.post("/reset-password")
async def reset_password(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        token = data.get("token")
        new_password = data.get("new_password")
        if not token or not new_password:
            raise HTTPException(400, detail={"error": "Missing token or password"})

        user = db.query(User).filter_by(reset_token=token).first()
        if not user:
            raise HTTPException(400, detail={"error": "Invalid or expired token"})

        if user.reset_token_expiry < datetime.now(timezone.utc).replace(tzinfo=None):
            raise HTTPException(400, detail={"error": "Token has expired"})

        user.password_hash = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.commit()

        return {"message": "Password reset successfully. You can now login."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(500, detail={"error": "Internal server error"})


# ===================== FORGOT PIN =====================
@router.post("/forgot-pin")
async def forgot_pin(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        email = data.get("email")
        if not email:
            raise HTTPException(400, detail={"error": "Email is required"})

        user = _find_user_by_email(db, email)
        if not user:
            await asyncio.sleep(random.uniform(0.1, 0.5))
            return {"message": "If your account is configured for 2FA, you will receive a PIN reset link."}

        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiry = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
        db.commit()

        if email_service.email_configured():
            try:
                await run_in_threadpool(email_service.send_pin_reset_email, email, user.full_name, token)
            except Exception as e:
                logger.error(f"Failed to send PIN reset email: {e}")
                raise HTTPException(500, detail={"error": "Failed to send reset email"})
        else:
            logger.info(f"PIN RESET TOKEN for {email}: {token}")

        return {"message": "If your email is registered, you will receive a PIN reset link."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot PIN error: {e}")
        raise HTTPException(500, detail={"error": "Internal server error"})


# ===================== RESET PIN =====================
@router.post("/reset-pin")
async def reset_pin(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        token = data.get("token")
        new_pin = data.get("new_pin")
        if not token or not new_pin:
            raise HTTPException(400, detail={"error": "Missing token or PIN"})
        if len(new_pin) != 6 or not new_pin.isdigit():
            raise HTTPException(400, detail={"error": "PIN must be 6 digits"})

        user = db.query(User).filter_by(reset_token=token).first()
        if not user:
            raise HTTPException(400, detail={"error": "Invalid or expired token"})

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if user.reset_token_expiry < now:
            raise HTTPException(400, detail={"error": "Token has expired"})

        user.two_factor_pin_hash = hash_password(new_pin)
        user.reset_token = None
        user.reset_token_expiry = None
        user.two_factor_enabled = True
        db.commit()

        return {"message": "Security PIN reset successfully. You can now login."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset PIN error: {e}")
        raise HTTPException(500, detail={"error": "Internal server error"})


def _signed_in_user_id(request: Request):
    """The user id from a valid Bearer token on this request, or None."""
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    try:
        return int(decode_token(header[7:].strip()).get("sub"))
    except Exception:
        return None


# ===================== VERIFY CREDENTIALS =====================
@router.post("/verify-credentials")
async def verify_credentials(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        email = data.get("email")
        password = data.get("password")

        response = {"email_exists": False, "password_correct": False, "is_verified": False}

        if email:
            user = _find_user_by_email(db, email)
            if user:
                response["email_exists"] = True
                response["is_verified"] = user.is_verified
                response["email_verified"] = user.email_verified
                # Only answer "is this password right?" for a signed-in person checking their own
                # account (Settings confirms the current password). Answering anyone turned this
                # into a password-guessing door next to the rate-limited login.
                if password and _signed_in_user_id(request) == user.id and verify_password(user.password_hash, password):
                    response["password_correct"] = True

        return response
    except Exception as e:
        logger.error(f"Credential verification error: {e}")
        raise HTTPException(500, detail={"error": "Verification failed"})


# ===================== PROFILE =====================
@router.get("/profile")
async def get_profile(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "password_updated_at": user.password_updated_at.isoformat() if user.password_updated_at else None,
        "two_factor_enabled": user.two_factor_enabled,
        "has_2fa_pin": bool(user.two_factor_pin_hash),
        "is_admin": is_admin(user),
    }


@router.put("/profile")
async def update_profile(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    data = await request.json()
    if "full_name" in data:
        user.full_name = data["full_name"]
    if "bio" in data:
        user.bio = data["bio"]
    if "two_factor_enabled" in data:
        if data["two_factor_enabled"] and not user.two_factor_pin_hash:
            raise HTTPException(400, detail={"error": "Please set a 2FA PIN first"})
        user.two_factor_enabled = data["two_factor_enabled"]

    db.commit()
    return {
        "message": "Profile updated successfully",
        "user": {"id": user.id, "full_name": user.full_name, "email": user.email, "phone_number": user.phone_number, "bio": user.bio, "avatar_url": user.avatar_url, "two_factor_enabled": user.two_factor_enabled},
    }


@router.put("/profile/password")
async def change_password(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    data = await request.json()
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    if not current_password or not new_password:
        raise HTTPException(400, detail={"error": "Missing current or new password"})
    if not verify_password(user.password_hash, current_password):
        raise HTTPException(401, detail={"error": "Incorrect current password"})
    if verify_password(user.password_hash, new_password):
        raise HTTPException(400, detail={"error": "password old", "message": "New password cannot be the same as the current password"})

    user.password_hash = hash_password(new_password)
    user.password_updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Password changed successfully", "password_updated_at": user.password_updated_at.isoformat()}


@router.put("/profile/2fa-pin")
async def update_2fa_pin(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    data = await request.json()
    current_pin = data.get("current_pin")
    new_pin = data.get("pin")

    if user.two_factor_pin_hash:
        if not current_pin:
            raise HTTPException(400, detail={"error": "Current PIN is required to change your PIN"})
        if not verify_password(user.two_factor_pin_hash, current_pin):
            raise HTTPException(401, detail={"error": "Incorrect current PIN"})

    if not new_pin or len(new_pin) != 6 or not new_pin.isdigit():
        raise HTTPException(400, detail={"error": "New PIN must be 6 digits"})

    user.two_factor_pin_hash = hash_password(new_pin)
    db.commit()

    return {"message": "2FA PIN updated successfully"}


@router.post("/profile/verify-2fa-pin")
async def verify_2fa_pin(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    data = await request.json()
    pin = data.get("pin")
    if not pin:
        raise HTTPException(400, detail={"error": "PIN is required"})

    if verify_password(user.two_factor_pin_hash, pin):
        return {"success": True, "message": "PIN verified"}
    raise HTTPException(401, detail={"success": False, "error": "Incorrect PIN"})


@router.delete("/profile")
async def delete_account(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    user.is_active = False
    user.deactivated_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Account deactivated successfully"}


# ===================== AVATAR =====================
ALLOWED_AVATAR_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


@router.post("/avatar")
async def upload_avatar(request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})

    form = await request.form()
    file = form.get("avatar")
    if file is None or not getattr(file, "filename", None):
        raise HTTPException(400, detail={"error": "No image provided"})

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(400, detail={"error": "Please upload a PNG, JPG, WEBP or GIF image"})

    contents = await file.read()
    if len(contents) > settings.MAX_AVATAR_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, detail={"error": f"Image must be under {settings.MAX_AVATAR_SIZE_MB}MB"})

    os.makedirs(settings.AVATAR_FOLDER, exist_ok=True)
    filename = f"{user_id}_{uuid.uuid4().hex[:12]}{ext}"
    local_avatar = os.path.join(settings.AVATAR_FOLDER, filename)
    with open(local_avatar, "wb") as f:
        f.write(contents)
    previous = user.avatar_url or ""

    if storage.enabled():
        # The server disk is wiped on redeploy, so pictures live in a public bucket.
        try:
            key = f"{user_id}/{filename}"
            await run_in_threadpool(storage.put_file, local_avatar, key, storage.AVATAR_BUCKET, True)
            user.avatar_url = storage.public_url(key)
        except Exception as e:
            logger.error(f"Avatar upload to storage failed for user {user_id}: {e}")
            raise HTTPException(502, detail={"error": "Couldn't save your picture right now. Please try again."})
        finally:
            try:
                os.remove(local_avatar)
            except OSError:
                pass
    else:
        base_url = (settings.BACKEND_PUBLIC_URL or str(request.base_url)).rstrip("/")
        user.avatar_url = f"{base_url}/media/avatars/{filename}"
    db.commit()

    # Remove the previous upload (never touches external Google/Clerk URLs)
    if "/media/avatars/" in previous:
        old = os.path.join(settings.AVATAR_FOLDER, os.path.basename(previous))
        if os.path.isfile(old):
            try:
                os.remove(old)
            except OSError:
                pass
    elif f"/object/public/{storage.AVATAR_BUCKET}/" in previous and storage.enabled():
        try:
            storage.delete_files([previous.split(f"/object/public/{storage.AVATAR_BUCKET}/", 1)[1]], bucket=storage.AVATAR_BUCKET)
        except Exception as e:
            logger.warning(f"Old avatar not deleted for user {user_id}: {e}")

    return {
        "message": "Profile picture updated",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "two_factor_enabled": user.two_factor_enabled,
            "has_2fa_pin": bool(user.two_factor_pin_hash),
            "is_admin": is_admin(user),
        },
    }


# ===================== KEEP A SESSION ALIVE =====================
@router.post("/refresh")
async def refresh_session(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Swap a still-valid token for a fresh one. The app calls this while someone is
    using it, so a session only ends after JWT_ACCESS_TOKEN_EXPIRES_DAYS without activity.
    """
    user = db.query(User).get(user_id)
    if not user or not user.is_active:
        raise HTTPException(401, detail={"error": "Please log in again"})
    return {"access_token": create_access_token(user.id), "expires_in_days": settings.JWT_ACCESS_TOKEN_EXPIRES_DAYS}


# ===================== CHECK / VALIDATE =====================
@router.get("/check")
async def check_auth(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})
    return {"valid": True, "user_id": user_id, "user_email": user.email, "user_name": user.full_name}


@router.get("/validate")
async def validate_token(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, detail={"error": "User not found"})
    return {"valid": True, "user": {"id": user.id, "full_name": user.full_name, "email": user.email}}


# ===================== CLERK / GOOGLE OAUTH SYNC =====================
@router.post("/clerk-sync")
async def clerk_sync(request: Request, db: Session = Depends(get_db)):
    """
    Exchange a Clerk (Google sign-in) session for an OmniMeetX token.

    The caller must send its Clerk session token as `Authorization: Bearer ...`.
    Identity (email, name, picture) comes from Clerk after verifying that token —
    never from the request body, which anyone could forge to log in as someone else.
    """
    auth_header = request.headers.get("Authorization", "")
    clerk_token = auth_header[7:].strip() if auth_header.lower().startswith("bearer ") else ""
    if not clerk_token:
        raise HTTPException(401, detail={"error": "Missing Clerk session token", "code": "clerk_token_missing"})

    try:
        identity = await run_in_threadpool(clerk.verified_identity, clerk_token)
    except clerk.ClerkNotConfigured as e:
        logger.error(f"Google sign-in unavailable: {e}")
        raise HTTPException(503, detail={"error": "Google sign-in is not configured on this server"})
    except clerk.ClerkAuthError as e:
        logger.warning(f"Rejected Clerk sign-in: {e}")
        raise HTTPException(401, detail={"error": "Could not verify your Google sign-in", "code": "clerk_token_invalid"})
    except requests.RequestException as e:
        logger.error(f"Clerk API unreachable: {e}")
        raise HTTPException(502, detail={"error": "Google sign-in is temporarily unavailable"})

    email = identity["email"]
    full_name = identity["full_name"] or email.split("@")[0]
    avatar_url = identity["avatar_url"]
    phone_number = identity["phone_number"]
    if phone_number and db.query(User).filter(User.phone_number == phone_number).first():
        phone_number = None  # already on another account; the column is unique

    user = _find_user_by_email(db, email)

    if not user:
        # Create new user provisioned via Google/Clerk OAuth
        random_pwd = secrets.token_urlsafe(32)
        user = User(
            full_name=full_name,
            email=email,
            phone_number=phone_number,
            password_hash=hash_password(random_pwd),
            email_verified=True,
            phone_verified=True if phone_number else False,
            is_verified=True,
            is_active=True,
            avatar_url=avatar_url,
            plan="free",
            credits_remaining=60,
            credits_total=60,
            password_updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Created new user via Google/Clerk OAuth: {email} (id={user.id})")
    else:
        # User already exists - ensure they are marked verified & active
        user.is_verified = True
        user.email_verified = True
        user.is_active = True
        if not user.full_name and full_name:
            user.full_name = full_name
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        db.commit()
        logger.info(f"Synced existing user via Google/Clerk OAuth: {email} (id={user.id})")

    # Issue access token for all OmniMeetX API & LiveKit features
    token = create_access_token(identity=str(user.id))

    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "plan": user.plan or "free",
            "credits_remaining": user.credits_remaining or 60,
            "is_verified": user.is_verified,
            "avatar_url": user.avatar_url or avatar_url,
            "is_admin": is_admin(user),
        },
    }


# ===================== ALL USERS (ADMIN / USER LIST) =====================
@router.get("/users")
async def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admins only: every registered user with plan and usage status."""
    users = db.query(User).order_by(User.id.desc()).all()
    return {
        "users": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "phone_number": u.phone_number,
                "plan": u.plan or "free",
                "credits_remaining": u.credits_remaining or 0,
                "credits_total": u.credits_total or 60,
                "is_verified": u.is_verified,
                "is_active": u.is_active,
                "subscription_status": u.subscription_status or "none",
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }


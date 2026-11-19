"""
OmniMeetX - Live room presence & lobby registry.

Tracks who is *currently connected* to each meeting room, who is waiting in the
lobby for host approval, and which socket id belongs to whom. This is live
presence, so it is intentionally in-process and rebuilt from socket events —
the durable record of a room lives in the meeting_rooms table.

All mutations go through a lock because Socket.IO handlers run concurrently.
"""
import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_lock = threading.RLock()

# room_id -> {"participants": {user_id: info}, "lobby": {user_id: info}, "host_id": str}
_rooms: Dict[str, Dict[str, Any]] = {}

# sid -> {"room_id": str, "user_id": str, "in_lobby": bool}
_sids: Dict[str, Dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _blank_room(host_id: Optional[str] = None) -> Dict[str, Any]:
    return {
        "participants": {},
        "lobby": {},
        "host_id": str(host_id) if host_id is not None else None,
        "created_at": _now(),
    }


def ensure_room(room_id: str, host_id: Optional[str] = None) -> Dict[str, Any]:
    with _lock:
        room = _rooms.get(room_id)
        if room is None:
            room = _blank_room(host_id)
            _rooms[room_id] = room
        elif host_id is not None and room.get("host_id") is None:
            room["host_id"] = str(host_id)
        return room


def _participant_record(user_id: str, user_name: str, sid: str, **extra) -> Dict[str, Any]:
    return {
        "id": str(user_id),
        "name": user_name,
        "email": extra.get("user_email", ""),
        "sid": sid,
        "is_audio_enabled": extra.get("is_audio_enabled", True),
        "is_video_enabled": extra.get("is_video_enabled", True),
        "is_screen_sharing": False,
        "is_speaking": False,
        "is_hand_raised": False,
        "is_bot": extra.get("is_bot", False),
        "is_teacher": extra.get("is_teacher", False),
        "is_host": extra.get("is_host", False),
        "speaking_time": 0,
        "connection_quality": "good",
        "quiz_score": 0,
        "correct_answers": 0,
        "total_attempts": 0,
        "joined_at": _now(),
    }


def add_to_lobby(room_id: str, user_id: str, user_name: str, sid: str, **extra) -> Dict[str, Any]:
    """Park a user in the lobby awaiting host approval."""
    with _lock:
        room = ensure_room(room_id)
        record = _participant_record(user_id, user_name, sid, **extra)
        record["requested_at"] = _now()
        room["lobby"][str(user_id)] = record
        _sids[sid] = {"room_id": room_id, "user_id": str(user_id), "in_lobby": True}
        return record


def admit(room_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Move a user from the lobby into the room. Returns their record."""
    with _lock:
        room = ensure_room(room_id)
        record = room["lobby"].pop(str(user_id), None)
        if record is None:
            return None
        record["joined_at"] = _now()
        room["participants"][str(user_id)] = record
        sid = record.get("sid")
        if sid in _sids:
            _sids[sid]["in_lobby"] = False
        return record


def reject(room_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Remove a user from the lobby without admitting them."""
    with _lock:
        room = _rooms.get(room_id)
        if not room:
            return None
        record = room["lobby"].pop(str(user_id), None)
        if record and record.get("sid") in _sids:
            _sids.pop(record["sid"], None)
        return record


def add_participant(room_id: str, user_id: str, user_name: str, sid: str, **extra) -> Dict[str, Any]:
    """Add a user straight into the room (host, or approval not required)."""
    with _lock:
        room = ensure_room(room_id)
        record = _participant_record(user_id, user_name, sid, **extra)
        room["participants"][str(user_id)] = record
        _sids[sid] = {"room_id": room_id, "user_id": str(user_id), "in_lobby": False}
        if record["is_host"] and room.get("host_id") is None:
            room["host_id"] = str(user_id)
        return record


def remove_by_sid(sid: str) -> Optional[Dict[str, Any]]:
    """
    Clean up on disconnect. Returns
    {"room_id", "user_id", "in_lobby", "record"} or None if the sid is unknown.
    """
    with _lock:
        meta = _sids.pop(sid, None)
        if not meta:
            return None
        room = _rooms.get(meta["room_id"])
        if not room:
            return {**meta, "record": None}

        user_id = meta["user_id"]
        record = None

        # Only drop the user if this sid is still the one we have on file — a
        # reconnect may already have registered a newer sid for them.
        for bucket in ("participants", "lobby"):
            existing = room[bucket].get(user_id)
            if existing is not None and existing.get("sid") == sid:
                record = room[bucket].pop(user_id)
                break

        if not room["participants"] and not room["lobby"]:
            _rooms.pop(meta["room_id"], None)

        return {**meta, "record": record}


def remove_participant(room_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        room = _rooms.get(room_id)
        if not room:
            return None
        record = room["participants"].pop(str(user_id), None)
        if record and record.get("sid"):
            _sids.pop(record["sid"], None)
        if not room["participants"] and not room["lobby"]:
            _rooms.pop(room_id, None)
        return record


def update_participant(room_id: str, user_id: str, **fields) -> Optional[Dict[str, Any]]:
    with _lock:
        room = _rooms.get(room_id)
        if not room:
            return None
        record = room["participants"].get(str(user_id))
        if record is None:
            return None
        record.update(fields)
        return record


def get_participant(room_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        room = _rooms.get(room_id)
        return room["participants"].get(str(user_id)) if room else None


def get_room(room_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        return _rooms.get(room_id)


def is_admitted(room_id: str, user_id: str) -> bool:
    with _lock:
        room = _rooms.get(room_id)
        return bool(room and str(user_id) in room["participants"])


def sid_meta(sid: str) -> Optional[Dict[str, Any]]:
    with _lock:
        meta = _sids.get(sid)
        return dict(meta) if meta else None


def host_sids(room_id: str) -> List[str]:
    """Socket ids of everyone in the room flagged as host/teacher."""
    with _lock:
        room = _rooms.get(room_id)
        if not room:
            return []
        return [
            p["sid"]
            for p in room["participants"].values()
            if (p.get("is_host") or p.get("is_teacher")) and p.get("sid")
        ]


def pending_list(room_id: str) -> List[Dict[str, Any]]:
    with _lock:
        room = _rooms.get(room_id)
        if not room:
            return []
        return [
            {
                "userId": p["id"],
                "userName": p["name"],
                "userEmail": p.get("email", ""),
                "requestedAt": p.get("requested_at"),
            }
            for p in room["lobby"].values()
        ]


def public_state(room_id: str) -> Dict[str, Any]:
    """Snapshot broadcast to clients as `meeting-state`."""
    with _lock:
        room = _rooms.get(room_id)
        if not room:
            return {"meetingId": room_id, "participants": {}, "pending": [], "hostId": None}
        participants = {
            uid: {k: v for k, v in rec.items() if k != "sid"}
            for uid, rec in room["participants"].items()
        }
        return {
            "meetingId": room_id,
            "participants": participants,
            "pending": pending_list(room_id),
            "hostId": room.get("host_id"),
        }


def reset():
    """Test helper — wipe all state."""
    with _lock:
        _rooms.clear()
        _sids.clear()

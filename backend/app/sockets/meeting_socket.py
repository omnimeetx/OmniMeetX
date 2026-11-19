"""
OmniMeetX - Meeting room Socket.IO handlers.

Owns presence, the host-approval lobby, and the relay of in-meeting events
(chat, captions, quiz, reactions, media state). Audio/video media itself does
NOT flow through here — that is carried by LiveKit; this server only decides
*who is allowed in* and keeps everyone's UI in sync.

Event names mirror exactly what the frontend emits/listens for; see
frontend/app/meeting/[id]/components/utils/socketUtils.ts
"""
import logging
from typing import Any, Dict, Optional

from app.db import SessionLocal
from app.models import MeetingRoom
from app.services import room_state as rs

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _room_record(room_id: str) -> Optional[Dict[str, Any]]:
    """Load the durable room row (host + approval policy) from the database."""
    db = SessionLocal()
    try:
        row = db.query(MeetingRoom).filter(MeetingRoom.room_id == room_id).first()
        if not row:
            return None
        return {
            "host_user_id": str(row.host_user_id),
            "requires_approval": bool(row.requires_approval),
            "title": row.title,
            "is_active": bool(row.is_active),
        }
    except Exception as e:
        logger.error(f"Failed to load meeting room {room_id}: {e}")
        return None
    finally:
        db.close()


def _authed_user_id(environ_or_sid_meta: Dict[str, Any]) -> Optional[str]:
    """Pull the verified user id stashed on the socket session at connect time."""
    return environ_or_sid_meta.get("auth_user_id") if environ_or_sid_meta else None


def register_handlers(sio):
    """Attach every meeting-room handler to the given AsyncServer."""

    async def _broadcast_state(room_id: str):
        await sio.emit("meeting-state", rs.public_state(room_id), room=room_id)

    async def _notify_hosts_of_lobby(room_id: str):
        """Push the current pending list to every connected host."""
        pending = rs.pending_list(room_id)
        for host_sid in rs.host_sids(room_id):
            await sio.emit("approval-requested", {"pending": pending}, to=host_sid)

    async def _relay(event: str, sid: str, data: dict, *, include_sender: bool = False):
        """Forward an event to everyone else in the sender's room."""
        room_id = (data or {}).get("meetingId") or (data or {}).get("meeting_id")
        if not room_id:
            meta = rs.sid_meta(sid)
            room_id = meta.get("room_id") if meta else None
        if not room_id:
            return
        await sio.emit(
            event,
            data,
            room=room_id,
            skip_sid=None if include_sender else sid,
        )

    # -----------------------------------------------------------------------
    # Connection lifecycle
    # -----------------------------------------------------------------------
    @sio.event
    async def connect(sid, environ, auth=None):
        """
        Verify the JWT from the handshake so we know who this socket really is.
        We never trust a client-supplied userId for host decisions.
        """
        from urllib.parse import parse_qs
        from app.core.security import decode_token

        query = parse_qs(environ.get("QUERY_STRING", ""))
        token = (auth or {}).get("token") if isinstance(auth, dict) else None
        if not token:
            token = (query.get("token") or [None])[0]

        auth_user_id = None
        if token:
            try:
                payload = decode_token(token)
                auth_user_id = str(payload.get("sub"))
            except Exception as e:
                logger.warning(f"Socket {sid} sent an invalid token: {e}")

        await sio.save_session(sid, {"auth_user_id": auth_user_id})
        logger.info(f"Client connected: {sid} (user={auth_user_id or 'anonymous'})")

    @sio.event
    async def disconnect(sid):
        removed = rs.remove_by_sid(sid)
        logger.info(f"Client disconnected: {sid}")
        if not removed:
            return

        room_id = removed["room_id"]
        record = removed.get("record")

        if record and not removed.get("in_lobby"):
            await sio.emit(
                "participant-left",
                {"userId": record["id"], "userName": record["name"]},
                room=room_id,
            )
            await _broadcast_state(room_id)
        elif removed.get("in_lobby"):
            # Someone gave up waiting — refresh the host's pending list.
            await _notify_hosts_of_lobby(room_id)

    # -----------------------------------------------------------------------
    # Join / lobby / approval
    # -----------------------------------------------------------------------
    @sio.on("join-meeting")
    async def join_meeting(sid, data):
        """
        Handles the frontend's `join-meeting`.

        Host  -> admitted immediately.
        Guest -> parked in the lobby; the host gets `approval-requested`.
        """
        data = data or {}
        room_id = data.get("meetingId") or data.get("meeting_id")
        if not room_id:
            await sio.emit("join-rejected", {"message": "No meeting id supplied"}, to=sid)
            return

        session = await sio.get_session(sid)
        auth_user_id = _authed_user_id(session)
        # Fall back to the client-supplied id only when the socket is unauthenticated
        # (dev/local). Host status below is still decided against the database.
        user_id = str(auth_user_id or data.get("userId") or sid)
        user_name = data.get("userName") or "Guest"
        user_email = data.get("userEmail") or ""

        room = _room_record(room_id)
        if room is None:
            # Unknown room id — treat the first arrival as the host so ad-hoc
            # rooms created before this table existed still work.
            logger.warning(f"Room {room_id} not in DB; first joiner becomes host")
            room = {"host_user_id": user_id, "requires_approval": True, "is_active": True}

        if not room.get("is_active", True):
            await sio.emit("join-rejected", {"message": "This meeting has ended"}, to=sid)
            return

        is_host = bool(auth_user_id) and str(auth_user_id) == room["host_user_id"]
        # Unauthenticated dev sockets fall back to the claimed id.
        if not auth_user_id and str(data.get("userId")) == room["host_user_id"]:
            is_host = True

        rs.ensure_room(room_id, host_id=room["host_user_id"])

        already_in = rs.is_admitted(room_id, user_id)
        needs_approval = room["requires_approval"] and not is_host and not already_in

        if needs_approval:
            rs.add_to_lobby(
                room_id, user_id, user_name, sid,
                user_email=user_email, is_bot=bool(data.get("isBot")),
            )
            hosts = rs.host_sids(room_id)
            await sio.emit(
                "waiting-approval",
                {
                    "meetingId": room_id,
                    "message": (
                        "Waiting for the host to let you in..."
                        if hosts
                        else "Waiting for the host to start the meeting..."
                    ),
                    "hostPresent": bool(hosts),
                },
                to=sid,
            )
            await _notify_hosts_of_lobby(room_id)
            logger.info(f"{user_name} ({user_id}) is waiting in the lobby of {room_id}")
            return

        # Admitted: host, or a room that does not gate entry.
        await _admit_user(
            sid, room_id, user_id, user_name,
            user_email=user_email,
            is_host=is_host,
            is_bot=bool(data.get("isBot")),
        )

    async def _admit_user(sid, room_id, user_id, user_name, *, user_email="",
                          is_host=False, is_bot=False):
        await sio.enter_room(sid, room_id)
        record = rs.add_participant(
            room_id, user_id, user_name, sid,
            user_email=user_email, is_host=is_host, is_teacher=is_host, is_bot=is_bot,
        )

        await sio.emit(
            "join-approved",
            {
                "meetingId": room_id,
                "userId": user_id,
                "userName": user_name,
                "isHost": is_host,
            },
            to=sid,
        )
        await sio.emit(
            "participant-joined",
            {
                "userId": record["id"],
                "userName": record["name"],
                "userEmail": record.get("email", ""),
                "isTeacher": record.get("is_teacher", False),
                "isBot": record.get("is_bot", False),
            },
            room=room_id,
            skip_sid=sid,
        )
        await _broadcast_state(room_id)

        # A host arriving late needs to see anyone already queued up.
        if is_host:
            await _notify_hosts_of_lobby(room_id)

        logger.info(f"{user_name} ({user_id}) joined {room_id} (host={is_host})")

    @sio.on("approve-join-request")
    async def approve_join_request(sid, data):
        data = data or {}
        room_id = data.get("meetingId")
        target_user = str(data.get("userId", ""))
        if not room_id or not target_user:
            return

        if sid not in rs.host_sids(room_id):
            logger.warning(f"Non-host {sid} tried to approve {target_user} in {room_id}")
            return

        pending = rs.get_room(room_id)
        record = pending["lobby"].get(target_user) if pending else None
        if not record:
            return

        target_sid = record["sid"]
        rs.admit(room_id, target_user)
        await sio.enter_room(target_sid, room_id)

        await sio.emit(
            "join-approved",
            {"meetingId": room_id, "userId": target_user,
             "userName": record["name"], "isHost": False},
            to=target_sid,
        )
        await sio.emit(
            "participant-joined",
            {
                "userId": target_user,
                "userName": record["name"],
                "userEmail": record.get("email", ""),
                "isTeacher": False,
                "isBot": record.get("is_bot", False),
            },
            room=room_id,
            skip_sid=target_sid,
        )
        await _broadcast_state(room_id)
        await _notify_hosts_of_lobby(room_id)
        logger.info(f"Host admitted {record['name']} into {room_id}")

    @sio.on("reject-join-request")
    async def reject_join_request(sid, data):
        data = data or {}
        room_id = data.get("meetingId")
        target_user = str(data.get("userId", ""))
        if not room_id or not target_user:
            return

        if sid not in rs.host_sids(room_id):
            logger.warning(f"Non-host {sid} tried to reject {target_user} in {room_id}")
            return

        record = rs.reject(room_id, target_user)
        if record:
            await sio.emit(
                "join-rejected",
                {"meetingId": room_id,
                 "message": data.get("message") or "The host declined your request to join"},
                to=record["sid"],
            )
        await _notify_hosts_of_lobby(room_id)

    @sio.on("leave-meeting")
    async def leave_meeting(sid, data):
        data = data or {}
        room_id = data.get("meetingId") or data.get("meeting_id")
        meta = rs.sid_meta(sid)
        if not room_id and meta:
            room_id = meta["room_id"]
        if not room_id:
            return

        user_id = str(data.get("userId") or (meta or {}).get("user_id") or "")
        record = rs.remove_participant(room_id, user_id)
        await sio.leave_room(sid, room_id)

        await sio.emit(
            "participant-left",
            {"userId": user_id, "userName": (record or {}).get("name", "Someone")},
            room=room_id,
        )
        await _broadcast_state(room_id)

    # -----------------------------------------------------------------------
    # Media state (the actual media rides on LiveKit; these keep UI in sync)
    # -----------------------------------------------------------------------
    @sio.on("audio-toggle")
    async def audio_toggle(sid, data):
        data = data or {}
        room_id = data.get("meetingId")
        if room_id:
            rs.update_participant(room_id, str(data.get("userId", "")),
                                  is_audio_enabled=bool(data.get("enabled")))
        await _relay("audio-toggle", sid, data)

    @sio.on("video-toggle")
    async def video_toggle(sid, data):
        data = data or {}
        room_id = data.get("meetingId")
        if room_id:
            rs.update_participant(room_id, str(data.get("userId", "")),
                                  is_video_enabled=bool(data.get("enabled")))
        await _relay("video-toggle", sid, data)

    @sio.on("hand-toggle")
    async def hand_toggle(sid, data):
        data = data or {}
        room_id = data.get("meetingId")
        if room_id:
            rs.update_participant(room_id, str(data.get("userId", "")),
                                  is_hand_raised=bool(data.get("isRaised")))
        await _relay("hand-toggle", sid, data)

    @sio.on("screen-share-start")
    async def screen_share_start(sid, data):
        data = data or {}
        room_id = data.get("meetingId")
        if room_id:
            rs.update_participant(room_id, str(data.get("userId", "")), is_screen_sharing=True)
        await _relay("screen-share-start", sid, data)

    @sio.on("screen-share-stop")
    async def screen_share_stop(sid, data):
        data = data or {}
        room_id = data.get("meetingId")
        if room_id:
            rs.update_participant(room_id, str(data.get("userId", "")), is_screen_sharing=False)
        await _relay("screen-share-stop", sid, data)

    # -----------------------------------------------------------------------
    # Chat, captions, reactions
    # -----------------------------------------------------------------------
    @sio.on("chat-message")
    async def chat_message(sid, data):
        await _relay("chat-message", sid, data)

    @sio.on("message-reaction")
    async def message_reaction(sid, data):
        await _relay("message-reaction", sid, data)

    @sio.on("pin-message")
    async def pin_message(sid, data):
        await _relay("pin-message", sid, data)

    @sio.on("reaction")
    async def reaction(sid, data):
        await _relay("reaction", sid, data)
        await _relay("emoji-reaction", sid, data)

    @sio.on("caption")
    async def caption(sid, data):
        await _relay("caption", sid, data)

    @sio.on("user-focus-change")
    async def user_focus_change(sid, data):
        await _relay("user-focus-change", sid, data)

    # -----------------------------------------------------------------------
    # Quiz
    # -----------------------------------------------------------------------
    @sio.on("quiz-start")
    async def quiz_start(sid, data):
        await _relay("quiz-start", sid, data, include_sender=True)

    @sio.on("quiz-started")
    async def quiz_started(sid, data):
        await _relay("quiz-start", sid, data, include_sender=True)

    @sio.on("quiz-question")
    async def quiz_question(sid, data):
        await _relay("quiz-question", sid, data, include_sender=True)

    @sio.on("quiz-answer")
    async def quiz_answer(sid, data):
        await _relay("quiz-answer", sid, data)

    @sio.on("quiz-complete")
    async def quiz_complete(sid, data):
        await _relay("quiz-results", sid, data, include_sender=True)

    @sio.on("quiz-ended")
    async def quiz_ended(sid, data):
        await _relay("quiz-results", sid, data, include_sender=True)

    # -----------------------------------------------------------------------
    # Misc passthroughs
    # -----------------------------------------------------------------------
    @sio.on("summon-bot")
    async def summon_bot(sid, data):
        await _relay("summon-bot", sid, data, include_sender=True)

    @sio.on("media-chunk")
    async def media_chunk(sid, data):
        # Recording chunks are uploaded over HTTP; this is a no-op keepalive.
        return

    @sio.on("activity_update")
    async def activity_update(sid, data):
        await _relay("activity_update", sid, data)

    logger.info("Meeting Socket.IO handlers registered")

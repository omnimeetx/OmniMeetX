"""
OmniMeetX - Real-time Socket.IO server (presence, lobby, in-meeting events).
Audio/video media does not pass through here — LiveKit carries it.
"""
from typing import List

import socketio

from app.sockets.meeting_socket import register_handlers


def create_socket_server(allowed_origins: List[str]) -> socketio.AsyncServer:
    sio = socketio.AsyncServer(
        async_mode="asgi",
        cors_allowed_origins="*" if allowed_origins == ["*"] else allowed_origins,
        ping_timeout=60,
        ping_interval=25,
    )
    register_handlers(sio)
    return sio

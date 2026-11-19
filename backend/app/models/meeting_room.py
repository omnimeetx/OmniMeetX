"""
OmniMeetX - Live meeting room model.
"""
import json
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey

from app.db.base import Base


class MeetingRoom(Base):
    """
    A live meeting room (the thing behind a share link).

    Previously this lived in an in-process dict, which meant rooms vanished on
    restart and `created_by` fell back to whoever asked — so every joiner was
    told they were the host. Persisting it makes the host/lobby flow reliable
    across restarts and multiple workers.
    """
    __tablename__ = "meeting_rooms"

    id = Column(Integer, primary_key=True)
    room_id = Column(String(64), unique=True, nullable=False, index=True)
    host_user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    title = Column(String(200), nullable=False)
    settings = Column(Text, default="{}")
    requires_approval = Column(Boolean, default=True)
    auto_record = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)

    def settings_dict(self) -> dict:
        try:
            return json.loads(self.settings or "{}")
        except (ValueError, TypeError):
            return {}

    def to_dict(self) -> dict:
        return {
            "id": self.room_id,
            "room_id": self.room_id,
            "title": self.title,
            "created_by": self.host_user_id,
            "requires_approval": bool(self.requires_approval),
            "auto_record": bool(self.auto_record),
            "is_active": bool(self.is_active),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "settings": {
                "auto_record": bool(self.auto_record),
                "requires_approval": bool(self.requires_approval),
                **self.settings_dict(),
            },
        }

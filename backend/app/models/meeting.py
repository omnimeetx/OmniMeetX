"""
OmniMeetX - Meeting model (an uploaded/recorded file and its AI results).
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Index

from app.db.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    title = Column(String(200), nullable=False)
    filename = Column(String(200), nullable=False)
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String(50), default="uploaded")  # recording | uploaded | processing | completed | failed | cancelled
    transcription = Column(Text, default="{}")
    notes = Column(Text, default="{}")
    language = Column(String(10), default="auto")             # spoken; "auto" = detect
    transcript_language = Column(String(10), default="auto")  # output; "auto" = same as spoken
    has_transcription = Column(Boolean, default=False)
    has_notes = Column(Boolean, default=False)
    processing_steps = Column(Text, default="[]")
    current_step_progress = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)

    # Extended fields
    filepath = Column(String(500))
    storage_path = Column(String(500), nullable=True)  # key in the Supabase recordings bucket, when stored there
    source_url = Column(String(1000), nullable=True)  # the link it was imported from (YouTube etc.), shown as the video on the notes page
    media_kind = Column(String(10), nullable=True)  # audio | video, read from the file; picks the player on the notes page
    transcript = Column(Text)
    duration = Column(Float, default=0.0)
    participants_count = Column(Integer, default=0)
    source = Column(String(50), default="upload")  # upload | url | meeting_room | live
    participant_mapping = Column(Text, default="{}")

    # Meeting room link & recording lifecycle
    meeting_room_id = Column(String(200), nullable=True)
    recording_started_at = Column(DateTime, nullable=True)

    # Video recording
    video_webm_path = Column(String(500))
    video_mp4_path = Column(String(500))
    has_video = Column(Boolean, default=False)
    video_duration = Column(Float, default=0.0)

    __table_args__ = (
        Index("idx_user_id", "user_id"),
        Index("idx_upload_date", "upload_date"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "filename": self.filename,
            "filepath": self.filepath,
            "language": self.language,
            "transcript_language": self.transcript_language,
            "transcript": self.transcript[:500] if self.transcript else None,
            "status": self.status,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "duration": self.duration,
            "participants_count": self.participants_count,
            "has_recording": bool(self.filepath or self.storage_path),
            "is_favorite": self.is_favorite,
        }

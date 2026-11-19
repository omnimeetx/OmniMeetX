"""
OmniMeetX - Media conversion helpers (FFmpeg).
"""
import json
import logging
import math
import os
import subprocess

logger = logging.getLogger(__name__)


def estimate_duration_minutes(filepath: str) -> int:
    """
    Estimate audio duration in minutes (rounded up) — the unit we bill in.
    Uses ffprobe when available; falls back to file-size heuristic.
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", filepath],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0 and result.stdout.strip():
            seconds = float(result.stdout.strip())
            return max(1, math.ceil(seconds / 60))
    except Exception:
        pass
    # Fallback: assume ~1 MB per minute for compressed audio
    try:
        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        return max(1, math.ceil(size_mb))
    except Exception:
        return 1  # minimum 1 minute


def detect_media_kind(path: str):
    """
    "video" when the file has a real picture track, "audio" otherwise, None if
    ffprobe can't read it. Judged from the content, not the name: a voice
    recording from the browser is .webm just like a camera recording, and an
    MP3's album art is a picture stream that doesn't make it a video.
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type:stream_disposition=attached_pic",
             "-of", "json", path],
            capture_output=True, text=True, timeout=30,
        )
        streams = json.loads(result.stdout or "{}").get("streams", [])
    except Exception as e:
        logger.warning(f"Could not read media streams of {os.path.basename(path)}: {e}")
        return None
    if any(s.get("codec_type") == "video" and not (s.get("disposition") or {}).get("attached_pic") for s in streams):
        return "video"
    if any(s.get("codec_type") == "audio" for s in streams):
        return "audio"
    return None


def extract_audio_mp3(video_path: str, audio_path: str) -> bool:
    """Pull the audio track out of a video as 128k MP3."""
    command = ['ffmpeg', '-y', '-i', video_path, '-vn', '-acodec', 'libmp3lame', '-ab', '128k', audio_path]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        logger.error(f"Audio extraction failed: {result.stderr}")
        return False
    return True


def compact_playback_audio(source_path: str, out_path: str) -> bool:
    """Small mono 64k MP3 for playback: about 0.5 MB a minute, so long meetings fit storage limits."""
    command = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", source_path,
               "-vn", "-ac", "1", "-ar", "22050", "-b:a", "64k", out_path]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        logger.error(f"Playback audio failed: {result.stderr[:300]}")
        return False
    return True


def convert_to_mp4(input_path, output_path):
    """Convert video to MP4 using FFmpeg."""
    try:
        command = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            logger.error(f"FFmpeg conversion failed: {result.stderr}")
            return False
        return True
    except Exception as e:
        logger.error(f"Error executing FFmpeg: {e}")
        return False

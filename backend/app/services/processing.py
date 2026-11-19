"""
OmniMeetX - Processing Pipeline
Full transcription/translation/AI pipeline that runs in background threads.
"""
import os
import re
import json
import time
import uuid
import logging
import threading

from app.core.languages import language_name
from app.db import SessionLocal
from app.models import Meeting, User
from app.services import billing, transcription
from app.services.activity import log_activity
from app.services.ai import call_ai_patiently
from app.services.media import detect_media_kind, estimate_duration_minutes, extract_audio_mp3
from app.services.notes_format import text_list
from app.services import recordings
from app.services.progress import initial_processing_steps, update_processing_step, simulate_step_progress
from app.services.text_analysis import (
    cleanup_transcript,
    extract_comprehensive_content,
    parse_ai_json,
    process_long_transcript_in_chunks,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

UTTERANCE_TRANSLATION_BATCH = 20


def translate_utterances(utterances, target_lang_name):
    """
    Translate utterance texts in place, in numbered batches.

    Numbering lets us confirm the model returned exactly the lines we sent; a
    batch that comes back with the wrong count keeps its original text rather
    than shifting every subsequent line onto the wrong timestamp.
    """
    for start in range(0, len(utterances), UTTERANCE_TRANSLATION_BATCH):
        batch = [u for u in utterances[start:start + UTTERANCE_TRANSLATION_BATCH] if u.get("text")]
        if not batch:
            continue

        numbered = "\n".join(f"{i + 1}. {u['text']}" for i, u in enumerate(batch))
        prompt = (
            f"Translate each numbered line into {target_lang_name}.\n"
            f"Return EXACTLY {len(batch)} lines, each starting with its original "
            f"number and a period, in the same order.\n"
            f"Do not merge, split, add, or drop lines. Do not add commentary.\n\n"
            f"{numbered}"
        )

        try:
            raw = call_ai_patiently(prompt, feature_name="utterance_translation").text

            parsed = {}
            for line in raw.splitlines():
                line = line.strip()
                if not line or "." not in line[:5]:
                    continue
                num, _, rest = line.partition(".")
                if num.strip().isdigit():
                    parsed[int(num.strip())] = rest.strip()

            if len(parsed) != len(batch):
                logger.warning(
                    f"Translation batch at {start} returned {len(parsed)} of "
                    f"{len(batch)} lines — keeping originals"
                )
                continue

            for i, u in enumerate(batch):
                text = parsed.get(i + 1, "").strip()
                if text:
                    u["text"] = text

        except Exception as e:
            logger.warning(f"Translation batch at {start} failed, keeping originals: {e}")


def reset_for_retry(db, meeting) -> None:
    """Put a meeting back in the queue-ready state so start_processing will claim it."""
    meeting.status = "uploaded"
    meeting.processing_steps = json.dumps(initial_processing_steps())
    meeting.current_step_progress = 0
    db.commit()


INTERRUPTED_MESSAGE = "Processing stopped because the server restarted. Press Retry. The minutes were returned."


def _naive_utc(value):
    """Ledger rows and step timestamps may come back with or without a timezone."""
    from datetime import datetime, timezone
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def fail_interrupted_meetings(active_ids: set[int]) -> int:
    """
    Meetings left in 'processing' by a server process that no longer exists can never
    finish, and Retry refuses a meeting that is 'processing'. Mark them failed and give
    back the minutes charged for the run that was cut off (only that run: an earlier
    run that completed was a fair charge). Safe to run twice: refunds are keyed.
    """
    from datetime import timedelta
    from app.models import CreditLedger

    db = SessionLocal()
    released = 0
    try:
        for meeting in db.query(Meeting).filter(Meeting.status == "processing").all():
            if meeting.id in active_ids:
                continue
            try:
                steps = json.loads(meeting.processing_steps or "[]")
            except Exception:
                steps = []
            started = [_naive_utc(s["timestamp"]) for s in steps if s.get("timestamp")]
            if started:
                run_began = min(started) - timedelta(seconds=5)
                charges = (
                    db.query(CreditLedger)
                    .filter(CreditLedger.meeting_id == meeting.id,
                            CreditLedger.idempotency_key.like(f"process-{meeting.id}-%"),
                            CreditLedger.change < 0)
                    .all()
                )
                for charge in charges:
                    if _naive_utc(charge.created_at) < run_began:
                        continue
                    attempt_id = charge.idempotency_key.rsplit("-", 1)[-1]
                    billing.refund_credits(db, meeting.user_id, -charge.change, meeting_id=meeting.id,
                                           idempotency_key=f"refund-{meeting.id}-{attempt_id}")
            for step in steps:
                if step.get("status") == "in_progress":
                    update_processing_step(db, meeting, step["step"], "failed", INTERRUPTED_MESSAGE)
                    break
            meeting.status = "failed"
            db.commit()
            log_activity(db, meeting.user_id, "failed", f"Failed: {meeting.title}", INTERRUPTED_MESSAGE,
                         meeting.id, {"error": "interrupted"})
            released += 1
        if released:
            logger.warning(f"Released {released} meeting(s) interrupted by a restart")
        return released
    finally:
        db.close()


def _claim(db, meeting_id) -> bool:
    """
    Atomically move a meeting from 'uploaded' to 'processing'.

    Only one job can win this, so a duplicate trigger (the processing page
    re-requesting, a double click, two server workers) can never transcribe
    and bill the same file twice.
    """
    claimed = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.status == "uploaded")
        .update({"status": "processing"}, synchronize_session=False)
    )
    db.commit()
    return bool(claimed)


def start_processing(meeting_id):
    """Full processing pipeline — runs in a background thread."""
    logger.info(f"Starting processing thread for meeting ID: {meeting_id}")

    db = SessionLocal()
    credits_deducted = 0
    # Unique per run: a retry is a new run and is billed again; the same run is never billed twice.
    attempt_id = uuid.uuid4().hex[:12]
    try:
        if not _claim(db, meeting_id):
            logger.info(f"Meeting {meeting_id} is not awaiting processing (already running or done) — skipping")
            return

        meeting = db.query(Meeting).get(meeting_id)
        if not meeting:
            logger.error(f"Meeting {meeting_id} not found")
            return

        try:
            meeting.processing_steps = json.dumps(initial_processing_steps())
            meeting.current_step_progress = 0
            db.commit()
            # Show movement at once; preparing the file is part of transcribing it.
            update_processing_step(db, meeting, "transcription", "in_progress")
            progress_thread = threading.Thread(
                target=simulate_step_progress,
                args=(SessionLocal, meeting_id, "transcription", 20),
            )
            progress_thread.daemon = True
            progress_thread.start()

            # Log processing activity
            log_activity(
                db_session=db,
                user_id=meeting.user_id,
                activity_type="processing",
                title=f"Processing: {meeting.title}",
                description=f"Started processing {meeting.filename}",
                meeting_id=meeting.id,
                metadata={"filename": meeting.filename, "title": meeting.title},
            )

            # Local working copy (fetched back from Supabase Storage after a redeploy),
            # and a durable copy in storage before any minutes are spent on it.
            filepath = recordings.ensure_local(meeting)
            if not meeting.media_kind:
                meeting.media_kind = detect_media_kind(filepath)
                db.commit()
            recordings.store_in_background(meeting.id, filepath)

            # ----- Credit metering -----
            estimated_minutes = estimate_duration_minutes(filepath)
            credit_check = billing.check_credits(db, meeting.user_id, estimated_minutes)
            if not credit_check["ok"]:
                raise Exception(
                    f"Insufficient credits: {credit_check['remaining']} min remaining, "
                    f"{estimated_minutes} min required. Please upgrade your plan."
                )
            deduct_result = billing.deduct_credits(
                db, meeting.user_id, estimated_minutes,
                reason="processing",
                meeting_id=meeting.id,
                idempotency_key=f"process-{meeting.id}-{attempt_id}",
            )
            credits_deducted = estimated_minutes if deduct_result["ok"] else 0
            logger.info(f"Credits reserved: {credits_deducted} min for meeting {meeting_id}")

            # `language` is what is SPOKEN in the file ("auto" = detect it);
            # `transcript_language` is what the transcript and notes are written
            # in ("auto" = same as spoken). Transcribing with the output language
            # instead of the spoken one turned Urdu speech into garbled English.
            spoken_lang = (meeting.language or transcription.AUTO).lower()
            transcript_lang = (meeting.transcript_language or transcription.AUTO).lower()
            logger.info(f"Processing: spoken={spoken_lang}, output={transcript_lang}")

            # ----- Step 1: Transcription (marked in progress at the start) -----
            logger.info("Starting transcription...")

            raw_text = ""
            translated_text = ""
            optimized_text = ""
            utterances = []

            # ----- Transcription -----
            # Routing lives in app/services/transcription.py: languages that
            # AssemblyAI's high-accuracy model covers go there; the rest
            # (Urdu included) go to Groq Whisper / Gemini, which are dramatically
            # more accurate on them than AssemblyAI's Nano fallback.
            meeting_source = meeting.source or 'upload'
            try:
                participant_mapping = json.loads(meeting.participant_mapping or '{}')
            except Exception:
                participant_mapping = {}

            user = db.query(User).get(meeting.user_id)
            creator_name = user.full_name if user else "Speaker A"

            logger.info(f"Transcribing '{meeting.filename}' (spoken language: {spoken_lang})")

            try:
                asr = transcription.transcribe(
                    filepath,
                    spoken_lang,
                    diarize=True,
                    # Speaker names are only displayed for live meetings (below).
                    label_speakers=(meeting_source == 'live'),
                )
            except transcription.TranscriptionError as e:
                raise Exception(f"Transcription failed: {e}")

            raw_text = asr.text
            detected_lang = asr.language or (spoken_lang if spoken_lang != transcription.AUTO else "en")
            if spoken_lang == transcription.AUTO:
                meeting.language = detected_lang
            if transcript_lang == transcription.AUTO:
                transcript_lang = detected_lang
            meeting.transcript_language = transcript_lang
            db.commit()
            logger.info(
                f"Transcribed with {asr.provider}: {len(raw_text)} chars, "
                f"lang={detected_lang}, diarized={asr.diarized}, corrected={asr.corrected}"
            )

            # Build the utterance list the rest of the pipeline expects.
            # Speaker names are only shown for live meetings, matching the
            # previous behaviour.
            utterances = []
            for u in asr.utterances:
                label = ""
                if meeting_source == 'live' and u.speaker:
                    label = creator_name if u.speaker == 'A' else f"Speaker {u.speaker}"
                utterances.append({
                    "speaker": label,
                    "text": u.text,
                    "start": u.start,
                    "end": u.end,
                    "words": [
                        {"text": w.text, "start": w.start, "end": w.end}
                        for w in u.words
                        if w.text
                    ],
                })

            progress_thread.join(timeout=18)
            update_processing_step(db, meeting, "transcription", "success")
            time.sleep(1)

            # ----- Step 2: Translation -----
            logger.info(f"Starting translation from {detected_lang} to {transcript_lang}...")
            update_processing_step(db, meeting, "translation", "in_progress")
            progress_thread = threading.Thread(
                target=simulate_step_progress,
                args=(SessionLocal, meeting_id, "translation", 10),
            )
            progress_thread.daemon = True
            progress_thread.start()

            if raw_text and transcript_lang != detected_lang:
                try:
                    target_lang_name = language_name(transcript_lang)
                    translation_prompt = f"""
You are a professional translator. Translate the following transcript into {target_lang_name}.
Maintain the same paragraph structure and speaker labels if present.
Do not add any explanations or notes, return ONLY the translated text.

TRANSCRIPT:
{raw_text}
"""
                    response = call_ai_patiently(translation_prompt, feature_name="translation")
                    translated_text = response.text.strip()
                    logger.info(f"Translation successful. Length: {len(translated_text)}")

                    # Utterances are translated in numbered batches. This used to
                    # be one API call per utterance, which meant a 200-segment
                    # meeting fired 200 requests and burned the daily quota in a
                    # single upload.
                    if utterances:
                        translate_utterances(utterances, target_lang_name)
                except Exception as eval_err:
                    logger.error(f"Translation failed: {eval_err}")
                    translated_text = raw_text
            else:
                translated_text = raw_text

            progress_thread.join(timeout=12)
            update_processing_step(db, meeting, "translation", "success")
            time.sleep(1)

            # ----- Step 3: Optimization -----
            logger.info("Starting optimization...")
            update_processing_step(db, meeting, "optimization", "in_progress")
            progress_thread = threading.Thread(
                target=simulate_step_progress,
                args=(SessionLocal, meeting_id, "optimization", 8),
            )
            progress_thread.daemon = True
            progress_thread.start()

            if utterances:
                optimized_lines = []
                for u in utterances:
                    # Pass the language so English-only filler stripping is
                    # not applied to Urdu/other transcripts.
                    u["text"] = cleanup_transcript(u["text"], transcript_lang)
                    if u["text"]:
                        if u['speaker']:
                            optimized_lines.append(f"{u['speaker']}: {u['text']}")
                        else:
                            optimized_lines.append(u['text'])
                optimized_text = "\n".join(optimized_lines)
            else:
                optimized_text = cleanup_transcript(translated_text, transcript_lang)

            meaningful_sentences, topics, key_phrases = extract_comprehensive_content(optimized_text)
            progress_thread.join(timeout=10)
            update_processing_step(db, meeting, "optimization", "success")
            time.sleep(1)

            # ----- Step 4: AI Generation -----
            target_lang_name = language_name(transcript_lang)
            logger.info(f"Starting AI generation in {target_lang_name}...")
            update_processing_step(db, meeting, "ai_generation", "in_progress")
            progress_thread = threading.Thread(
                target=simulate_step_progress,
                args=(SessionLocal, meeting_id, "ai_generation", 20),
            )
            progress_thread.daemon = True
            progress_thread.start()

            improved_prompt = f"""
You are an expert meeting/video analyst. Analyze the full transcript carefully and extract detailed structured insights.

MEETING: {meeting.title}
TRANSCRIPT ({len(optimized_text)} characters):
{optimized_text}

INSTRUCTIONS:
1. Read the entire transcript carefully.
2. Write a comprehensive summary in {target_lang_name} proportional to transcript length.
3. Extract key_points in {target_lang_name} — all factual and significant points.
4. Extract action_items in {target_lang_name}. Each one is a plain text string; put the owner and deadline in the text when known, like "Sara: send the contract (Friday)".
5. Extract decisions in {target_lang_name} with full context.
6. Analyze sentiment in {target_lang_name}.

Return ONLY valid JSON:
{{
  "summary": "Comprehensive summary (IN {target_lang_name})",
  "key_points": ["Key point 1 (IN {target_lang_name})", "..."],
  "action_items": ["Action item (IN {target_lang_name})", "..."],
  "decisions": ["Decision (IN {target_lang_name})", "..."],
  "sentiment": "Overall tone (IN {target_lang_name})"
}}

CRITICAL RULES:
- Respond with VALID JSON only.
- ALL responses MUST be in {target_lang_name}.
- Use only transcript content, no external assumptions.
"""

            processed_data = None

            if len(optimized_text) > 30000:
                logger.info("Processing long transcript in chunks")
                processed_data = process_long_transcript_in_chunks(optimized_text, meeting.title)
            else:
                try:
                    response = call_ai_patiently(improved_prompt, feature_name="meeting_notes")
                    processed_data = parse_ai_json(response.text)

                    if not processed_data.get('action_items'):
                        processed_data['action_items'] = ["No specific action items identified."]
                    if not processed_data.get('decisions'):
                        processed_data['decisions'] = ["No formal decisions recorded."]

                except ValueError as e:  # includes json.JSONDecodeError
                    logger.error(f"AI returned unparseable notes: {e}")
                    processed_data = None
                except Exception as e:
                    logger.error(f"AI processing failed: {e}")
                    processed_data = None

            if processed_data:
                # Models sometimes return an item as an object, e.g. {task, owner, deadline}; store plain text.
                for key in ("key_points", "action_items", "decisions"):
                    processed_data[key] = text_list(processed_data.get(key))

            # Fallback: every AI provider failed. Keep the real transcript and
            # say so honestly — never present invented summaries or action
            # items as AI notes.
            if not processed_data:
                logger.warning(f"AI notes unavailable for meeting {meeting_id}; saving transcript with keyword highlights")
                important_keywords = [
                    'decision', 'decided', 'agree', 'approved', 'resolved',
                    'action', 'task', 'follow up', 'next step', 'deadline',
                    'issue', 'problem', 'challenge', 'concern', 'risk',
                    'project', 'initiative', 'proposal', 'plan', 'strategy',
                    'update', 'status', 'progress', 'result', 'outcome',
                    'budget', 'cost', 'resource', 'timeline', 'schedule'
                ]
                sentences = re.split(r'[.!?]+', optimized_text)
                important_sentences = [s.strip() for s in sentences if len(s.strip()) > 20 and any(k in s.lower() for k in important_keywords)]
                key_points_from_content = important_sentences[:30] if important_sentences else []
                if not key_points_from_content and topics:
                    key_points_from_content = [f"Discussion about {topic}" for topic in topics[:20]]

                retry_hint = "AI was unavailable — use Retry to generate this."
                processed_data = {
                    "summary": ("AI notes could not be generated because every AI provider was busy or "
                                "unavailable. Your transcript is saved below — use Retry to generate the notes."),
                    "key_points": key_points_from_content,
                    "action_items": [retry_hint],
                    "decisions": [retry_hint],
                    "sentiment": "",
                    "ai_generated": False,
                }

            processed_data["raw"] = raw_text
            processed_data["translated"] = translated_text

            progress_thread.join(timeout=25)
            update_processing_step(db, meeting, "ai_generation", "success")

            # Save to database
            meeting.transcription = json.dumps({
                "raw": raw_text,
                "translated": translated_text,
                "optimized": optimized_text,
                "utterances": utterances,
            })
            meeting.notes = json.dumps(processed_data)
            meeting.has_transcription = True
            meeting.has_notes = True
            meeting.status = 'completed'
            db.commit()
            db.refresh(meeting)  # the storage upload may have finished in its own thread
            recordings.drop_local_copy(meeting)

            logger.info(f"Processing completed for meeting {meeting_id}")

            log_activity(
                db_session=db,
                user_id=meeting.user_id,
                activity_type="completed",
                title=f"Processed: {meeting.title}",
                description="Meeting analysis completed successfully",
                meeting_id=meeting.id,
                metadata={"filename": meeting.filename},
            )

        except Exception as e:
            logger.error(f"Processing error for meeting {meeting_id}: {e}")

            # Refund credits if we deducted them before the failure
            if credits_deducted > 0:
                try:
                    billing.refund_credits(db, meeting.user_id, credits_deducted, meeting_id=meeting.id,
                                           idempotency_key=f"refund-{meeting.id}-{attempt_id}")
                    logger.info(f"Refunded {credits_deducted} min to user {meeting.user_id}")
                except Exception as refund_err:
                    logger.error(f"Credit refund failed: {refund_err}")

            try:
                steps = json.loads(meeting.processing_steps or '[]')
                for step in steps:
                    if step["status"] == "in_progress":
                        update_processing_step(db, meeting, step["step"], "failed", str(e))
                        break
            except Exception:
                pass
            meeting.status = 'failed'
            db.commit()

            log_activity(
                db_session=db,
                user_id=meeting.user_id,
                activity_type="failed",
                title=f"Failed: {meeting.title}",
                description=str(e),
                meeting_id=meeting.id,
                metadata={"error": str(e)},
            )
    finally:
        db.close()


def process_meeting_video(meeting_id, webm_path):
    """Extract audio from video and start transcription processing."""
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).get(meeting_id)
        if not meeting:
            logger.error(f"Meeting {meeting_id} not found for video processing")
            return

        try:
            audio_path = webm_path.rsplit('.', 1)[0] + '_audio.mp3'
            if not extract_audio_mp3(webm_path, audio_path):
                audio_path = webm_path

            # Copy audio to uploads folder
            audio_filename = os.path.basename(audio_path)
            upload_path = os.path.join(settings.UPLOAD_FOLDER, audio_filename)
            if audio_path != upload_path:
                import shutil
                shutil.copy2(audio_path, upload_path)

            meeting.filename = audio_filename
            meeting.filepath = upload_path
            db.commit()

            start_processing(meeting_id)

        except Exception as e:
            logger.error(f"Video processing error: {e}")
            meeting.status = 'failed'
            db.commit()
    finally:
        db.close()

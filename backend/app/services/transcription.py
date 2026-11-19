"""
OmniMeetX - Speech-to-text with per-language provider routing.

Why this exists
---------------
The pipeline used to send every language to AssemblyAI with
`TranscriptionConfig(language_code=...)`. That is fine for the ~20 languages
AssemblyAI's high-accuracy *Universal/Best* model covers, but Urdu is not one of
them — Urdu only runs on their low-accuracy *Nano* model. The result was exactly
the reported symptom: dropped words and mangled letters.

So we route by language:

    Universal-tier language  ->  AssemblyAI Best  (accurate + speaker labels)
    everything else          ->  Groq whisper-large-v3  (free, fast, far better
                                 than Nano on Urdu and other South Asian langs)

Whisper gives word timestamps but no speaker labels, so when diarization matters
we borrow speaker turn boundaries from AssemblyAI and map Whisper's words onto
them by time overlap — keeping Whisper's superior text.

A final optional LLM pass repairs residual spelling damage without rewriting
meaning. That one is deliberately conservative: it is far worse to invent words
than to leave a small error in.
"""
import json
import logging
import math
import os
import subprocess
import tempfile
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import requests

from app.core.config import settings
from app.core.languages import LANGUAGE_CODE_TO_NAME
from app.services import llm_router

logger = logging.getLogger(__name__)

GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MODEL = "whisper-large-v3"

# Groq caps uploads at 25 MB on the free tier. 16 kHz mono FLAC runs roughly
# 0.5 MB/min, so ~40 min per chunk is safe; we use 20 to leave headroom for
# noisy audio that compresses poorly.
CHUNK_SECONDS = 20 * 60
CHUNK_OVERLAP_SECONDS = 2
GROQ_MAX_UPLOAD_BYTES = 24 * 1024 * 1024


# Languages AssemblyAI's Best/Universal model genuinely supports well.
# Anything outside this set would silently fall back to Nano, so we send it to
# Whisper instead.
ASSEMBLYAI_BEST_LANGUAGES = {
    "en", "es", "fr", "de", "it", "pt", "nl", "hi", "ja", "zh",
    "ko", "ru", "tr", "uk", "vi", "pl", "fi",
}

# Languages where Whisper clearly beats AssemblyAI Nano. Urdu is the reason this
# module exists, but its neighbours have the same problem.
WHISPER_PREFERRED_LANGUAGES = {
    "ur",  # Urdu  <- the reported issue
    "ar", "fa", "ps", "pa", "sd", "bn", "ta", "te", "ml", "kn", "mr",
    "gu", "ne", "si", "am", "he", "th", "id", "ms", "sw", "az", "kk", "uz",
}


@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class Utterance:
    speaker: str
    text: str
    start: float
    end: float
    words: List[Word] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "speaker": self.speaker,
            "text": self.text,
            "start": self.start,
            "end": self.end,
            "words": [{"text": w.text, "start": w.start, "end": w.end} for w in self.words],
        }


@dataclass
class TranscriptionResult:
    text: str
    language: str
    utterances: List[Utterance]
    provider: str
    diarized: bool = False
    corrected: bool = False

    def utterance_dicts(self) -> List[Dict[str, Any]]:
        return [u.to_dict() for u in self.utterances]


class TranscriptionError(RuntimeError):
    pass


# ---------------------------------------------------------------------------
# Audio preparation
# ---------------------------------------------------------------------------
def _ffprobe_duration(path: str) -> float:
    """Duration in seconds, or 0.0 if ffprobe cannot tell us."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120,
        )
        return float(out.stdout.strip())
    except Exception as e:
        logger.warning(f"ffprobe failed for {path}: {e}")
        return 0.0


def extract_audio(src_path: str, dst_path: str, *, start: Optional[float] = None,
                  duration: Optional[float] = None) -> bool:
    """
    Pull a mono 16 kHz FLAC out of any media file.

    16 kHz mono is what Whisper works at internally, so downsampling here costs
    no accuracy and shrinks the upload ~10x. FLAC is lossless, so unlike mp3 it
    adds no compression artefacts for the model to trip over.
    """
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    cmd += ["-i", src_path]
    if duration is not None:
        cmd += ["-t", str(duration)]
    cmd += ["-vn", "-ac", "1", "-ar", "16000", "-c:a", "flac", dst_path]

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        logger.error(f"Audio extraction failed: {result.stderr[:500]}")
        return False
    return os.path.exists(dst_path) and os.path.getsize(dst_path) > 0


# ---------------------------------------------------------------------------
# Groq Whisper
# ---------------------------------------------------------------------------
def _whisper_prompt_for(language: str) -> str:
    """
    A short priming prompt nudges Whisper toward the right script and register.

    For Urdu this matters: without it Whisper sometimes emits Hindi (Devanagari)
    or transliterated Roman text for the same audio.
    """
    prompts = {
        "ur": "یہ اردو زبان میں ایک گفتگو ہے۔ براہ کرم اردو رسم الخط میں لکھیں۔",
        "ar": "هذه محادثة باللغة العربية.",
        "fa": "این یک گفتگو به زبان فارسی است.",
        "hi": "यह हिंदी में एक बातचीत है।",
        "pa": "ਇਹ ਪੰਜਾਬੀ ਵਿੱਚ ਇੱਕ ਗੱਲਬਾਤ ਹੈ।",
        "bn": "এটি বাংলা ভাষায় একটি কথোপকথন।",
    }
    return prompts.get(language, "")


def _transcribe_chunk_groq(audio_path: str, language: str, offset: float) -> Dict[str, Any]:
    """Send one audio chunk to Groq Whisper and return verbose JSON."""
    if not settings.GROQ_API_KEY:
        raise TranscriptionError("GROQ_API_KEY is not set")

    size = os.path.getsize(audio_path)
    if size > GROQ_MAX_UPLOAD_BYTES:
        raise TranscriptionError(
            f"Chunk is {size / 1e6:.1f} MB, over Groq's ~25 MB limit"
        )

    data = {
        "model": GROQ_MODEL,
        "response_format": "verbose_json",
        "timestamp_granularities[]": ["word", "segment"],
        # temperature 0 keeps Whisper from "creatively" filling silence, which
        # is where most hallucinated words come from.
        "temperature": "0",
    }
    if language:
        data["language"] = language
    prompt = _whisper_prompt_for(language)
    if prompt:
        data["prompt"] = prompt

    with open(audio_path, "rb") as fh:
        resp = requests.post(
            GROQ_TRANSCRIBE_URL,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            files={"file": (os.path.basename(audio_path), fh, "audio/flac")},
            data=data,
            timeout=600,
        )

    if resp.status_code == 429:
        raise TranscriptionError(f"Groq rate limit: {resp.text[:200]}")
    if resp.status_code >= 400:
        raise TranscriptionError(f"Groq HTTP {resp.status_code}: {resp.text[:300]}")

    body = resp.json()

    # Shift every timestamp by the chunk's position in the full recording.
    if offset:
        for seg in body.get("segments") or []:
            seg["start"] = seg.get("start", 0) + offset
            seg["end"] = seg.get("end", 0) + offset
        for w in body.get("words") or []:
            w["start"] = w.get("start", 0) + offset
            w["end"] = w.get("end", 0) + offset

    return body


def transcribe_with_whisper(media_path: str, language: str) -> TranscriptionResult:
    """Transcribe any-length media with Groq Whisper, chunking when necessary."""
    duration = _ffprobe_duration(media_path)
    tmpdir = tempfile.mkdtemp(prefix="ttt_asr_")
    segments: List[Dict[str, Any]] = []
    words: List[Dict[str, Any]] = []
    texts: List[str] = []
    detected = language

    try:
        n_chunks = max(1, math.ceil(duration / CHUNK_SECONDS)) if duration else 1
        logger.info(
            f"Whisper: {media_path} ({duration:.0f}s) -> {n_chunks} chunk(s), lang={language}"
        )

        for i in range(n_chunks):
            start = i * CHUNK_SECONDS
            # Overlap slightly so a word straddling a boundary is not lost.
            take = CHUNK_SECONDS + (CHUNK_OVERLAP_SECONDS if i < n_chunks - 1 else 0)
            chunk_path = os.path.join(tmpdir, f"chunk_{i}.flac")

            ok = extract_audio(
                media_path, chunk_path,
                start=start if n_chunks > 1 else None,
                duration=take if n_chunks > 1 else None,
            )
            if not ok:
                raise TranscriptionError(f"Could not extract audio chunk {i}")

            body = _transcribe_chunk_groq(chunk_path, language, offset=start if n_chunks > 1 else 0)

            detected = body.get("language") or detected
            chunk_text = (body.get("text") or "").strip()
            if chunk_text:
                texts.append(chunk_text)
            segments.extend(body.get("segments") or [])
            words.extend(body.get("words") or [])

            try:
                os.remove(chunk_path)
            except OSError:
                pass

    finally:
        try:
            os.rmdir(tmpdir)
        except OSError:
            pass

    full_text = " ".join(texts).strip()
    if not full_text:
        raise TranscriptionError("Whisper returned an empty transcript")

    # Whisper's segments become our utterances; speakers are filled in later
    # if diarization is available.
    utterances: List[Utterance] = []
    for seg in segments:
        seg_text = (seg.get("text") or "").strip()
        if not seg_text:
            continue
        s, e = float(seg.get("start", 0)), float(seg.get("end", 0))
        seg_words = [
            Word(text=(w.get("word") or w.get("text") or "").strip(),
                 start=float(w.get("start", 0)), end=float(w.get("end", 0)))
            for w in words
            if s <= float(w.get("start", 0)) < e
        ]
        utterances.append(Utterance(speaker="", text=seg_text, start=s, end=e, words=seg_words))

    # Normalise Whisper's ISO name ("urdu") back to a code where we can.
    if detected and len(detected) > 3:
        detected = _language_name_to_code(detected) or language

    return TranscriptionResult(
        text=full_text,
        language=detected or language,
        utterances=utterances,
        provider="groq-whisper-large-v3",
    )


def _language_name_to_code(name: str) -> Optional[str]:
    lowered = name.strip().lower()
    for code, display in LANGUAGE_CODE_TO_NAME.items():
        if display.lower() == lowered:
            return code
    return None


# ---------------------------------------------------------------------------
# Gemini native audio
#
# Gemini accepts audio directly and handles Urdu far better than AssemblyAI's
# Nano model. It is the fallback when Groq/Whisper is unavailable, so Urdu still
# gets a decent transcript from the Gemini key alone.
#
# Caveat: it returns no word-level timings, so we ask for segment timestamps in
# a strict format and validate them. If they do not parse cleanly we keep the
# text and drop the timings rather than trusting invented numbers.
# ---------------------------------------------------------------------------
GEMINI_CHUNK_SECONDS = 10 * 60
GEMINI_INLINE_LIMIT = 15 * 1024 * 1024

_TIMESTAMP_LINE = None  # compiled lazily in _parse_timestamped_lines


def _parse_timestamped_lines(raw: str, offset: float, chunk_end: float) -> List[Utterance]:
    """
    Parse `[mm:ss] text` (or `[hh:mm:ss] text`) lines into utterances.

    Rejects the whole parse if timestamps are not monotonically increasing or
    run past the chunk, since that means the model invented them.
    """
    global _TIMESTAMP_LINE
    import re
    if _TIMESTAMP_LINE is None:
        _TIMESTAMP_LINE = re.compile(
            r'^\s*\[?\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\s*\]?\s*(.+)$'
        )

    parsed: List[Utterance] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        m = _TIMESTAMP_LINE.match(line)
        if not m:
            return []
        hh, mm, ss, frac, text = m.groups()
        t = int(hh or 0) * 3600 + int(mm) * 60 + int(ss) + (int(frac or 0) / 1000.0)
        text = text.strip()
        if not text:
            continue
        parsed.append(Utterance(speaker="", text=text, start=offset + t, end=offset + t))

    if not parsed:
        return []

    for a, b in zip(parsed, parsed[1:]):
        if b.start < a.start:
            logger.warning("Gemini timestamps not monotonic — discarding timings")
            return []
        a.end = b.start
    if parsed[-1].start > chunk_end + 1:
        logger.warning("Gemini timestamps overrun the chunk — discarding timings")
        return []
    parsed[-1].end = chunk_end

    return parsed


def _gemini_audio_request(audio: bytes, prompt: str) -> str:
    """
    Send audio + prompt to Gemini. Quotas are per model, so when the main model
    is out of quota the fallback model is tried before giving up.
    """
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    models = [m for m in (settings.GEMINI_MODEL, settings.GEMINI_AUDIO_FALLBACK_MODEL) if m]
    for i, name in enumerate(models):
        try:
            resp = genai.GenerativeModel(name).generate_content(
                [{"mime_type": "audio/mp3", "data": audio}, prompt],
                generation_config={"temperature": 0},
            )
            return (getattr(resp, "text", "") or "").strip()
        except Exception as e:
            out_of_quota = any(t in str(e).lower() for t in ("429", "quota", "exhausted", "rate limit"))
            if out_of_quota and i < len(models) - 1:
                logger.warning(f"Gemini {name} is out of quota for audio; trying {models[i + 1]}")
                continue
            if out_of_quota:
                raise TranscriptionError(f"Gemini quota exhausted: {e}") from e
            raise TranscriptionError(f"Gemini audio request failed: {e}") from e
    return ""


def transcribe_with_gemini(media_path: str, language: str) -> TranscriptionResult:
    """Transcribe with Gemini's native audio understanding."""
    if not settings.GEMINI_API_KEY:
        raise TranscriptionError("GEMINI_API_KEY is not set")

    language_name = LANGUAGE_CODE_TO_NAME.get(language, "the spoken language")
    duration = _ffprobe_duration(media_path)
    n_chunks = max(1, math.ceil(duration / GEMINI_CHUNK_SECONDS)) if duration else 1

    tmpdir = tempfile.mkdtemp(prefix="ttt_gemini_")
    all_utterances: List[Utterance] = []
    texts: List[str] = []

    try:
        for i in range(n_chunks):
            start = i * GEMINI_CHUNK_SECONDS
            chunk_path = os.path.join(tmpdir, f"chunk_{i}.mp3")

            cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
            if n_chunks > 1:
                cmd += ["-ss", str(start)]
            cmd += ["-i", media_path]
            if n_chunks > 1:
                cmd += ["-t", str(GEMINI_CHUNK_SECONDS)]
            cmd += ["-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", chunk_path]

            if subprocess.run(cmd, capture_output=True).returncode != 0:
                raise TranscriptionError(f"Could not extract audio chunk {i}")

            size = os.path.getsize(chunk_path)
            if size > GEMINI_INLINE_LIMIT:
                raise TranscriptionError(
                    f"Audio chunk {i} is {size / 1e6:.1f} MB, too large to send inline"
                )

            with open(chunk_path, "rb") as fh:
                audio = fh.read()

            # The expected language is a HINT, never an instruction to convert.
            # Told to "transcribe in Urdu", Gemini will happily transliterate
            # English speech into Urdu script. Speakers here routinely mix Urdu
            # and English mid-sentence, so each language must keep its own script.
            prompt = (
                "Transcribe this audio verbatim.\n"
                f"The speakers are expected to use {language_name}, but transcribe "
                "EXACTLY what is actually spoken.\n\n"
                "Write one line per sentence or natural pause, each prefixed with its "
                "start timestamp in [mm:ss] format, like:\n"
                "[00:03] first sentence here\n"
                "[00:09] next sentence here\n\n"
                "Rules:\n"
                "- Write each word in the script that word's language normally uses.\n"
                f"- If a passage is spoken in {language_name}, write it in that language's script.\n"
                "- If a passage is spoken in English, write it in English/Latin script.\n"
                "- If speakers switch language mid-sentence, keep each part in its own script.\n"
                "- Never translate or transliterate between scripts.\n"
                "- Do not summarise, correct, or add anything that was not spoken.\n"
                "- If a passage is inaudible, write [inaudible] rather than guessing.\n"
                "- Output only the timestamped lines, no commentary."
            )

            raw = _gemini_audio_request(audio, prompt)

            if not raw:
                continue

            chunk_end = start + min(GEMINI_CHUNK_SECONDS, max(0.0, duration - start) or GEMINI_CHUNK_SECONDS)
            utterances = _parse_timestamped_lines(raw, start, chunk_end)

            if utterances:
                all_utterances.extend(utterances)
                texts.append(" ".join(u.text for u in utterances))
            else:
                # Timestamps unusable — keep the text as one untimed block so we
                # never present fabricated timings.
                import re as _re
                plain = _re.sub(r'^\s*\[?\s*\d{1,2}:\d{2}(?::\d{2})?\s*\]?\s*', '',
                                raw, flags=_re.MULTILINE).strip()
                if plain:
                    texts.append(plain)
                    all_utterances.append(
                        Utterance(speaker="", text=plain, start=start, end=chunk_end)
                    )

            try:
                os.remove(chunk_path)
            except OSError:
                pass
    finally:
        try:
            os.rmdir(tmpdir)
        except OSError:
            pass

    full_text = " ".join(t for t in texts if t).strip()
    if not full_text:
        raise TranscriptionError("Gemini returned an empty transcript")

    return TranscriptionResult(
        text=full_text,
        language=language,
        utterances=all_utterances,
        provider=f"{settings.GEMINI_MODEL}-audio",
    )


# ---------------------------------------------------------------------------
# AssemblyAI
# ---------------------------------------------------------------------------
def transcribe_with_assemblyai(media_path: str, language: str,
                               *, diarize: bool = True) -> TranscriptionResult:
    """Transcribe with AssemblyAI's Best model (accurate + speaker labels)."""
    import assemblyai as aai

    if not settings.ASSEMBLYAI_API_KEY:
        raise TranscriptionError("ASSEMBLYAI_API_KEY is not set")

    aai.settings.api_key = settings.ASSEMBLYAI_API_KEY

    config_kwargs: Dict[str, Any] = {"speaker_labels": diarize}
    if language:
        config_kwargs["language_code"] = language
    if language == "en":
        config_kwargs["auto_highlights"] = True

    transcriber = aai.Transcriber(config=aai.TranscriptionConfig(**config_kwargs))
    transcript = transcriber.transcribe(media_path)

    if transcript.status == aai.TranscriptStatus.error:
        raise TranscriptionError(f"AssemblyAI failed: {transcript.error}")

    text = transcript.text or ""
    if not text.strip():
        raise TranscriptionError("AssemblyAI returned an empty transcript")

    # Index words once instead of rescanning the whole list per utterance —
    # the original code was O(utterances x words) and crawled on long meetings.
    all_words = [
        Word(text=w.text, start=w.start / 1000.0, end=w.end / 1000.0)
        for w in (transcript.words or [])
    ]

    utterances: List[Utterance] = []
    speaker_map: Dict[str, str] = {}
    next_letter = "A"
    cursor = 0

    for u in (transcript.utterances or []):
        if u.speaker not in speaker_map:
            speaker_map[u.speaker] = next_letter
            next_letter = chr(ord(next_letter) + 1)

        u_start, u_end = u.start / 1000.0, u.end / 1000.0
        u_words: List[Word] = []
        while cursor < len(all_words) and all_words[cursor].start < u_start:
            cursor += 1
        scan = cursor
        while scan < len(all_words) and all_words[scan].end <= u_end:
            u_words.append(all_words[scan])
            scan += 1

        utterances.append(Utterance(
            speaker=speaker_map[u.speaker],
            text=u.text,
            start=u_start,
            end=u_end,
            words=u_words,
        ))

    return TranscriptionResult(
        text=text,
        language=getattr(transcript, "language_code", language) or language,
        utterances=utterances,
        provider="assemblyai-best",
        diarized=bool(transcript.utterances),
    )


# ---------------------------------------------------------------------------
# Diarization borrowed from AssemblyAI, text kept from Whisper
# ---------------------------------------------------------------------------
def apply_speaker_turns(result: TranscriptionResult,
                        turns: List[Utterance]) -> TranscriptionResult:
    """
    Label Whisper's utterances using speaker turn boundaries from another engine.

    Each Whisper segment takes the speaker of whichever turn it overlaps most,
    so we keep Whisper's better text while still knowing who spoke.
    """
    if not turns:
        return result

    for utt in result.utterances:
        best_speaker, best_overlap = "", 0.0
        for turn in turns:
            overlap = min(utt.end, turn.end) - max(utt.start, turn.start)
            if overlap > best_overlap:
                best_overlap, best_speaker = overlap, turn.speaker
        utt.speaker = best_speaker

    result.diarized = any(u.speaker for u in result.utterances)
    return result


# ---------------------------------------------------------------------------
# Conservative LLM repair pass
# ---------------------------------------------------------------------------
CORRECTION_CHUNK_CHARS = 4000


def correct_transcript(text: str, language_code: str, language_name: str) -> str:
    """
    Repair spelling/segmentation damage without changing what was said.

    Strongly constrained on purpose: the model is told to return the text
    unchanged if unsure. A correction pass that paraphrases is worse than no
    correction pass at all, because it silently fabricates meeting content.

    If any chunk fails or comes back suspiciously different in length, that
    chunk keeps its original text.
    """
    if not text or not text.strip():
        return text

    chunks: List[str] = []
    remaining = text
    while remaining:
        if len(remaining) <= CORRECTION_CHUNK_CHARS:
            chunks.append(remaining)
            break
        # Prefer to split on a sentence end so we do not cut mid-thought.
        window = remaining[:CORRECTION_CHUNK_CHARS]
        split_at = max(window.rfind("۔"), window.rfind("."), window.rfind("\n"))
        if split_at < CORRECTION_CHUNK_CHARS // 2:
            split_at = CORRECTION_CHUNK_CHARS
        chunks.append(remaining[:split_at + 1])
        remaining = remaining[split_at + 1:]

    repaired: List[str] = []
    for i, chunk in enumerate(chunks):
        prompt = f"""You are proofreading a speech-to-text transcript in {language_name}.

The audio was transcribed automatically, so some words may have missing letters,
wrong spellings, or be split incorrectly.

FIX ONLY:
- misspelled words and missing/incorrect letters
- incorrect word boundaries
- obvious punctuation and sentence breaks

DO NOT:
- translate, paraphrase, summarise, or reword anything
- add or remove any content, opinions, or facts
- change the speaker's dialect, tone, or register
- add commentary, notes, or explanation

If a passage looks correct, or you are unsure, leave it exactly as it is.
Return ONLY the corrected text in {language_name}, nothing else.

TRANSCRIPT:
{chunk}"""

        try:
            fixed = llm_router.generate_text(
                prompt,
                temperature=0.1,
                feature_name=f"transcript_correction[{language_code}]",
            ).strip()

            # A correct proofread stays close in length. A big swing means the
            # model summarised or refused — keep the original instead.
            ratio = len(fixed) / max(len(chunk), 1)
            if not fixed or ratio < 0.6 or ratio > 1.6:
                logger.warning(
                    f"Correction chunk {i} rejected (length ratio {ratio:.2f}) — keeping original"
                )
                repaired.append(chunk)
            else:
                repaired.append(fixed)

        except Exception as e:
            logger.warning(f"Correction chunk {i} failed, keeping original: {e}")
            repaired.append(chunk)

    return " ".join(s.strip() for s in repaired).strip()


UTTERANCES_PER_BATCH = 15


def correct_utterances(utterances: List[Utterance], language_code: str,
                       language_name: str) -> List[Utterance]:
    """
    Proofread utterances in numbered batches, in place.

    Numbering lets us verify the model returned exactly the lines we sent. If a
    batch comes back with the wrong number of lines — the classic failure where
    the model merges or drops lines — that whole batch keeps its original text
    rather than silently corrupting the timeline.
    """
    if not utterances:
        return utterances

    for start in range(0, len(utterances), UTTERANCES_PER_BATCH):
        batch = utterances[start:start + UTTERANCES_PER_BATCH]
        numbered = "\n".join(f"{i + 1}. {u.text}" for i, u in enumerate(batch))

        prompt = f"""You are proofreading numbered lines from a speech-to-text transcript in {language_name}.

Each line was transcribed automatically, so words may have missing letters,
wrong spellings, or incorrect word boundaries.

FIX ONLY: misspellings, missing/incorrect letters, wrong word boundaries, and
obvious punctuation.

NEVER: translate, paraphrase, reword, summarise, merge lines, split lines, add
lines, remove lines, or add any commentary.

Return EXACTLY {len(batch)} lines, each starting with its original number and a
period, in the same order. If a line is already correct, repeat it unchanged.

LINES:
{numbered}"""

        try:
            raw = llm_router.generate_text(
                prompt,
                temperature=0.1,
                feature_name=f"utterance_correction[{language_code}]",
            )

            parsed: Dict[int, str] = {}
            for line in raw.splitlines():
                line = line.strip()
                if not line or "." not in line[:5]:
                    continue
                num_part, _, rest = line.partition(".")
                if num_part.strip().isdigit():
                    parsed[int(num_part.strip())] = rest.strip()

            if len(parsed) != len(batch):
                logger.warning(
                    f"Correction batch at {start} returned {len(parsed)} of "
                    f"{len(batch)} lines — keeping originals"
                )
                continue

            for i, utt in enumerate(batch):
                candidate = parsed.get(i + 1, "").strip()
                ratio = len(candidate) / max(len(utt.text), 1)
                # Guard each line too: a single wildly different line is a
                # paraphrase or a refusal, not a spelling fix.
                if candidate and 0.5 <= ratio <= 2.0:
                    utt.text = candidate

        except Exception as e:
            logger.warning(f"Correction batch at {start} failed, keeping originals: {e}")

    return utterances


# ---------------------------------------------------------------------------
# Spoken-language detection
#
# Routing and transcription quality both depend on knowing the spoken
# language. Forcing the wrong one is the worst outcome: AssemblyAI told "en"
# turns Urdu speech into garbled Roman text. So when the user picks "Auto",
# we listen to the opening of the file first.
#
# Gemini goes first because Whisper commonly labels Urdu speech as Hindi;
# Gemini separates them by vocabulary when asked to.
# ---------------------------------------------------------------------------
AUTO = "auto"
DETECTION_CLIP_SECONDS = 45

_DETECTION_PROMPT = (
    "Listen to this audio and identify the main spoken language.\n"
    "Reply with ONLY its ISO 639-1 code, e.g. en, ur, hi, ar, es.\n"
    "Hindi and Urdu sound alike: answer 'ur' when the vocabulary is Urdu "
    "(Persian/Arabic-origin words such as shukriya, faisla, masla, mulaqat, "
    "inshallah) and 'hi' only when it is clearly Hindi (Sanskrit-origin words "
    "such as dhanyavaad, nirnay, samasya).\n"
    "If there is no speech, reply: none"
)


def normalize_language_code(code: Optional[str]) -> Optional[str]:
    """'en_us' / 'EN-GB' / 'urdu' -> 'en' / 'en' / 'ur'."""
    if not code:
        return None
    code = code.strip().lower()
    if len(code) > 3 and "_" not in code and "-" not in code:
        return _language_name_to_code(code)
    if code == "zh-tw":
        return code
    return code.replace("_", "-").split("-")[0] or None


def _detect_with_gemini(clip_path: str) -> Optional[str]:
    import re

    with open(clip_path, "rb") as fh:
        audio = fh.read()
    answer = _gemini_audio_request(audio, _DETECTION_PROMPT).lower()
    if not answer or answer.startswith("none"):
        return None
    match = re.search(r"\b([a-z]{2,3})\b", answer)
    return match.group(1) if match else None


def _detect_with_whisper(clip_path: str) -> Optional[str]:
    with open(clip_path, "rb") as fh:
        resp = requests.post(
            GROQ_TRANSCRIBE_URL,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            files={"file": (os.path.basename(clip_path), fh, "audio/mpeg")},
            data={"model": GROQ_MODEL, "response_format": "verbose_json", "temperature": "0"},
            timeout=120,
        )
    if resp.status_code >= 400:
        raise TranscriptionError(f"Groq HTTP {resp.status_code}: {resp.text[:200]}")
    return normalize_language_code(resp.json().get("language"))


def detect_language(media_path: str) -> Optional[str]:
    """Identify the main spoken language from the opening of the file. None if unsure."""
    detectors = []
    if settings.GEMINI_API_KEY:
        detectors.append(("gemini", _detect_with_gemini))
    if settings.GROQ_API_KEY:
        detectors.append(("whisper", _detect_with_whisper))
    if not detectors:
        return None

    tmpdir = tempfile.mkdtemp(prefix="ttt_detect_")
    clip_path = os.path.join(tmpdir, "clip.mp3")
    try:
        cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", media_path,
               "-t", str(DETECTION_CLIP_SECONDS), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", clip_path]
        if subprocess.run(cmd, capture_output=True).returncode != 0:
            logger.warning("Language detection: could not extract an audio clip")
            return None

        for name, detect in detectors:
            try:
                code = normalize_language_code(detect(clip_path))
                if code and code != "none":
                    logger.info(f"Detected spoken language '{code}' via {name}")
                    return code
            except Exception as e:
                logger.warning(f"Language detection via {name} failed: {e}")
        return None
    finally:
        try:
            if os.path.exists(clip_path):
                os.remove(clip_path)
            os.rmdir(tmpdir)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def provider_order(language: str) -> List[str]:
    """
    Engines to try for this language, best first.

    For languages AssemblyAI covers well it goes first (it is accurate there and
    gives real speaker labels). For everything else — Urdu included — AssemblyAI
    would silently drop to its low-accuracy Nano model, so it goes last, behind
    Whisper and Gemini.
    """
    if language in ASSEMBLYAI_BEST_LANGUAGES:
        preferred = ["assemblyai", "whisper", "gemini"]
    else:
        preferred = ["whisper", "gemini", "assemblyai"]

    available = {
        "whisper": bool(settings.GROQ_API_KEY),
        "gemini": bool(settings.GEMINI_API_KEY),
        "assemblyai": bool(settings.ASSEMBLYAI_API_KEY),
    }
    return [name for name in preferred if available[name]]


def pick_provider(language: str) -> str:
    """The engine that will actually be used for this language."""
    order = provider_order(language)
    return order[0] if order else "none"


def transcribe(media_path: str, language: str, *, diarize: bool = True,
               correct: Optional[bool] = None,
               label_speakers: Optional[bool] = None) -> TranscriptionResult:
    """
    Transcribe `media_path`, routing to whichever engine is best for `language`.

    Falls back to the other engine if the preferred one fails, so a Groq outage
    degrades to AssemblyAI rather than failing the whole upload.
    """
    if not os.path.exists(media_path):
        raise TranscriptionError(f"File not found: {media_path}")

    language = normalize_language_code(language) if language and language != AUTO else AUTO
    if language == AUTO:
        language = detect_language(media_path) or "en"

    order = provider_order(language)
    if not order:
        raise TranscriptionError(
            "No transcription provider configured — set GROQ_API_KEY, "
            "GEMINI_API_KEY or ASSEMBLYAI_API_KEY"
        )

    # Correct by default only for languages we route to Whisper, since those are
    # the ones where residual spelling damage is likely.
    if correct is None:
        correct = language in WHISPER_PREFERRED_LANGUAGES

    result: Optional[TranscriptionResult] = None
    errors: Dict[str, str] = {}

    for engine in order:
        try:
            if engine == "whisper":
                result = transcribe_with_whisper(media_path, language)
            elif engine == "gemini":
                result = transcribe_with_gemini(media_path, language)
            else:
                result = transcribe_with_assemblyai(media_path, language, diarize=diarize)
            break
        except Exception as e:
            errors[engine] = str(e)[:300]
            logger.warning(f"{engine} transcription failed: {e}")

    if result is None:
        raise TranscriptionError(f"All transcription providers failed: {errors}")

    result.language = normalize_language_code(result.language) or language

    # Whisper has no diarization. If speaker labels will be shown and AssemblyAI is
    # available, borrow only its turn boundaries and keep Whisper's text. This is a
    # second paid transcription, so skip it when nobody will see the labels.
    if label_speakers is None:
        label_speakers = diarize
    if label_speakers and not result.diarized and result.provider.startswith("groq") \
            and settings.ASSEMBLYAI_API_KEY:
        try:
            turns = transcribe_with_assemblyai(media_path, language, diarize=True)
            result = apply_speaker_turns(result, turns.utterances)
            logger.info("Applied AssemblyAI speaker turns to the Whisper transcript")
        except Exception as e:
            logger.info(f"Speaker labelling skipped ({e})")

    if correct:
        language_name = LANGUAGE_CODE_TO_NAME.get(result.language, "the same language")

        if result.utterances:
            # Correct the utterances and rebuild the full text from them, so the
            # per-speaker view and the full transcript never disagree.
            before = [u.text for u in result.utterances]
            correct_utterances(result.utterances, result.language, language_name)
            result.corrected = [u.text for u in result.utterances] != before
            result.text = " ".join(u.text for u in result.utterances if u.text).strip()
        else:
            original = result.text
            result.text = correct_transcript(original, result.language, language_name)
            result.corrected = result.text != original

    return result

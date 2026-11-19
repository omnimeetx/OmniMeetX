"""
OmniMeetX - Transcript text analysis.
Filler cleanup, topic/phrase extraction, offline fallback summaries, and
chunked AI summarisation for transcripts too long for a single prompt.
"""
import json
import logging
import re
from collections import Counter

from app.services.ai import call_ai_patiently

logger = logging.getLogger(__name__)


# Scripts where the English filler-word rules below would do damage rather than
# good. Latin-script Urdu/Hindi ("Roman Urdu") is included by detection, not by
# script, because words like "ah", "well" and "so" are real words there.
_NON_LATIN_RANGES = (
    ('؀', 'ۿ'),  # Arabic / Urdu / Persian
    ('ݐ', 'ݿ'),  # Arabic Supplement
    ('ࢠ', 'ࣿ'),  # Arabic Extended-A
    ('ऀ', 'ॿ'),  # Devanagari
    ('ঀ', '෿'),  # Bengali .. Sinhala
    ('฀', '๿'),  # Thai
    ('一', '鿿'),  # CJK
    ('぀', 'ヿ'),  # Kana
    ('가', '힯'),  # Hangul
    ('֐', '׿'),  # Hebrew
    ('Ѐ', 'ӿ'),  # Cyrillic
    ('Ͱ', 'Ͽ'),  # Greek
)

def _is_non_latin(text: str) -> bool:
    """True if a meaningful share of the text is in a non-Latin script."""
    if not text:
        return False
    hits = sum(
        1 for c in text
        if any(lo <= c <= hi for lo, hi in _NON_LATIN_RANGES)
    )
    letters = sum(1 for c in text if c.isalpha())
    return letters > 0 and (hits / letters) > 0.3


def cleanup_transcript(text, language: str = None):
    """
    Filter out English transcription artifacts and filler words.

    Only safe for English. The filler list ("ah", "well", "so", "er", ...) and
    the initials rule are English-specific, and applying them to other languages
    deletes real words — which is part of why non-English transcripts came back
    with words missing. Anything non-English is whitespace-normalised only.
    """
    if not text:
        return ""

    lang = (language or "").lower().split("-")[0]

    # Anything explicitly not English, or written in a non-Latin script, gets
    # whitespace normalisation and nothing more.
    if (lang and lang != "en") or _is_non_latin(text):
        return re.sub(r'\s+', ' ', text).strip()

    filler_patterns = [
        r'\b(um|uh|ah|er|hmm|well|you know|i mean|basically|actually|literally)\b',
        r'\b(kind of|sort of|i guess|i think maybe)\b'
    ]
    cleaned = text
    for pattern in filler_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b[A-Z][a-z]{0,2}\.+(?=\s|$|[A-Z])', '', cleaned)
    cleaned = re.sub(r'\s+\.\s+', ' ', cleaned)
    cleaned = re.sub(r'^\.|\.$ ', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def extract_comprehensive_content(transcript_text):
    """Extract comprehensive content for longer transcripts."""
    if not transcript_text:
        return [], [], []

    sentences = []
    raw_sentences = re.split(r'[.!?]+|\n\n+', transcript_text)
    for sentence in raw_sentences:
        sentence = sentence.strip()
        if len(sentence) > 15:
            sentence = re.sub(r'\s+', ' ', sentence)
            sentences.append(sentence)

    meaningful_sentences = []
    filler_patterns = [
        r'\b(um|uh|ah|er|hmm|well|you know|i mean|like|so|basically|actually|literally)\b',
        r'\b(kind of|sort of|i guess|i think maybe|probably|perhaps)\b',
        r'^(okay|alright|right|yes|no|yeah|yep|sure)\.?\s*$'
    ]
    for sentence in sentences:
        sentence_lower = sentence.lower()
        filler_count = sum(len(re.findall(pattern, sentence_lower)) for pattern in filler_patterns)
        word_count = len(sentence.split())
        if word_count > 3 and (filler_count / max(word_count, 1)) < 0.4:
            meaningful_sentences.append(sentence)

    words = re.findall(r'\b[a-zA-Z]{3,}\b', transcript_text.lower())
    word_freq = Counter(words)
    stop_words = {
        'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'his', 'from',
        'they', 'she', 'her', 'been', 'than', 'its', 'were', 'said', 'each', 'which', 'their',
        'time', 'will', 'way', 'about', 'many', 'then', 'them', 'these', 'two', 'more', 'very',
        'what', 'know', 'just', 'first', 'get', 'has', 'him', 'had', 'let', 'put', 'too', 'old',
        'any', 'after', 'move', 'why', 'before', 'here', 'how', 'all', 'both', 'each', 'few',
        'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'than', 'too', 'very',
        'can', 'will', 'now', 'during', 'before', 'after', 'above', 'below', 'between', 'into',
        'through', 'during', 'before', 'after', 'above', 'below', 'between', 'being', 'where',
        'when', 'who', 'whom', 'whose', 'would', 'could', 'should', 'might', 'must', 'shall',
        'going', 'want', 'need', 'like', 'look', 'come', 'came', 'take', 'took', 'make', 'made'
    }
    topics = [word for word, count in word_freq.most_common(50)
              if word not in stop_words and count > 2 and len(word) > 3]

    phrases = []
    words_list = transcript_text.lower().split()
    for i in range(len(words_list) - 1):
        phrase = f"{words_list[i]} {words_list[i+1]}"
        if len(phrase) > 6:
            phrases.append(phrase)
    phrase_freq = Counter(phrases)
    key_phrases = [phrase for phrase, count in phrase_freq.most_common(20)
                   if count > 1 and not any(stop in phrase for stop in ['the ', 'and ', 'that ', 'with '])]

    return meaningful_sentences, topics, key_phrases


def parse_ai_json(text: str) -> dict:
    """
    Parse a JSON object from an LLM reply, tolerating ```json fences and
    chatter before/after the object. Raises ValueError if there is none.
    """
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError("No JSON object in AI response")
        return json.loads(match.group())


def process_long_transcript_in_chunks(transcript_text, title, max_chunk_size=25000):
    """Process very long transcripts in chunks to avoid token limits."""
    if len(transcript_text) <= max_chunk_size:
        return None

    logger.info(f"Processing long transcript in chunks: {len(transcript_text)} characters")

    chunks = []
    words = transcript_text.split()
    current_chunk = []
    current_size = 0
    for word in words:
        current_chunk.append(word)
        current_size += len(word) + 1
        if current_size >= max_chunk_size:
            chunks.append(' '.join(current_chunk))
            current_chunk = []
            current_size = 0
    if current_chunk:
        chunks.append(' '.join(current_chunk))

    all_summaries = []
    all_key_points = []
    all_action_items = []
    all_decisions = []
    failed_sections = []

    for i, chunk in enumerate(chunks):
        logger.info(f"Processing chunk {i+1}/{len(chunks)}")
        chunk_prompt = f"""
You are an expert transcript analyzer. Analyze this section of a longer meeting/video transcript and extract structured insights.

MEETING: {title}
SECTION {i+1} of {len(chunks)}:
{chunk}

INSTRUCTIONS:
1. Write a detailed summary proportional to section length.
2. Extract key_points — all factual and significant points.
3. Extract action_items as plain text strings; put the owner and deadline in the text when known, like "Sara: send the contract (Friday)".
4. Extract decisions reached.
5. Analyze sentiment.

Respond ONLY with valid JSON:
{{
  "summary": "...",
  "key_points": ["..."],
  "action_items": ["..."],
  "decisions": ["..."],
  "sentiment": "..."
}}
"""
        try:
            response = call_ai_patiently(chunk_prompt, feature_name="notes_chunk")
            chunk_result = parse_ai_json(response.text)

            if chunk_result.get("summary"):
                all_summaries.append(f"Section {i+1}: {chunk_result['summary']}")
            if chunk_result.get("key_points"):
                all_key_points.extend(chunk_result["key_points"])
            if chunk_result.get("action_items"):
                all_action_items.extend(chunk_result["action_items"])
            if chunk_result.get("decisions"):
                all_decisions.extend(chunk_result["decisions"])
        except Exception as e:
            logger.error(f"Failed to process chunk {i+1}: {e}")
            failed_sections.append(i + 1)

    if not all_summaries:
        return None  # nothing was analysed — let the caller report AI as unavailable

    combined_summary = " ".join(all_summaries)
    if failed_sections:
        combined_summary += (f"\n\n(AI could not analyse section(s) {', '.join(map(str, failed_sections))} "
                             f"of {len(chunks)}; use Retry for complete notes.)")

    return {
        "summary": combined_summary,
        "key_points": all_key_points,
        "action_items": all_action_items,
        "decisions": all_decisions,
    }


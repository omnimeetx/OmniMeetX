"""
OmniMeetX - notes lists as plain text.

Key points, action items and decisions are lists of plain text everywhere in
the app (notes page, exports, analytics). AI models sometimes return an item as
an object instead, most often an action item like
{"task": "...", "owner": "...", "deadline": "..."}. These helpers turn whatever
came back into text, so one odd answer can't break a page or an export.
"""
import json
from typing import Any, List

_MAIN_KEYS = ("task", "action", "item", "text", "point", "decision", "description", "title", "content")
_OWNER_KEYS = ("owner", "assignee", "responsible", "who", "person")
_DEADLINE_KEYS = ("deadline", "due", "due_date", "when", "by")
_EMPTY = {"", "n/a", "na", "none", "null", "not specified", "unspecified", "tbd", "unknown", "-"}


def _field(item: dict, keys: tuple) -> str:
    for key in keys:
        value = item.get(key)
        if isinstance(value, (str, int, float)) and str(value).strip().lower() not in _EMPTY:
            return str(value).strip()
    return ""


def item_text(item: Any) -> str:
    """One notes item as text. An action item object becomes "Owner: task (deadline)"."""
    if item is None:
        return ""
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, (int, float)):
        return str(item)
    if isinstance(item, dict):
        main = _field(item, _MAIN_KEYS)
        if not main:
            return " · ".join(str(v).strip() for v in item.values() if isinstance(v, (str, int, float)) and str(v).strip())
        owner, deadline = _field(item, _OWNER_KEYS), _field(item, _DEADLINE_KEYS)
        text = f"{owner}: {main}" if owner else main
        return f"{text} ({deadline})" if deadline else text
    if isinstance(item, (list, tuple)):
        return " ".join(filter(None, (item_text(x) for x in item)))
    return str(item).strip()


def text_list(value: Any) -> List[str]:
    """A notes list (a list, a JSON string of one, or a single value) as non-empty strings."""
    if value is None:
        return []
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []
        try:
            value = json.loads(stripped)
        except ValueError:
            return [stripped]
    if not isinstance(value, list):
        value = [value]
    return [text for text in (item_text(x) for x in value) if text]

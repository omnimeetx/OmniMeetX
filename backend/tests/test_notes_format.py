"""
OmniMeetX - notes lists stay plain text whatever shape the AI answers in.

    cd backend
    pytest tests/test_notes_format.py
"""
from app.services.notes_format import item_text, text_list


def test_action_item_objects_become_text():
    items = [
        {"owner": "Sarah", "task": "Email the client", "deadline": "Today"},
        {"task": "Fix the login page", "owner": "N/A"},
        {"assignee": "Ali", "action": "Finish the design"},
        "Hina reviews the Urdu transcript",
    ]
    assert text_list(items) == [
        "Sarah: Email the client (Today)",
        "Fix the login page",
        "Ali: Finish the design",
        "Hina reviews the Urdu transcript",
    ]


def test_strings_json_and_empties():
    assert text_list('["a", " ", "b"]') == ["a", "b"]
    assert text_list("just one line") == ["just one line"]
    assert text_list(None) == [] and text_list("") == [] and text_list([]) == []
    assert text_list({"task": "Single"}) == ["Single"]


def test_unknown_object_keeps_its_words():
    assert item_text({"foo": "bar", "n": 2}) == "bar · 2"
    assert item_text(["a", {"task": "b"}]) == "a b"

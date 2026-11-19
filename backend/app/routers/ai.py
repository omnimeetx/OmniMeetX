"""
OmniMeetX - AI Router
In-meeting AI assistant chat (default / ghost replay / insights) and provider status.
"""
import json
import re
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.services import llm_router
from app.services.ai import call_gemini_safe

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


# ===================== CHAT =====================
@router.post("/api/chat")
async def chat(request: Request):
    try:
        data = await request.json()
        user_message = data.get("message", "").strip()
        mode = data.get("mode", "default")
        context = data.get("context", "")

        if not user_message and mode == "default":
            raise HTTPException(400, detail={"error": "No message provided"})

        # Define full unified persona for all modes
        base_persona = (
            "You are an intelligent, friendly AI assistant inside OmniMeetX meeting rooms.\n\n"
            "You have two modes:\n"
            "1. If the user asks about the meeting, transcript, what was discussed, summary, action items "
            "— use the transcript context provided to answer accurately and specifically.\n"
            "2. If the user asks ANYTHING else (general knowledge, coding, math, advice, creative writing, "
            "explanations) — answer it fully and helpfully like a knowledgeable friend would.\n\n"
            "Your personality:\n"
            "- Warm, friendly, conversational tone\n"
            "- Use simple clear language, avoid corporate speak\n"
            "- Be concise but complete — don't pad answers\n"
            "- Use emojis occasionally to feel human (not excessive)\n"
            "- If you don't know something, say so honestly\n\n"
            "Hard rules — never respond to:\n"
            "- Adult/sexual content\n"
            "- Instructions for weapons, bombs, drugs, or anything illegal\n"
            "- Content that could harm people\n"
            'For these say: "Sorry, I can\'t help with that one 😅"\n\n'
            "Never ask the user to provide the transcript — it is always included automatically in your context.\n"
            'If transcript is empty say: "The meeting just started — ask me anything while we wait for the conversation to develop! 😊"\n'
        )

        # --- Ghost Replay Mode ---
        if mode == "ghost_replay":
            prompt = (
                f"{base_persona}\n"
                f"LIVE TRANSCRIPT:\n{context}\n\n"
                f"USER QUESTION: {user_message}\n\n"
                "The user is asking about the meeting transcript. Answer based on the transcript. "
                "If the information isn't in the transcript, "
                "say so warmly, like 'I don't see that discussed yet, but I'll keep listening! 😊' "
                "Keep responses concise — 2-4 sentences unless a detailed summary is requested."
            )
            ai_response = await run_in_threadpool(call_gemini_safe, prompt, feature_name="ghost_replay")
            return {"response": ai_response, "timestamp": datetime.now(timezone.utc).isoformat(), "mode": "ghost_replay"}

        # --- Insights Mode ---
        if mode == "insights":
            prompt = (
                f"{base_persona}\n"
                "Your task right now is to analyze this live meeting transcript and extract key insights and action items. "
                "Focus on what matters most to the team.\n\n"
                f"TRANSCRIPT:\n{context}\n\n"
                "Return ONLY valid JSON in this exact format, no other text:\n"
                '{"insights": ["key insight 1", "key insight 2"], "action_items": ["action item 1", "action item 2"]}\n\n'
                "Extract real insights from the transcript content. If transcript is too short, return empty arrays."
            )
            ai_response = await run_in_threadpool(call_gemini_safe, prompt, feature_name="meeting_insights")
            # Try to parse as JSON
            try:
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                    return {"response": parsed, "timestamp": datetime.now(timezone.utc).isoformat(), "mode": "insights"}
            except (json.JSONDecodeError, Exception):
                pass
            return {
                "response": {"insights": [], "action_items": []},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "mode": "insights",
            }

        # --- Default Chat Mode ---
        system_prompt = (
            f"{base_persona}\n"
            "Keep responses concise — 2-4 sentences unless a detailed answer is requested.\n"
        )

        full_prompt = f"{system_prompt}\n\n"
        if context:
            full_prompt += f"MEETING TRANSCRIPT:\n{context}\n\n"
        full_prompt += f"User: {user_message}"

        ai_response = await run_in_threadpool(call_gemini_safe, full_prompt, feature_name="chat")
        return {"response": ai_response, "timestamp": datetime.now(timezone.utc).isoformat()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(500, detail={"error": "Sorry, I'm having trouble right now."})


# ===================== AI PROVIDER STATUS =====================
@router.get("/api/ai/providers")
async def ai_provider_status():
    """
    Which AI providers are configured, and which are currently usable.

    `cooling_down_for` counts the seconds until a rate-limited provider is
    retried — useful for confirming that failover actually kicked in rather
    than guessing from the logs.
    """
    providers = llm_router.provider_status()
    return {
        "providers": providers,
        "configured": llm_router.configured_providers(),
        "available_now": [p["name"] for p in providers if p["available"]],
        "healthy": any(p["available"] for p in providers),
    }

import time

import requests

from app.config import settings

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

# Gemini occasionally returns 429 (rate limit / quota) or 503 (capacity).
# 503 is usually a brief spike worth retrying; 429 we surface immediately
# because quota/credit exhaustion won't clear within a few seconds.
RETRY_STATUSES = {503}
MAX_ATTEMPTS = 3


class GeminiError(Exception):
    """A Gemini call failed in a way we can explain to the user.

    `user_message` is safe, human-readable text for the frontend.
    """

    def __init__(self, user_message: str, status: int | None = None):
        super().__init__(user_message)
        self.user_message = user_message
        self.status = status


def _message_for_status(status: int) -> str:
    if status == 429:
        return (
            "The AI service has reached its usage limit (quota or credits "
            "exhausted). Check your Gemini API billing, then try again."
        )
    if status == 503:
        return "The AI service is busy right now. Please try again in a moment."
    if status in (401, 403):
        return "The AI service rejected the API key (unauthorized or invalid)."
    return f"The AI service returned an error (HTTP {status}). Please try again."


def gemini_available() -> bool:
    """True if an API key is configured. (We don't ping the network here.)"""
    return bool(settings.gemini_api_key)


def gemini_generate_json(prompt: str) -> str:
    """
    Call Gemini generateContent and return the raw model text (JSON string).

    Raises GeminiError (with a user-friendly message) on any failure.
    """
    if not settings.gemini_api_key:
        raise GeminiError("The AI service is not configured (no API key).")

    url = f"{BASE_URL}/models/{settings.gemini_model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
    }
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.gemini_api_key,
    }

    for attempt in range(MAX_ATTEMPTS):
        try:
            resp = requests.post(
                url, headers=headers, json=payload, timeout=settings.gemini_timeout
            )
        except requests.RequestException:
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise GeminiError(
                "Could not reach the AI service. Check your connection and try again."
            )

        if resp.status_code in RETRY_STATUSES and attempt < MAX_ATTEMPTS - 1:
            time.sleep(2 * (attempt + 1))
            continue

        if resp.status_code != 200:
            raise GeminiError(_message_for_status(resp.status_code), resp.status_code)

        data = resp.json()
        candidates = data.get("candidates", [])
        parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
        if not parts:
            raise GeminiError("The AI service returned an empty response. Please try again.")
        return parts[0].get("text", "").strip()

    # Exhausted retries on a retryable status.
    raise GeminiError(_message_for_status(resp.status_code), resp.status_code)

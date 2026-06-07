import requests

from app.config import settings

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def gemini_available() -> bool:
    """True if an API key is configured. (We don't ping the network here.)"""
    return bool(settings.gemini_api_key)


def gemini_generate_json(prompt: str) -> str | None:
    """
    Call Gemini generateContent and return the raw model text.

    Forces JSON output via responseMimeType so the caller can json.loads it.
    Returns None on any failure (no key, network error, bad response).
    """
    if not settings.gemini_api_key:
        return None

    url = f"{BASE_URL}/models/{settings.gemini_model}:generateContent"
    try:
        resp = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": settings.gemini_api_key,
            },
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0,
                },
            },
            timeout=settings.gemini_timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return None
        return parts[0].get("text", "").strip()
    except Exception:
        return None

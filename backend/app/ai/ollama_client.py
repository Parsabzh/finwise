import os
import requests

OLLAMA_URL   = os.getenv("OLLAMA_URL",   "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "30"))


def ollama_generate(prompt: str) -> str | None:
    """Call Ollama /api/generate. Returns the response text, or None on any failure."""
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=OLLAMA_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception:
        return None


def ollama_available() -> bool:
    """Quick health-check: is the Ollama server reachable?"""
    try:
        requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        return True
    except Exception:
        return False

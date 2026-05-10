import json
import re

from app.ai.ollama_client import ollama_generate
from app.ai.categories import CATEGORY_HINTS


def categorize(description: str, categories: list[str]) -> str | None:
    """
    Use Ollama to pick the best category for a transaction description.
    Returns a category from the provided list, or None if Ollama is
    unreachable or the model's response doesn't match any valid category.
    """
    hints = "\n".join(
        f"  - {cat}: {CATEGORY_HINTS.get(cat, '')}" for cat in categories
    )

    prompt = (
        "You are a financial transaction categorizer.\n"
        "Pick exactly one category for the transaction below.\n\n"
        f"Valid categories:\n{hints}\n\n"
        f'Transaction: "{description}"\n\n'
        'Respond ONLY with valid JSON: {"category": "chosen_category"}\n'
        "No extra text, no markdown, no explanation."
    )

    raw = ollama_generate(prompt)
    if raw is None:
        return None

    try:
        match = re.search(r'\{[^}]+\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
            cat = data.get("category", "").strip().lower()
            if cat in categories:
                return cat
    except (json.JSONDecodeError, KeyError, ValueError):
        pass

    # Hallucination guard: model returned something not in our list
    return None

import json
import re
from datetime import date
from decimal import Decimal, InvalidOperation

from app.ai.gemini_client import (
    gemini_generate_json,
    gemini_generate_json_with_document,
    GeminiError,
)
from app.ai.categories import CATEGORY_HINTS

# Cap how much of the file we hand to the model in one request.
MAX_ROWS = 200


class ImportError(Exception):
    """Raised when a statement file cannot be parsed/extracted into transactions."""


def _build_text_prompt(csv_text: str, categories: list[str]) -> str:
    hints = "\n".join(
        f"  - {cat}: {CATEGORY_HINTS.get(cat, '')}" for cat in categories
    )
    return (
        "You are a bank-statement parser. You are given the raw contents of a "
        "CSV bank export (any bank, any format, any delimiter, any language).\n"
        "Extract every transaction row and return them as structured JSON.\n\n"
        "For each transaction, output an object with exactly these fields:\n"
        '  - "date": ISO format YYYY-MM-DD\n'
        '  - "description": a short human-readable merchant/counterparty name\n'
        '  - "amount": a POSITIVE number (no currency symbol, use a dot decimal)\n'
        '  - "type": "income" or "expense" (money in = income, money out = expense)\n'
        '  - "category": choose the single best fit from the category list below\n\n'
        f"Valid categories:\n{hints}\n\n"
        "Rules:\n"
        "- Ignore header rows, totals, and balance columns.\n"
        "- Amount must always be positive; use the type field to convey direction.\n"
        "- If a value is ambiguous, make your best guess; never invent rows.\n"
        '- Respond with ONLY a JSON array: [{...}, {...}]. No markdown, no prose.\n\n'
        "CSV contents:\n"
        f"{csv_text}"
    )


def _build_document_prompt(categories: list[str]) -> str:
    hints = "\n".join(
        f"  - {cat}: {CATEGORY_HINTS.get(cat, '')}" for cat in categories
    )
    return (
        "You are a bank-statement parser. You are given a bank statement as an "
        "attached document (any bank, any layout, any language).\n"
        "Extract every transaction row and return them as structured JSON.\n\n"
        "For each transaction, output an object with exactly these fields:\n"
        '  - "date": ISO format YYYY-MM-DD\n'
        '  - "description": a short human-readable merchant/counterparty name\n'
        '  - "amount": a POSITIVE number (no currency symbol, use a dot decimal)\n'
        '  - "type": "income" or "expense" (money in = income, money out = expense)\n'
        '  - "category": choose the single best fit from the category list below\n\n'
        f"Valid categories:\n{hints}\n\n"
        "Rules:\n"
        "- Ignore header rows, totals, and balance columns.\n"
        "- Amount must always be positive; use the type field to convey direction.\n"
        "- If a value is ambiguous, make your best guess; never invent rows.\n"
        '- Respond with ONLY a JSON array: [{...}, {...}]. No markdown, no prose.\n\n'
        "Extract the transactions from the attached document."
    )


def _coerce_row(row: dict, categories: list[str]) -> dict | None:
    """Validate and normalize one model-produced row. Returns None if unusable."""
    try:
        d = date.fromisoformat(str(row["date"]).strip()[:10])
    except (KeyError, ValueError, TypeError):
        return None

    try:
        amount = Decimal(str(row["amount"]).replace(",", ".").strip())
    except (KeyError, InvalidOperation, TypeError):
        return None
    amount = abs(amount)
    if amount <= 0:
        return None

    tx_type = str(row.get("type", "")).strip().lower()
    if tx_type not in ("income", "expense"):
        return None

    description = str(row.get("description", "")).strip() or "Imported transaction"

    category = str(row.get("category", "")).strip().lower()
    if category not in categories:
        category = "other"

    return {
        "date": d.isoformat(),
        "description": description,
        "amount": str(amount),
        "type": tx_type,
        "category": category,
    }


def _parse_and_coerce(raw: str, categories: list[str]) -> list[dict]:
    """Parse Gemini's raw JSON text and coerce it into validated transaction rows."""
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Be forgiving if the model wrapped the array in extra text.
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if not match:
            raise ImportError("Gemini did not return valid JSON.")
        try:
            parsed = json.loads(match.group())
        except json.JSONDecodeError:
            raise ImportError("Gemini did not return valid JSON.")

    if not isinstance(parsed, list):
        raise ImportError("Gemini did not return a list of transactions.")

    rows = [_coerce_row(r, categories) for r in parsed if isinstance(r, dict)]
    rows = [r for r in rows if r is not None][:MAX_ROWS]

    if not rows:
        raise ImportError("No transactions could be extracted from this file.")
    return rows


def extract_transactions_from_text(text: str, categories: list[str]) -> list[dict]:
    """
    Send raw text (CSV contents, or a flattened Excel sheet) to Gemini and
    return a list of normalized transaction dicts.
    Raises ImportError if Gemini is unavailable or returns nothing usable.
    """
    try:
        raw = gemini_generate_json(_build_text_prompt(text, categories))
    except GeminiError as exc:
        raise ImportError(exc.user_message)
    return _parse_and_coerce(raw, categories)


def extract_transactions_from_document(
    document_bytes: bytes, mime_type: str, categories: list[str]
) -> list[dict]:
    """
    Send a raw document (e.g. a PDF bank statement) to Gemini as inline data
    and return a list of normalized transaction dicts.
    Raises ImportError if Gemini is unavailable or returns nothing usable.
    """
    try:
        raw = gemini_generate_json_with_document(
            _build_document_prompt(categories), document_bytes, mime_type
        )
    except GeminiError as exc:
        raise ImportError(exc.user_message)
    return _parse_and_coerce(raw, categories)

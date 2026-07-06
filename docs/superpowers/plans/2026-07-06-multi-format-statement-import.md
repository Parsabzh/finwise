# Multi-Format Statement Import (CSV + Excel + PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload `.csv`, `.xlsx`, or `.pdf` bank statements to the existing import feature, extracting the same normalized transaction shape regardless of source format.

**Architecture:** CSV and Excel share one path (convert to text, reuse the existing Gemini text prompt). PDF gets its own path (send raw bytes to Gemini as an inline document part, since Gemini's multimodal model reads table layout natively). Both paths converge on the same row-validation logic and produce the same `list[dict]` shape, so the Pydantic schemas, commit route, and frontend preview table need zero changes.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, `requests` (Gemini REST calls), `openpyxl` (new dependency, Excel parsing), pytest + `TestClient` (backend tests), Next.js/React (frontend, no test framework configured).

## Global Constraints

- Per-type upload size caps: `.csv` → 2 MB, `.xlsx` → 5 MB, `.pdf` → 5 MB (exact values from spec).
- Only `.xlsx` is supported for Excel — no legacy `.xls`.
- No changes to `ParsedTransaction`/`ParsePreview`/`ImportCommit`/`ImportResult` schemas, the commit route logic, or the frontend preview/edit table.
- Renamed files: `app/ai/csv_importer.py` → `app/ai/statement_importer.py`; `app/routes/import_csv.py` → `app/routes/import_statement.py`. Use `git mv` to preserve history.
- Router URL prefix (`/api/import`) and endpoint paths (`/parse`, `/commit`, `/health`) stay exactly as they are today.

---

## File Structure

- `backend/app/ai/gemini_client.py` (modify) — shared retry helper + new document-upload function.
- `backend/tests/test_gemini_client.py` (new) — covers the new document path + a happy-path regression test for the refactor.
- `backend/app/ai/statement_importer.py` (renamed from `csv_importer.py`) — shared row coercion, text-based extraction (renamed), new document-based extraction.
- `backend/tests/test_statement_importer.py` (new) — covers both extraction entry points against a mocked Gemini client.
- `backend/app/ai/excel_importer.py` (new) — `.xlsx` → text conversion.
- `backend/tests/test_excel_importer.py` (new) — covers cell flattening, multi-sheet prefixing, and corrupt-file errors.
- `backend/app/routes/import_statement.py` (renamed from `import_csv.py`) — extension dispatch, per-type size caps.
- `backend/app/main.py` (modify) — update router import path.
- `backend/requirements.txt` (modify) — add `openpyxl`.
- `backend/tests/test_import.py` (new) — route-level dispatch, size-cap, and per-format success tests.
- `frontend/src/app/import/ImportPage.tsx` (modify) — generalized copy + `accept` attribute.
- `frontend/src/components/layout/Sidebar.tsx` (modify) — nav label.

---

### Task 1: Gemini client — shared retry helper + document upload

**Files:**
- Modify: `backend/app/ai/gemini_client.py`
- Test: `backend/tests/test_gemini_client.py`

**Interfaces:**
- Consumes: `app.config.settings` (existing `gemini_api_key`, `gemini_model`, `gemini_timeout`).
- Produces: `gemini_generate_json(prompt: str) -> str` (existing signature, unchanged behavior), `gemini_generate_json_with_document(prompt: str, document_bytes: bytes, mime_type: str) -> str` (new), `GeminiError` (unchanged).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_gemini_client.py`:

```python
# tests/test_gemini_client.py
#
# Covers the shared request/retry path via both entry points, plus the new
# document-upload path. Network calls are mocked — no real Gemini API calls.

import base64
from unittest.mock import patch, MagicMock

import pytest

from app.ai import gemini_client
from app.ai.gemini_client import (
    gemini_generate_json,
    gemini_generate_json_with_document,
    GeminiError,
)


def _mock_response(text: str, status_code: int = 200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": text}]}}]
    }
    return resp


class TestGeminiGenerateJson:
    def test_returns_model_text(self, monkeypatch):
        monkeypatch.setattr(gemini_client.settings, "gemini_api_key", "test-key")
        with patch("app.ai.gemini_client.requests.post", return_value=_mock_response("[]")) as mock_post:
            result = gemini_generate_json("extract these rows")

        assert result == "[]"
        sent_parts = mock_post.call_args.kwargs["json"]["contents"][0]["parts"]
        assert sent_parts == [{"text": "extract these rows"}]

    def test_no_api_key_raises_gemini_error(self, monkeypatch):
        monkeypatch.setattr(gemini_client.settings, "gemini_api_key", "")
        with pytest.raises(GeminiError):
            gemini_generate_json("extract these rows")


class TestGeminiGenerateJsonWithDocument:
    def test_sends_inline_document_data(self, monkeypatch):
        monkeypatch.setattr(gemini_client.settings, "gemini_api_key", "test-key")
        document_bytes = b"%PDF-1.4 fake pdf bytes"

        with patch("app.ai.gemini_client.requests.post", return_value=_mock_response("[{\"ok\": true}]")) as mock_post:
            result = gemini_generate_json_with_document(
                "extract from this document", document_bytes, "application/pdf"
            )

        assert result == '[{"ok": true}]'
        sent_parts = mock_post.call_args.kwargs["json"]["contents"][0]["parts"]
        assert sent_parts == [
            {"text": "extract from this document"},
            {
                "inline_data": {
                    "mime_type": "application/pdf",
                    "data": base64.b64encode(document_bytes).decode("ascii"),
                }
            },
        ]

    def test_no_api_key_raises_gemini_error(self, monkeypatch):
        monkeypatch.setattr(gemini_client.settings, "gemini_api_key", "")
        with pytest.raises(GeminiError):
            gemini_generate_json_with_document("prompt", b"bytes", "application/pdf")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && venv/bin/python -m pytest tests/test_gemini_client.py -v`
Expected: FAIL — `ImportError: cannot import name 'gemini_generate_json_with_document'`

- [ ] **Step 3: Implement the refactor + new function**

Replace `backend/app/ai/gemini_client.py` with:

```python
import base64
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


def _post_generate_content(parts: list[dict]) -> str:
    """
    Shared request/retry logic for a generateContent call.

    `parts` is the list of Gemini "part" objects (text, inline_data, ...)
    making up the single user turn. Returns the raw model text.
    Raises GeminiError (with a user-friendly message) on any failure.
    """
    if not settings.gemini_api_key:
        raise GeminiError("The AI service is not configured (no API key).")

    url = f"{BASE_URL}/models/{settings.gemini_model}:generateContent"
    payload = {
        "contents": [{"parts": parts}],
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
        parts_out = candidates[0].get("content", {}).get("parts", []) if candidates else []
        if not parts_out:
            raise GeminiError("The AI service returned an empty response. Please try again.")
        return parts_out[0].get("text", "").strip()

    # Exhausted retries on a retryable status.
    raise GeminiError(_message_for_status(resp.status_code), resp.status_code)


def gemini_generate_json(prompt: str) -> str:
    """
    Call Gemini generateContent with a plain text prompt and return the raw
    model text (JSON string). Raises GeminiError on failure.
    """
    return _post_generate_content([{"text": prompt}])


def gemini_generate_json_with_document(prompt: str, document_bytes: bytes, mime_type: str) -> str:
    """
    Call Gemini generateContent with a text prompt plus an inline document
    (e.g. a PDF) and return the raw model text (JSON string). Gemini reads
    the document's layout/tables natively. Raises GeminiError on failure.
    """
    encoded = base64.b64encode(document_bytes).decode("ascii")
    parts = [
        {"text": prompt},
        {"inline_data": {"mime_type": mime_type, "data": encoded}},
    ]
    return _post_generate_content(parts)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && venv/bin/python -m pytest tests/test_gemini_client.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/ai/gemini_client.py backend/tests/test_gemini_client.py
git commit -m "feat: add Gemini inline-document support for PDF statement import"
```

---

### Task 2: Statement importer — rename + document-based extraction

**Files:**
- Create (via `git mv`): `backend/app/ai/statement_importer.py` (from `backend/app/ai/csv_importer.py`)
- Test: `backend/tests/test_statement_importer.py`

**Interfaces:**
- Consumes: `gemini_generate_json(prompt: str) -> str`, `gemini_generate_json_with_document(prompt: str, document_bytes: bytes, mime_type: str) -> str`, `GeminiError` (all from Task 1's `app.ai.gemini_client`); `CATEGORY_HINTS` from `app.ai.categories`.
- Produces: `ImportError` (exception), `extract_transactions_from_text(text: str, categories: list[str]) -> list[dict]`, `extract_transactions_from_document(document_bytes: bytes, mime_type: str, categories: list[str]) -> list[dict]`. Both return the same row shape: `{"date": str, "description": str, "amount": str, "type": "income"|"expense", "category": str}`.

- [ ] **Step 1: Rename the file, preserving history**

```bash
git mv backend/app/ai/csv_importer.py backend/app/ai/statement_importer.py
```

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_statement_importer.py`:

```python
# tests/test_statement_importer.py
#
# Covers both extraction entry points against a mocked Gemini client, so
# no real network calls happen. Row-coercion detail (amount/date/category
# normalization) is exercised indirectly through these two entry points.

import pytest

from app.ai import statement_importer as si
from app.ai.gemini_client import GeminiError

CATEGORIES = ["dining", "other"]

ONE_ROW_JSON = (
    '[{"date": "2024-03-15", "description": "Coffee shop", '
    '"amount": "4.50", "type": "expense", "category": "dining"}]'
)

EXPECTED_ROW = {
    "date": "2024-03-15",
    "description": "Coffee shop",
    "amount": "4.50",
    "type": "expense",
    "category": "dining",
}


class TestExtractTransactionsFromText:
    def test_returns_coerced_rows(self, monkeypatch):
        monkeypatch.setattr(si, "gemini_generate_json", lambda prompt: ONE_ROW_JSON)
        rows = si.extract_transactions_from_text("date,desc,amount\n...", CATEGORIES)
        assert rows == [EXPECTED_ROW]

    def test_gemini_error_becomes_import_error(self, monkeypatch):
        def _raise(prompt):
            raise GeminiError("quota exhausted")
        monkeypatch.setattr(si, "gemini_generate_json", _raise)

        with pytest.raises(si.ImportError, match="quota exhausted"):
            si.extract_transactions_from_text("some text", CATEGORIES)


class TestExtractTransactionsFromDocument:
    def test_calls_gemini_with_document_bytes_and_mime_type(self, monkeypatch):
        captured = {}

        def _fake_call(prompt, document_bytes, mime_type):
            captured["prompt"] = prompt
            captured["document_bytes"] = document_bytes
            captured["mime_type"] = mime_type
            return ONE_ROW_JSON

        monkeypatch.setattr(si, "gemini_generate_json_with_document", _fake_call)

        rows = si.extract_transactions_from_document(b"%PDF-fake", "application/pdf", CATEGORIES)

        assert rows == [EXPECTED_ROW]
        assert captured["document_bytes"] == b"%PDF-fake"
        assert captured["mime_type"] == "application/pdf"
        assert "document" in captured["prompt"].lower()

    def test_gemini_error_becomes_import_error(self, monkeypatch):
        def _raise(prompt, document_bytes, mime_type):
            raise GeminiError("busy")
        monkeypatch.setattr(si, "gemini_generate_json_with_document", _raise)

        with pytest.raises(si.ImportError, match="busy"):
            si.extract_transactions_from_document(b"bytes", "application/pdf", CATEGORIES)
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && venv/bin/python -m pytest tests/test_statement_importer.py -v`
Expected: FAIL — `AttributeError: module 'app.ai.statement_importer' has no attribute 'extract_transactions_from_text'`

- [ ] **Step 4: Implement the rename + refactor + new function**

Replace `backend/app/ai/statement_importer.py` with:

```python
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && venv/bin/python -m pytest tests/test_statement_importer.py -v`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/ai/statement_importer.py backend/tests/test_statement_importer.py
git commit -m "refactor: rename csv_importer to statement_importer, add document-based extraction"
```

---

### Task 3: Excel importer (`.xlsx` → text)

**Files:**
- Create: `backend/app/ai/excel_importer.py`
- Test: `backend/tests/test_excel_importer.py`
- Modify: `backend/requirements.txt`

**Interfaces:**
- Consumes: `app.ai.statement_importer.ImportError` (Task 2).
- Produces: `xlsx_to_text(raw: bytes) -> str`. Raises `ImportError` on unreadable/corrupt input.

- [ ] **Step 1: Add the dependency and install it**

Add this line to `backend/requirements.txt` (keep alphabetical order — after `MarkupSafe`, before `passlib`):

```
openpyxl==3.1.5
```

Run: `cd backend && venv/bin/pip install openpyxl==3.1.5`
Expected: `Successfully installed openpyxl-3.1.5` (plus `et-xmlfile`, its only dependency)

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_excel_importer.py`:

```python
# tests/test_excel_importer.py
#
# Builds small workbooks in memory with openpyxl (no fixture files needed)
# and verifies xlsx_to_text flattens them into the comma/newline text format
# that statement_importer's text prompt expects.

from io import BytesIO

import pytest
from openpyxl import Workbook

from app.ai.excel_importer import xlsx_to_text
from app.ai.statement_importer import ImportError as StatementImportError


def _make_xlsx(sheets: dict[str, list[list]]) -> bytes:
    """sheets: {sheet_name: [[row1_cells], [row2_cells], ...]}"""
    wb = Workbook()
    wb.remove(wb.active)
    for name, rows in sheets.items():
        ws = wb.create_sheet(name)
        for row in rows:
            ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


class TestXlsxToText:
    def test_flattens_rows_into_comma_joined_text(self):
        raw = _make_xlsx({
            "Sheet1": [
                ["Date", "Description", "Amount"],
                ["2024-03-15", "Coffee shop", 4.5],
            ]
        })
        text = xlsx_to_text(raw)
        assert "Date,Description,Amount" in text
        assert "2024-03-15,Coffee shop,4.5" in text

    def test_empty_cells_become_empty_string(self):
        raw = _make_xlsx({"Sheet1": [["A", None, "C"]]})
        text = xlsx_to_text(raw)
        assert "A,,C" in text

    def test_multiple_sheets_are_prefixed_with_sheet_name(self):
        raw = _make_xlsx({
            "Jan": [["a", "b"]],
            "Feb": [["c", "d"]],
        })
        text = xlsx_to_text(raw)
        assert "# Sheet: Jan" in text
        assert "# Sheet: Feb" in text
        assert "a,b" in text
        assert "c,d" in text

    def test_single_sheet_has_no_sheet_prefix(self):
        raw = _make_xlsx({"OnlySheet": [["a", "b"]]})
        text = xlsx_to_text(raw)
        assert "# Sheet:" not in text

    def test_corrupt_bytes_raise_import_error(self):
        with pytest.raises(StatementImportError):
            xlsx_to_text(b"this is not a real xlsx file")
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && venv/bin/python -m pytest tests/test_excel_importer.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.ai.excel_importer'`

- [ ] **Step 4: Implement `excel_importer.py`**

Create `backend/app/ai/excel_importer.py`:

```python
from io import BytesIO
from zipfile import BadZipFile

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from app.ai.statement_importer import ImportError


def xlsx_to_text(raw: bytes) -> str:
    """
    Flatten an .xlsx workbook into a comma/newline text block so it can be
    fed through the same text-based extraction prompt CSV uses.

    Raises ImportError if the bytes aren't a readable .xlsx file.
    """
    try:
        workbook = load_workbook(BytesIO(raw), read_only=True, data_only=True)
    except (BadZipFile, InvalidFileException, KeyError) as exc:
        raise ImportError(
            "Could not read this Excel file. Make sure it's a valid .xlsx export."
        ) from exc

    multi_sheet = len(workbook.sheetnames) > 1
    blocks: list[str] = []
    for sheet_name in workbook.sheetnames:
        sheet = workbook[sheet_name]
        lines = [
            ",".join("" if cell is None else str(cell) for cell in row)
            for row in sheet.iter_rows(values_only=True)
        ]
        block = "\n".join(lines)
        if multi_sheet:
            block = f"# Sheet: {sheet_name}\n{block}"
        blocks.append(block)

    return "\n\n".join(blocks)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && venv/bin/python -m pytest tests/test_excel_importer.py -v`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/ai/excel_importer.py backend/tests/test_excel_importer.py backend/requirements.txt
git commit -m "feat: add .xlsx-to-text conversion for Excel statement import"
```

---

### Task 4: Import route — extension dispatch + per-type size caps

**Files:**
- Create (via `git mv`): `backend/app/routes/import_statement.py` (from `backend/app/routes/import_csv.py`)
- Modify: `backend/app/main.py:15`
- Test: `backend/tests/test_import.py`

**Interfaces:**
- Consumes: `extract_transactions_from_text`, `extract_transactions_from_document`, `ImportError` (Task 2, `app.ai.statement_importer`); `xlsx_to_text` (Task 3, `app.ai.excel_importer`); `resolve_categories` (existing, `app.ai.category_resolver`).
- Produces: same public API as before — `POST /api/import/parse` (now accepts `.csv`/`.xlsx`/`.pdf`), `POST /api/import/commit`, `GET /api/import/health`, all unchanged in shape.

- [ ] **Step 1: Rename the file, preserving history**

```bash
git mv backend/app/routes/import_csv.py backend/app/routes/import_statement.py
```

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_import.py`:

```python
# tests/test_import.py
#
# Route-level tests for /api/import/parse. The three extraction entry
# points (extract_transactions_from_text, extract_transactions_from_document,
# xlsx_to_text) are monkeypatched at the route module so no real Gemini
# calls happen and the dispatch logic is tested in isolation.

import io

import pytest

from app.routes import import_statement as route

ONE_ROW = {
    "date": "2024-03-15",
    "description": "Coffee shop",
    "amount": "4.50",
    "type": "expense",
    "category": "dining",
}


def _upload(client, auth_headers, filename: str, content: bytes, content_type: str = "application/octet-stream"):
    return client.post(
        "/api/import/parse",
        files={"file": (filename, io.BytesIO(content), content_type)},
        headers=auth_headers,
    )


class TestUnsupportedAndAuth:
    def test_rejects_unsupported_extension(self, client, auth_headers):
        resp = _upload(client, auth_headers, "statement.txt", b"hello")
        assert resp.status_code == 400

    def test_requires_auth(self, client):
        resp = client.post("/api/import/parse", files={"file": ("s.csv", io.BytesIO(b"a,b"), "text/csv")})
        assert resp.status_code == 401


class TestSizeCaps:
    def test_csv_over_2mb_returns_413(self, client, auth_headers):
        big = b"a" * (2 * 1024 * 1024 + 1)
        resp = _upload(client, auth_headers, "big.csv", big, "text/csv")
        assert resp.status_code == 413

    def test_xlsx_over_5mb_returns_413(self, client, auth_headers):
        big = b"a" * (5 * 1024 * 1024 + 1)
        resp = _upload(client, auth_headers, "big.xlsx", big)
        assert resp.status_code == 413

    def test_pdf_over_5mb_returns_413(self, client, auth_headers):
        big = b"a" * (5 * 1024 * 1024 + 1)
        resp = _upload(client, auth_headers, "big.pdf", big, "application/pdf")
        assert resp.status_code == 413


class TestCsvDispatch:
    def test_parses_csv_via_text_path(self, client, auth_headers, monkeypatch):
        monkeypatch.setattr(route, "extract_transactions_from_text", lambda text, categories: [ONE_ROW])
        resp = _upload(client, auth_headers, "statement.csv", b"date,desc,amount\n...", "text/csv")
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] == 1
        assert body["transactions"][0]["description"] == "Coffee shop"


class TestXlsxDispatch:
    def test_parses_xlsx_via_excel_then_text_path(self, client, auth_headers, monkeypatch):
        captured = {}

        def fake_xlsx_to_text(raw):
            captured["raw"] = raw
            return "flattened,excel,text"

        def fake_extract_from_text(text, categories):
            captured["text"] = text
            return [ONE_ROW]

        monkeypatch.setattr(route, "xlsx_to_text", fake_xlsx_to_text)
        monkeypatch.setattr(route, "extract_transactions_from_text", fake_extract_from_text)

        resp = _upload(client, auth_headers, "statement.xlsx", b"fake xlsx bytes")

        assert resp.status_code == 200
        assert captured["raw"] == b"fake xlsx bytes"
        assert captured["text"] == "flattened,excel,text"
        assert resp.json()["count"] == 1


class TestPdfDispatch:
    def test_parses_pdf_via_document_path(self, client, auth_headers, monkeypatch):
        captured = {}

        def fake_extract_from_document(document_bytes, mime_type, categories):
            captured["document_bytes"] = document_bytes
            captured["mime_type"] = mime_type
            return [ONE_ROW]

        monkeypatch.setattr(route, "extract_transactions_from_document", fake_extract_from_document)

        resp = _upload(client, auth_headers, "statement.pdf", b"%PDF-fake bytes", "application/pdf")

        assert resp.status_code == 200
        assert captured["document_bytes"] == b"%PDF-fake bytes"
        assert captured["mime_type"] == "application/pdf"
        assert resp.json()["count"] == 1
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && venv/bin/python -m pytest tests/test_import.py -v`
Expected: FAIL at collection time — `ModuleNotFoundError: No module named 'app.routes.import_csv'`. This happens because `main.py` still imports the pre-rename path (`app.routes.import_csv`), which no longer exists after the `git mv` in Step 1 — this breaks `app.main` import for the *entire* test session (every test file imports `app.main` via `conftest.py`), not just `test_import.py`. That's expected and gets fixed by Steps 4–5.

- [ ] **Step 4: Implement the dispatch logic**

Replace `backend/app/routes/import_statement.py` with:

```python
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.person import Person
from app.models.transaction import Transaction
from app.ai.category_resolver import resolve_categories
from app.ai.excel_importer import xlsx_to_text
from app.ai.statement_importer import (
    extract_transactions_from_text,
    extract_transactions_from_document,
    ImportError as StatementImportError,
)
from app.ai.gemini_client import gemini_available
from app.config import settings
from app.schemas.import_csv import ParsePreview, ImportCommit, ImportResult

router = APIRouter(prefix="/api/import", tags=["Import"])

# Per-format upload caps. PDF/Excel statements can legitimately be larger
# than a plain CSV (multi-page, formatting), so they get more headroom.
MAX_FILE_BYTES: dict[str, int] = {
    ".csv": 2 * 1024 * 1024,
    ".xlsx": 5 * 1024 * 1024,
    ".pdf": 5 * 1024 * 1024,
}


@router.get("/health")
def import_health() -> dict:
    """Is Gemini configured for the statement import feature?"""
    return {
        "status": "ok" if gemini_available() else "no_api_key",
        "model": settings.gemini_model,
    }


@router.post("/parse", response_model=ParsePreview)
async def parse_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ParsePreview:
    """Upload a bank statement (CSV, Excel, or PDF); Gemini extracts + classifies rows.

    Nothing is written to the database here — the user reviews first.
    """
    extension = Path(file.filename or "").suffix.lower()
    if extension not in MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a CSV, Excel (.xlsx), or PDF file.",
        )

    raw = await file.read()
    if len(raw) > MAX_FILE_BYTES[extension]:
        limit_mb = MAX_FILE_BYTES[extension] // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File too large (max {limit_mb} MB).")

    categories = resolve_categories(current_user.id, db)

    try:
        if extension == ".pdf":
            rows = extract_transactions_from_document(raw, "application/pdf", categories)
        else:
            if extension == ".xlsx":
                text = xlsx_to_text(raw)
            else:
                try:
                    text = raw.decode("utf-8-sig")
                except UnicodeDecodeError:
                    text = raw.decode("latin-1", errors="replace")

            if not text.strip():
                raise HTTPException(status_code=400, detail="The uploaded file is empty.")

            rows = extract_transactions_from_text(text, categories)
    except StatementImportError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return ParsePreview(count=len(rows), transactions=rows)


@router.post("/commit", response_model=ImportResult, status_code=201)
def commit_import(
    body: ImportCommit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportResult:
    """Insert the reviewed transactions, attributing them to an account + person."""
    if not body.transactions:
        raise HTTPException(status_code=400, detail="No transactions to import.")

    # Find the person by name (case-insensitive) or create one for this user.
    name = body.person_name.strip()
    person = (
        db.query(Person)
        .filter(Person.user_id == current_user.id, Person.name.ilike(name))
        .first()
    )
    if person is None:
        person = Person(user_id=current_user.id, name=name)
        db.add(person)
        db.flush()  # assign person.id without ending the transaction

    source = body.source.strip()
    for tx in body.transactions:
        db.add(
            Transaction(
                user_id=current_user.id,
                amount=tx.amount,
                type=tx.type.value,
                category=tx.category,
                description=tx.description,
                date=tx.date,
                source=source,
                ai_category=tx.category,  # Gemini already classified it
                person_id=person.id,
            )
        )

    db.commit()
    return ImportResult(
        imported=len(body.transactions), person_id=person.id, source=source
    )
```

- [ ] **Step 5: Update the router import in `main.py`**

In `backend/app/main.py`, change line 15:

```python
from app.routes.import_csv import router as import_router
```

to:

```python
from app.routes.import_statement import router as import_router
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && venv/bin/python -m pytest tests/ -v`
Expected: PASS — all tests across the suite, including the new `test_import.py`, `test_gemini_client.py`, `test_statement_importer.py`, `test_excel_importer.py`, plus the pre-existing `test_auth.py`, `test_summary.py`, `test_transactions.py`

- [ ] **Step 7: Commit**

```bash
git add backend/app/routes/import_statement.py backend/app/main.py backend/tests/test_import.py
git commit -m "feat: dispatch statement import by file extension (csv/xlsx/pdf)"
```

---

### Task 5: Frontend — generalize Import page copy and accepted file types

**Files:**
- Modify: `frontend/src/app/import/ImportPage.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: existing `parseCsvImport(token, file)` from `frontend/src/lib/api.ts` — unchanged, already accepts any `File`.
- Produces: no new exports; this is a UI-copy-only change.

- [ ] **Step 1: Update the dropzone and page copy**

In `frontend/src/app/import/ImportPage.tsx`, change:

```tsx
          <h1 className={s.title}>Import CSV</h1>
          <p className={s.subtitle}>Upload a bank statement — Gemini extracts &amp; categorizes each transaction</p>
```

to:

```tsx
          <h1 className={s.title}>Import Statement</h1>
          <p className={s.subtitle}>Upload a CSV, Excel, or PDF bank statement — Gemini extracts &amp; categorizes each transaction</p>
```

And change:

```tsx
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden
            onChange={e => { setFile(e.target.files?.[0] ?? null); setRows(null); setDone(null); }} />
          <FileUp size={22} />
          <span className={s.dropText}>{file ? file.name : "Click to choose a CSV file"}</span>
```

to:

```tsx
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf" hidden
            onChange={e => { setFile(e.target.files?.[0] ?? null); setRows(null); setDone(null); }} />
          <FileUp size={22} />
          <span className={s.dropText}>{file ? file.name : "Click to choose a CSV, Excel, or PDF file"}</span>
```

- [ ] **Step 2: Update the sidebar nav label**

In `frontend/src/components/layout/Sidebar.tsx`, change:

```tsx
  { id: "import", label: "Import CSV", icon: FileUp },
```

to:

```tsx
  { id: "import", label: "Import Statement", icon: FileUp },
```

- [ ] **Step 3: Verify the frontend builds cleanly**

There's no frontend test framework configured (only `dev`/`build`/`start`/`lint` scripts), so verify via a type-check + production build instead of a test run.

Run: `cd frontend && npm run build`
Expected: build completes with no TypeScript errors and no new lint failures related to `ImportPage.tsx` or `Sidebar.tsx`

- [ ] **Step 4: Manually verify in the browser**

Run: `cd frontend && npm run dev` (and the backend dev server), then in the browser:
1. Open the Import page — confirm it now reads "Import Statement" in the sidebar and header.
2. Click the dropzone file picker — confirm the OS file dialog allows selecting `.csv`, `.xlsx`, and `.pdf` files (not just `.csv`).
3. Upload a real `.csv` file end-to-end (existing behavior) and confirm the preview table still populates as before — this is a regression check, since this task only touched copy/attributes, not logic.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/import/ImportPage.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: update Import page copy and dropzone to accept CSV, Excel, and PDF"
```

---

## Post-Plan Verification

After all 5 tasks are complete:

```bash
cd backend && venv/bin/python -m pytest tests/ -v
cd ../frontend && npm run build
```

Both should pass with no failures. At that point, use the `/verify` skill to confirm the end-to-end flow (upload a real `.xlsx` and a real `.pdf` bank statement through the running app, not just the mocked tests) before considering this feature complete — the mocked route/unit tests confirm dispatch and coercion logic, but only a real Gemini call confirms the PDF inline-document prompt actually produces usable extractions.

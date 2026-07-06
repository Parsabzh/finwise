# Multi-format statement import (CSV + Excel + PDF)

## Problem

The import feature (`/api/import/parse` + `/api/import/commit`) only accepts CSV
files. Some banks only export statements as Excel (`.xlsx`) or PDF, so users
with those banks currently can't use the import feature at all.

## Goal

Accept `.csv`, `.xlsx`, and `.pdf` uploads on the same import flow, extracting
the same normalized transaction shape (`date`, `description`, `amount`,
`type`, `category`) regardless of source format, with no changes to the
preview/commit UI or the transaction schema.

## Key insight / architecture

The existing pipeline never parses CSV syntax itself — it decodes the upload
to text and asks Gemini to extract structured transactions from a prompt.
That means:

- **CSV and Excel** can share one path: convert to text, reuse the existing
  text-based extraction prompt untouched.
- **PDF** gets its own path: send the raw bytes to Gemini as an inline
  document part (`mime_type: application/pdf`). Gemini's multimodal model
  reads table layout natively, which is far more robust for real-world
  statement PDFs than local text extraction (multi-page, inconsistent
  columns, etc).

```
Route detects extension (.csv / .xlsx / .pdf)
  ├─ .csv  → decode as text ─────────────┐
  ├─ .xlsx → openpyxl → flatten to text ─┼─→ extract_transactions_from_text()
  └─ .pdf  → raw bytes ──────────────────→ extract_transactions_from_document()
```

Both extraction functions return the same `list[dict]` shape and share the
same row validation/coercion, so nothing downstream (Pydantic schemas, the
commit route, the frontend preview table) needs to change.

## Components

### `app/ai/gemini_client.py`

Refactor the existing retry/error-handling loop into a shared
`_post_generate_content(contents: list[dict]) -> str` helper. Two public
functions use it:

- `gemini_generate_json(prompt: str) -> str` — existing text-only path,
  behavior unchanged.
- `gemini_generate_json_with_document(prompt: str, document_bytes: bytes, mime_type: str) -> str`
  — new. Builds `contents` with two parts: `{"text": prompt}` and
  `{"inline_data": {"mime_type": mime_type, "data": base64(document_bytes)}}`.
  Same retry statuses (503), same `MAX_ATTEMPTS`, same `GeminiError` mapping.

### `app/ai/statement_importer.py` (renamed from `csv_importer.py`)

Keeps: `ImportError`, `_coerce_row`, `CATEGORY_HINTS` usage, `MAX_ROWS` cap.

The current "parse JSON from Gemini → coerce each row → cap at MAX_ROWS →
raise if empty" block is extracted into a private
`_parse_and_coerce(raw: str, categories: list[str]) -> list[dict]` helper so
both entry points share it instead of duplicating it.

Two public entry points:

- `extract_transactions_from_text(text: str, categories: list[str]) -> list[dict]`
  — today's `extract_transactions`, renamed, same prompt/behavior.
- `extract_transactions_from_document(document_bytes: bytes, mime_type: str, categories: list[str]) -> list[dict]`
  — new. Builds a document-flavored prompt (references "the attached bank
  statement document" instead of inlining CSV text) with the same field
  rules/category list, calls `gemini_generate_json_with_document`, then
  `_parse_and_coerce`.

### `app/ai/excel_importer.py` (new)

`xlsx_to_text(raw: bytes) -> str` using `openpyxl.load_workbook(BytesIO(raw), read_only=True, data_only=True)`.
Flattens every sheet into comma-joined rows (cell values stringified, `None`
→ empty string), newline-separated. If the workbook has more than one sheet,
prefix each sheet's block with a `# Sheet: <name>` line. Output is handed
directly to `extract_transactions_from_text` — no new prompt/AI code needed
for Excel.

Raises `ImportError` (or lets a clear exception propagate, caught by the
route) on an unreadable/corrupt file.

### `app/routes/import_statement.py` (renamed from `import_csv.py`)

Dispatch by lowercased file extension:

- `.csv` → decode text (existing `utf-8-sig` → `latin-1` fallback) →
  `extract_transactions_from_text`
- `.xlsx` → `xlsx_to_text(raw)` → `extract_transactions_from_text`
- `.pdf` → `extract_transactions_from_document(raw, "application/pdf", categories)`
- anything else → `400 Unsupported file type. Please upload a CSV, Excel
  (.xlsx), or PDF file.`

Per-type size caps (checked before any parsing):

```python
MAX_FILE_BYTES = {
    ".csv": 2 * 1024 * 1024,
    ".xlsx": 5 * 1024 * 1024,
    ".pdf": 5 * 1024 * 1024,
}
```

Router prefix (`/api/import`) and endpoint paths (`/parse`, `/commit`,
`/health`) are unchanged — only the module filename changes, for consistency
with `statement_importer.py`.

### `requirements.txt`

Add `openpyxl` (pinned to current stable, e.g. `openpyxl==3.1.5`).

## Error handling

- Unsupported extension → `400`, before any file processing or Gemini call.
- File exceeds its type's cap → `413` with a message naming that type's limit.
- Corrupt/unreadable `.xlsx` (openpyxl raising on bad zip/format) → caught,
  surfaced as `400 Could not read this Excel file. Make sure it's a valid
  .xlsx export.`
- Gemini failures (quota/busy/bad key/empty response) → unchanged `502` path
  via `GeminiError.user_message`, identical for both text-based and
  document-based calls.
- Empty extracted text (e.g. an all-blank spreadsheet) → reuses the existing
  "file is empty" `400` check.

## Frontend changes

- `ImportPage.tsx`: title → "Import Statement"; subtitle mentions
  CSV/Excel/PDF; dropzone `accept=".csv,.xlsx,.pdf"`; placeholder text
  updated accordingly.
- `Sidebar.tsx`: nav label "Import CSV" → "Import Statement".
- `api.ts`, Pydantic schemas (`ParsedTransaction`, `ParsePreview`, etc.), and
  the preview/edit table: **no changes** — they already operate on a generic
  `File` and a format-agnostic transaction shape.

## Testing

`backend/tests/` has an existing pytest suite (`test_auth.py`,
`test_summary.py`, `test_transactions.py`) but no import tests yet. Add
`backend/tests/test_import.py` covering:

- Extension-based dispatch: unsupported extension → 400.
- Per-type size cap enforcement (413) for `.csv`, `.xlsx`, `.pdf`.
- `xlsx_to_text` against a small in-memory workbook built with openpyxl.
- Extraction paths with Gemini calls mocked (no real API calls in tests),
  following the fixture patterns already in `conftest.py`.

## Out of scope

- OCR fallback for scanned/image-only PDFs beyond whatever Gemini's native
  document understanding already handles.
- Legacy `.xls` (binary Excel) support.
- Any change to how transactions are categorized, validated, or committed
  once extracted — that logic is untouched.

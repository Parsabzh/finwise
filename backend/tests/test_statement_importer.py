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

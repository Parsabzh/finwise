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

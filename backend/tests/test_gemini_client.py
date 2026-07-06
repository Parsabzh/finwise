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

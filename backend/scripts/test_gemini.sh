#!/usr/bin/env bash
# Quick health check for the Gemini API used by the CSV import feature.
# Reads GEMINI_API_KEY / GEMINI_MODEL from backend/.env (override by exporting them first).
#
# Usage:  bash backend/scripts/test_gemini.sh
set -euo pipefail

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
if [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
fi

MODEL="${GEMINI_MODEL:-gemini-flash-lite-latest}"

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "✗ GEMINI_API_KEY is not set (looked in $ENV_FILE)"; exit 1
fi

echo "Model:      $MODEL"
echo "Key prefix: ${GEMINI_API_KEY:0:6}…"
echo "Calling Gemini…"

HTTP=$(curl -s -o /tmp/gemini_test.json -w '%{http_code}' -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: ${GEMINI_API_KEY}" \
  -d '{"contents":[{"parts":[{"text":"Reply with the single word: ok"}]}]}')

if [ "$HTTP" = "200" ]; then
  TEXT=$(jq -r '.candidates[0].content.parts[0].text' /tmp/gemini_test.json)
  VER=$(jq -r '.modelVersion // "?"' /tmp/gemini_test.json)
  TOKENS=$(jq -r '.usageMetadata.totalTokenCount // "?"' /tmp/gemini_test.json)
  echo "✓ HTTP 200 — working. modelVersion=$VER, reply=\"$TEXT\", tokens=$TOKENS"
else
  echo "✗ HTTP $HTTP"
  jq -r '.error | "  status:  \(.status)\n  code:    \(.code)\n  message: \(.message)"' /tmp/gemini_test.json 2>/dev/null \
    || cat /tmp/gemini_test.json
fi
rm -f /tmp/gemini_test.json

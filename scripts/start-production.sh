#!/bin/bash
set -e
export NODE_ENV=production
export PORT="${PORT:-8080}"

echo "[start] Applying DB schema migrations…"
node artifacts/api-server/scripts/push-prod-schema.mjs

echo "[start] Starting API server on port $PORT…"
exec node artifacts/api-server/dist/index.mjs

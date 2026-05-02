#!/bin/bash
set -e
export NODE_ENV=production
export PORT="${PORT:-8080}"

# Schema migrations are already applied during the build step (build-production.sh).
# Do NOT re-run drizzle-kit push here — it blocks on an interactive prompt in Cloud Run
# containers, which prevents the server from starting and causes the health check to fail.

echo "[start] Starting API server on port $PORT…"
exec node artifacts/api-server/dist/index.mjs

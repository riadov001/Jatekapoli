#!/bin/bash
set -e
export NODE_ENV=production
export PORT="${PORT:-8080}"
exec node artifacts/api-server/dist/index.mjs

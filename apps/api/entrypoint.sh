#!/bin/sh
# Container entrypoint for the API service.
#
# Migrations are NOT run here; run them once via:
#   docker compose run --rm api alembic upgrade head
# or the CI deploy step. Running them inside the long-running container CMD
# causes a race when api replicas > 1 (concurrent alembic upgrade races).
set -e
# The container starts as root so we can fix ownership of the uploads dir — on
# Railway that's a freshly-mounted, root-owned Volume the non-root app can't write.
# After chowning, drop to the unprivileged `gink` user (gosu) to run the server.
mkdir -p /app/uploads
chown -R gink:gink /app/uploads 2>/dev/null || true
# Bind to $PORT when the platform injects one (Railway/Render/Heroku); fall back to
# 8080 for the docker-compose/Caddy setup (where Caddy proxies to a fixed 8080).
exec gosu gink uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8080}" \
  --workers 2 \
  --proxy-headers \
  --forwarded-allow-ips='*'

# Root Dockerfile for the API — builds from the REPO ROOT context so Railway (and
# anything that builds from the repo root) works with NO "Root Directory" setting.
# Same build as apps/api/Dockerfile, just with apps/api/ paths.
FROM python:3.12-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY apps/api/pyproject.toml apps/api/requirements.lock ./
# Install PINNED deps from the lockfile for reproducible builds (no latest-at-build
# drift). Includes the [stripe] extra (BILLING_PROVIDER=stripe; imported lazily).
# Regenerate after editing pyproject.toml:
#   uv pip compile apps/api/pyproject.toml --extra stripe -o apps/api/requirements.lock
# The app package itself runs from /app (on sys.path), so it isn't pip-installed.
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.lock

FROM python:3.12-slim AS runner
WORKDIR /app
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
# libgomp1: runtime dep for some wheels. gosu: entrypoint.sh starts as root to
# chown a freshly-mounted (root-owned) uploads volume, then drops to `gink` to run
# the server — without gosu installed that exec fails and the container crash-loops.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 gosu \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --no-create-home --shell /bin/false gink
COPY apps/api/ ./
# COPY preserves host file modes — force readable so a stray non-world-readable
# file can't crash the non-root user at import. Also pre-create the uploads dir
# owned by the runtime user (cover-image storage); on Railway mount a Volume here.
RUN chmod -R a+rX /app && chmod +x entrypoint.sh \
 && mkdir -p /app/uploads && chown gink:gink /app/uploads
# NOTE: intentionally NO `USER gink` here — entrypoint.sh must start as root so it
# can chown the mounted uploads volume, then it drops to `gink` via `gosu`.
EXPOSE 8080
# Self-contained healthcheck so the image is healthy under any orchestrator (not
# just compose/Railway, which also declare their own). Uses python (always present).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:'+os.environ.get('PORT','8080')+'/health', timeout=3).status==200 else 1)"
# Binds $PORT (Railway) with an 8080 fallback. Migrations run via railway.json's
# preDeployCommand (or `docker compose run --rm api alembic upgrade head`).
CMD ["./entrypoint.sh"]

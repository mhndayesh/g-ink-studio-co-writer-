# Contributing

Thanks for being interested in G-Ink Novel Studio.

## Setup

`./run.sh` (see [RUN.md](RUN.md) for the longer story).

## Architecture orientation

Start with the [README](README.md) (feature tour, stack, "what the AI sees") and [RUN.md](RUN.md) (how to run it + auth setup). Then read [Story_Forge_Docs.md](Story_Forge_Docs.md) for the product intent. The high-value invariants — the `{ok, data, error}` response envelope, routing every AI call through `llm_service.run(...)`, prompt fencing — are summarized in the checklist below.

## Before opening a PR

- `cd apps/api && .venv/bin/pytest -v` — all tests pass (~99 currently).
- `cd apps/web && npm run lint && npm run build` — frontend compiles.
- If you touched the DB schema, generate a migration: `.venv/bin/alembic revision --autogenerate -m "what changed"`. Current head: **0018**. (`test_migration_drift.py` will fail if a model has no matching migration.)
- If you added a new AI call, route it through `llm_service.run(...)` and tag the front-end mutation with `mutationKey: ["llm", "<name>"]` so the BusyOverlay picks it up.
- If your call injects author-controlled text into a prompt, wrap it with `fence(tag, content)` from `app.core.prompt_safety` and append `SECURITY_CLAUSE` to the system prompt.
- If you're resolving a character name to an id (approve flow or similar), use `name_to_any_id` (which excludes ambiguous names) rather than `existing_by_name` directly.

## Code style

- Backend: ruff defaults (configured in `apps/api/pyproject.toml`).
- Frontend: `next lint`.
- No comments that just restate the code. A comment should explain *why*, not *what*.

## Security rules (carry these forward)

- Secrets (`JWT_SECRET`, `LLM_KEY_ENCRYPTION_KEY`, provider API keys, billing tokens) must **never** appear in any git-tracked file. They live only in gitignored `apps/api/.env` / `apps/web/.env.local` (or your host's secret store).
- `run.sh` (git-tracked) generates dev secrets into those gitignored files at runtime — it must never contain a real secret value itself.
- `ADMIN_EMAILS` defaults to empty — must be set via env var; never hardcode an email in code.
- Any new endpoint that handles user-uploaded or author-written text must fence it with `prompt_safety.fence()` before sending to the LLM.

## What to avoid

The codebase has a handful of hard-won quirks — read these before changing LLM providers, JSON parsing, or the `.env` config resolution:
- LM Studio rejects `response_format: json_object` — never send it; prepend a system hint instead.
- Thinking models (Qwen3, DeepSeek-R1) emit `<think>…</think>` — stripped in `_clean_response()`.
- `passlib` is incompatible with `bcrypt>=5` — don't reintroduce it.
- `expire_on_commit=False` is set on the session factory — don't remove it; the post-approve graph commit relies on it.

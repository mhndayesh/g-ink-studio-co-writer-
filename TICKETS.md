# Tickets

Every fix or edit starts here. Open the ticket *before* touching a file.
Lifecycle: OPEN -> FIXING -> CLOSED (resolution + commit ref) or WONT-FIX (reason required).
Never delete a ticket. Only one ticket may be FIXING at a time.

> Bootstrapped 2026-11-11. T-001..T-003 are **back-filled** — the work happened in the
> same session that created this file, so they are recorded as CLOSED with the evidence
> that was captured at the time rather than being opened first.

## Template
### T-000 — short title
- **Status:** OPEN
- **Opened:** YYYY-MM-DD
- **Area:** file or subsystem
- **Problem:** what is wrong, and how it shows up.
- **Resolution:** (filled at close) what was done + commit ref.
- **Docs to update:** (filled at close) exact file + section, or `none`.

## Open

### T-010 — Upgrade Next 15 -> 16 to clear the remaining `next` / `postcss` advisory
- **Status:** OPEN
- **Opened:** 2026-11-11
- **Area:** `apps/web/package.json`, `apps/web/next.config.ts`
- **Problem:** `npm audit` still reports `next` (moderate, direct) and `postcss@8.4.31` nested
  under it (high). Both are only fixed by `next@16.4.6`, a semver-major jump from the current
  `^15.5.29`. An `overrides` entry for the nested postcss was tried and rejected: npm refuses an
  override against Next's exact pin and leaves the tree marked `invalid`, so it was reverted.
- **Resolution:** (filled at close) — needs a deliberate Next 16 migration (config, caching
  semantics, re-verify lint/tsc/build and the running app), not an audit-driven bump.
- **Docs to update:** (filled at close)

## Fixing

_none_

## Closed

### T-009 — Triage and fix the npm audit findings
- **Status:** CLOSED
- **Opened:** 2026-11-11
- **Area:** `apps/web` (`package-lock.json`)
- **Problem:** `npm ci` reported 9 vulnerabilities (7 moderate, 2 high) on a clean install.
- **Resolution:** Reduced 9 -> 8 and eliminated one of the two highs.
  - Fixed: `brace-expansion` (high, several DoS advisories) via `npm audit fix` — a non-breaking
    transitive bump. Lockfile diff is 3 lines.
  - Blocked upstream: the 5 `@typescript-eslint/*` moderates plus `minimatch`. `npm audit fix`
    cannot reshape that subtree, and there is **no patched release** — latest
    `@typescript-eslint/parser` is 8.72.2, the top of the affected range (`6.16.0 - 8.72.2`).
    Dev-only lint tooling; it never reaches the runtime bundle.
  - Blocked on a major: `next` (moderate) and `postcss@8.4.31` nested under it (high) need
    `next@16.4.6`. Tried an `overrides` entry for the nested postcss; npm rejects an override
    against Next's exact pin and leaves the node as `invalid`, so it was reverted to keep the tree
    consistent (`npm ls --depth=0` clean). Tracked as T-010.
- **Docs to update:** none.

### T-008 — Run the app natively on Windows (no WSL, no Docker)
- **Status:** CLOSED
- **Opened:** 2026-11-11
- **Area:** repo root, new `run.ps1`
- **Problem:** `run.sh` hardcodes the Unix venv layout (`$VENV/bin/python`, `bin/uvicorn`), so on
  native Windows it can only work under WSL — where it would also build a *Linux* venv unusable
  from PowerShell. There was no native way to start both services.
- **Resolution:** Added `run.ps1`, the native equivalent: creates `.venv` (Python 3.11+) and
  `node_modules` on first run, generates `apps/api/.env` with fresh secrets when missing, applies
  migrations, refuses to start on a busy port, then starts the API on :8080 and the web app on
  :3000 with logs in `.run-logs/`, and Ctrl+C kills both process trees. Options: `-NoReload`,
  `-ApiPort`, `-WebPort`.
  Verified by actually running it natively — not just by reading it: `GET /health` -> **200**
  `{"ok":true,"data":{"api":true,"db":true,"neo4j":null}}`; `GET /docs` -> 200;
  `GET :3000` -> **200**, 23,408 bytes, `<title>G-Ink Studio - Write, connect, publish</title>`.
  `pip check` clean, `import app.main` returns a FastAPI app, dev DB already at 0023 (head).
  Commit ref: see `CHANGES.md` 2026-11-11 (native runner).
- **Docs to update:** `RUN.md` — its Windows notes still say "use WSL2 or Git Bash"; now that
  `run.ps1` exists, that section should point at it first. Left for a separate edit so the doc
  change can be reviewed on its own.

### T-007 — Privacy policy still names Railway as a hosting provider
- **Status:** CLOSED
- **Opened:** 2026-11-11
- **Area:** `apps/web/app/privacy/page.tsx` (section 5, AR + EN)
- **Problem:** Both language blocks listed "Railway and Cloudflare — hosting, content delivery,
  and security", contradicting the Railway removal in T-006. Owner-facing legal text naming a
  subprocessor, so the wording could not be guessed.
- **Resolution:** Removed on the owner's instruction ("remove for now"). Section 5 now names only
  Cloudflare, described as content delivery + security. The "hosting" claim was deliberately not
  reassigned to Cloudflare (it is CDN/security, not application hosting) — so the policy now names
  no hosting provider at all. Verified: text-node-only edits, so no JSX structure changed —
  `<UL>`/`</UL>` still 8/8, `<li>` count unchanged at 26, Arabic text confirmed intact via a UTF-8
  read (not the console), and `git grep -i railway` over the tree excluding the log files returns
  nothing.
  Commit ref: see `CHANGES.md` 2026-11-11 (privacy policy entry).
- **Docs to update:** none. If Hetzner (per `DEPLOY.md`) should be disclosed as the host, that is a
  new ticket — it is a claim to add, not a stale one to fix.

### T-006 — Remove the Railway deploy path
- **Status:** CLOSED
- **Opened:** 2026-11-11
- **Area:** `railway.json`, `railway.worker.json`, `apps/web/railway.json`
- **Problem:** The docs cleanup (T-002) removed `RAILWAY.md`, leaving three Railway config files
  with nothing explaining them. Investigation found a third file the ticket did not know about
  (`apps/web/railway.json`), and that root `railway.json` was not documentation but live deploy
  behaviour: its `preDeployCommand` (`alembic upgrade head`) is the only thing migrating the DB on
  a Railway deploy, per `Dockerfile`. Deleting it blind would have shipped code against an
  unmigrated schema; the risk was raised before any file was removed.
- **Resolution:** Owner confirmed Railway is not wanted, so the whole deploy path was removed:
  all three configs deleted (`apps/web/railway.json` included), and every comment that claimed
  Railway builds or hosts this repo rewritten so nobody re-creates them — `Dockerfile` (3 sites,
  including the pre-deploy-migration note), `.dockerignore`, `apps/api/entrypoint.sh` (2),
  `apps/web/Dockerfile`, `apps/web/next.config.ts`, `docker-compose.prod.yml`, plus the generic
  host examples in `app/db/session.py` and `migrations/env.py`. `ci.yml`'s comment was held back
  at first — GitHub rejects any push touching `.github/workflows/` without the `workflow` token
  scope, which the account lacked at the time — and applied afterwards in commit `98c4ba5` once
  the owner re-authenticated with that scope. Comments only — no behaviour changed. Verified:
  `py_compile` exit 0 on both
  Python files, `tsc --noEmit` exit 0 on the frontend, and both YAML files still parse. Migration
  remains covered by `docker compose run --rm api alembic upgrade head` (documented in `DEPLOY.md`
  and now in the `Dockerfile` comment).
- **Docs to update:** `DEPLOY.md` already documents the compose-based path — no change needed.
  Follow-up for the privacy text tracked as T-007.

### T-005 — Commit the uncommitted authoring-lifecycle work
- **Status:** CLOSED
- **Opened:** 2026-11-11
- **Area:** `apps/api` (28 files) + `apps/web` (18 files), untracked: `workspace.py`,
  `post_approve.py`, `revision_service.py`, `text_stats.py`, migration `0023`, `notes/`, `search/`
- **Problem:** 46 modified + 9 untracked paths sitting uncommitted on `main`. Not reviewable,
  not backed up, and a `git checkout .` would destroy it.
- **Resolution:** Committed as **ce6d78e** after the verification in T-004 came back green
  (pytest 111 passed, ruff clean, web lint/tsc/build exit 0). The pre-existing `RUN.md` edit
  (migration head 0022 -> 0023) was kept and committed alongside rather than discarded. Scan of
  the incoming diff found no `console.log`, `print(`, `pdb` or `breakpoint()` leftovers.
  Working tree is now clean. Commit ref: `ce6d78e` (+ `RUN.md` in the close-out commit).
- **Docs to update:** none — `RUN.md` and `CONTRIBUTING.md` both now state head 0023 correctly.

### T-004 — Fresh install cannot run the CI job: greenlet missing, ruff unpinned
- **Status:** CLOSED
- **Opened:** 2026-11-11
- **Area:** `apps/api/pyproject.toml`
- **Problem:** Two reproducibility breaks, both found by running CI's own commands against a
  fresh install (CI is `workflow_dispatch`-only, so neither was ever exercised):
  1. `pytest -q` dies at collection: `ImportError: The SQLAlchemy asyncio module requires that
     the Python 'greenlet' library is installed`. `SQLAlchemy>=2.0.0` is declared without the
     `[asyncio]` extra, and nothing else pulls `greenlet` in.
  2. `ruff check app/` reports **391 errors** (218 auto-fixable) with the current resolver
     output, ruff 0.17.4. Most are in files nobody touched (`app/db/publishing_schemas.py` 72,
     `app/routers/social.py` 25). `ruff>=0.6.0` is unpinned; ruff 0.6.9 reports
     **All checks passed**, so the codebase is clean under the version it was written against.
- **Resolution:** `SQLAlchemy>=2.0.0` -> `SQLAlchemy[asyncio]>=2.0.0` (pulls `greenlet==3.5.6`) and
  `ruff>=0.6.0` -> `ruff>=0.6.0,<0.7` (resolves to 0.6.9). No application source was changed to
  make a check pass; the 391 errors were confirmed to be tool drift before pinning, by running
  the CI-era version on the same tree. Verified on a fresh venv (Python 3.11.15, built outside the
  repo) after reinstalling from the amended pyproject:
  - `ruff check app/` -> `All checks passed!` (exit 0)
  - `pytest -q` -> **111 passed, 0 failed, 0 skipped, 3 warnings in 88.50s** (exit 0)
  Commit ref: see `CHANGES.md` 2026-11-11 (packaging fix).
- **Docs to update:** none — `RUN.md`'s `pip install -e .[dev]` command is unchanged and now
  actually works. `CONTRIBUTING.md`'s pytest/ruff commands are still accurate.

### T-001 — Shrink repo: delete build artifacts and dependency trees
- **Status:** CLOSED
- **Opened:** 2026-11-11 (back-filled)
- **Area:** repo root, `apps/api`, `apps/web`
- **Problem:** 1.18 GB / 46,279 files, of which only 8.6 MB was actual source. Build and
  dependency trees dominated: `apps/web/.next` 413 MB, `apps/web/node_modules` 421 MB,
  `apps/api/.venv` 283 MB.
- **Resolution:** Deleted the three trees plus `.pytest_cache`, `.ruff_cache`, `gink_api.egg-info`,
  `tsconfig.tsbuildinfo` and every `__pycache__`. Result: **8.9 MB / 536 files**. Kept local
  config and data (`apps/api/.env`, `apps/web/.env.local`, `gink_dev.db`, `test_gink.db`).
  Verified no tracked file was touched. Commit ref: uncommitted (session work).
- **Docs to update:** `RUN.md` already documents the reinstall steps — no change needed.

### T-002 — Consolidate docs, remove the historical prototype
- **Status:** CLOSED
- **Opened:** 2026-11-11 (back-filled)
- **Area:** `*.md` at repo root, `story_forge.jsx`, `.dockerignore`
- **Problem:** Seven docs, of which three were stale or duplicate: `RAILWAY.md` (untouched since
  the initial release, duplicating `DEPLOY.md`), `Story_Forge_Docs.md` (self-labelled
  "Historical reference"), and `story_forge.jsx` (80 KB prototype, README said reference-only).
- **Resolution:** Deleted all three. Fixed every dangling pointer first: `README.md` (intro line +
  two repo-layout entries), `CONTRIBUTING.md` (dropped the "read Story_Forge_Docs.md" step and
  corrected the stale migration head 0018 -> 0023), `.dockerignore` (dropped the prototype entry),
  and four Python module docstrings (`db/models.py`, `services/context_builder.py`,
  `services/version_service.py`, `services/flow_service.py`) rewritten to stand alone instead of
  citing a deleted document. Verified: all internal `.md` links resolve, all four edited modules
  compile, `git grep` finds no dangling reference. Commit ref: uncommitted (session work).
- **Docs to update:** none — this ticket *was* the docs change.

### T-003 — Audit branches, stashes, worktrees and tags
- **Status:** CLOSED
- **Opened:** 2026-11-11 (back-filled)
- **Area:** git state
- **Problem:** Asked to "clean tickets" (branches/stashes/worktrees). Risk of stale local branches,
  forgotten stashes or orphaned worktrees holding work that looks committed but is not.
- **Resolution:** Audited and found nothing to clean: one local branch (`main`), **0 stashes**,
  one worktree, **0 tags**, 4 commits, `.git` 2.4 MB. No action taken beyond the audit.
- **Docs to update:** none.

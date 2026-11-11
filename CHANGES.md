# Changes

Every change lands here as it is made — what, and why. Newest first.

---

## 2026-11-11 — Privacy policy: Railway removed from the subprocessor list (T-007)

- `apps/web/app/privacy/page.tsx`: both language blocks of section 5 now read
  `<B>Cloudflare</B> — تقديم المحتوى والأمان` / `content delivery and security`.
  Why: the Railway deploy path was removed in T-006, so naming Railway as a hosting subprocessor
  was no longer true. The "hosting" claim was dropped with it rather than reassigned to
  Cloudflare, which provides CDN and security, not application hosting — inventing a replacement
  host would have written a false claim into legal text.
- Note: the policy now names **no** hosting provider. If the app runs on Hetzner per `DEPLOY.md`,
  adding it back is the owner's call, in both languages.

## 2026-11-11 — Removed the Railway deploy path (T-006)

- Deleted `railway.json`, `railway.worker.json`, `apps/web/railway.json`.
  Why: Railway is not used. The three files were the last trace of it after `RAILWAY.md` was
  removed in T-002. Root `railway.json` carried the `preDeployCommand` that ran
  `alembic upgrade head` on deploy, so this was flagged to the owner before deleting rather than
  executed blind.
- Rewrote the comments that told readers Railway builds this repo, so the configs don't get
  re-created from a stale note: `Dockerfile` (3 sites), `.dockerignore`, `apps/api/entrypoint.sh`
  (2), `apps/web/Dockerfile`, `apps/web/next.config.ts`, `docker-compose.prod.yml`, and the host
  examples in `app/db/session.py` + `migrations/env.py`.
- `.github/workflows/ci.yml` (`98c4ba5`): the header comment said Railway builds and deploys this
  repo directly; it now points at the docker-compose VPS path in `DEPLOY.md`. This had to be a
  separate commit — GitHub rejects any push touching a workflow file without the `workflow` token
  scope, which the account had to add first. Comment only; the file still parses.
  Comments only, no behaviour change. `$PORT` binding and the healthchecks stay: they are generic
  container behaviour, not Railway-specific.
- Opened T-007: the privacy policy still names Railway as a hosting subprocessor in both
  languages. Left untouched on purpose — naming the real host is a legal claim for the owner.

## 2026-11-11 — Committed the session work

- `a9b1056` chore(repo): shrink checkout, drop stale docs, add ticket log (T-001, T-002, T-003)
- `955ab49` fix(api): declare SQLAlchemy[asyncio], pin ruff below 0.7 (T-004)
- `ce6d78e` feat: authoring lifecycle — revisions, notes, search, real word counts, async
  post-approve (T-005)
- `RUN.md`: kept the pre-existing edit in the working tree (migration head 0022 -> 0023) and
  committed it rather than discarding it. Why: it was correct, and `CONTRIBUTING.md` now says
  the same thing.

## 2026-11-11 — API packaging: declare greenlet, pin ruff (T-004)

- `apps/api/pyproject.toml`: `SQLAlchemy>=2.0.0` -> `SQLAlchemy[asyncio]>=2.0.0`.
  Why: a fresh `pip install -e ".[dev]"` cannot import `app.db.session` at all —
  `ImportError: The SQLAlchemy asyncio module requires that the Python 'greenlet' library is
  installed`. Nothing else in the dependency set pulls greenlet in, so `pytest` failed during
  conftest collection on every clean machine.
- `apps/api/pyproject.toml`: `ruff>=0.6.0` -> `ruff>=0.6.0,<0.7`.
  Why: ruff 0.17.4 (what the unpinned range resolves to today) reports 391 errors on the
  unchanged codebase, 218 of them auto-fixable; ruff 0.6.9 reports "All checks passed". The
  code is clean under the version it was written against, so pin the range instead of
  rewriting ~40 untouched files as a side effect of installing deps.

## 2026-11-11 — Bootstrapped TICKETS.md and CHANGES.md

- Added both files at the repo root, tracked in git on purpose so the history is durable.
  Why: the queue had no home; work was being tracked in conversation only.
- Back-filled T-001..T-003 (repo shrink, docs consolidation, git-state audit) as CLOSED with
  the evidence captured when the work was done.
- Opened T-005 (commit the uncommitted authoring work), T-006 (orphaned Railway configs).

## 2026-11-11 — Docs consolidation, historical prototype removed (T-002)

- Deleted `RAILWAY.md`, `Story_Forge_Docs.md`, `story_forge.jsx`.
  Why: stale duplicate deploy doc, a self-labelled historical reference, and an 80 KB prototype
  the README already called reference-only.
- `README.md`: dropped the prototype sentence from the intro and its two entries in the
  repo-layout tree. Why: both pointed at deleted files.
- `CONTRIBUTING.md`: removed the "Then read Story_Forge_Docs.md" step; corrected the migration
  head `0018` -> `0023` (actual latest is `0023_authoring_lifecycle.py`). Why: dead pointer plus
  a fact that had drifted three migrations.
- `.dockerignore`: removed the `story_forge.jsx` entry. Why: file no longer exists.
- `apps/api/app/db/models.py`, `services/context_builder.py`, `services/version_service.py`,
  `services/flow_service.py`: rewrote module docstrings that cited `Story_Forge_Docs.md §6` /
  `§5.2` / the prototype's `FlowTab`. Why: referencing a deleted document makes the comment
  unverifiable; the sentences now state the same fact on their own.

## 2026-11-11 — Repo shrunk from 1.18 GB to 8.9 MB (T-001)

- Deleted `apps/web/.next` (413 MB), `apps/web/node_modules` (421 MB), `apps/api/.venv`
  (283 MB), plus `.pytest_cache`, `.ruff_cache`, `gink_api.egg-info`, `tsconfig.tsbuildinfo`
  and all `__pycache__`. Why: gitignored build/dependency output, 99.2% of the tree, none of it
  source. Reinstall steps are in `RUN.md`.
- Kept `apps/api/.env`, `apps/web/.env.local`, `gink_dev.db`, `test_gink.db`.
  Why: local secrets/config and dev data, not reproducible from the repo.

## 2026-11-11 — Verified the uncommitted authoring work against CI's own commands (T-004 evidence)

- Ran CI's API job (`ruff check app/`, `pytest`) and Web job (`npm run lint`,
  `npx tsc --noEmit`, `npm run build`) against a fresh install, built **outside** the repo at
  `%TEMP%\opencode\gink-venv` and `%TEMP%\opencode\gink-web-modules` so the checkout stays small.
- Web: all three gates exit 0; the new `/studio/[storyId]/notes` and `/search` routes compile.
- API: `pytest` initially failed at collection (greenlet — fixed above); `ruff` failed only
  under ruff 0.17.4 (drift — pinned above).
- No source file of the in-progress work was modified to make any check pass.

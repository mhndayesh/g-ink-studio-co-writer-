"""The only entry point for LLM calls. Logs every run, catches errors, falls back.

Every AI feature in this codebase must go through `run()` — no router should
talk to a provider directly. This guarantees consistent logging, telemetry,
and graceful degradation when the configured provider is unreachable.
"""
from __future__ import annotations

import json
import logging
import time
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import PaymentRequired, QuotaExceeded
from app.db.models import LLMRun, User
from app.services import entitlement_service
from app.services.llm.base import ChatResponse, LLMProvider, Message
from app.services.llm.factory import get_provider_for_page
from app.services.llm.fallback import FallbackProvider

log = logging.getLogger("gink.llm")


def _excerpt(text: str, n: int = 800) -> str:
    return text if len(text) <= n else text[:n] + "…"


def _estimate_tokens(text: str) -> int:
    """Approximate token count from char length (~4 chars/token).

    Streaming providers rarely emit a usage block, so the streamed run otherwise
    logs tokens_in/out=0 — which makes the per-period token cap unenforceable on
    the streaming path (a house-key leak). An estimate is far better than zero.
    """
    return max(0, (len(text or "") + 3) // 4)


def _gate_or_raise(auth) -> None:
    if not auth.allowed:
        if auth.reason == "trial_exhausted":
            raise PaymentRequired(auth.message, details={"reason": auth.reason})
        raise QuotaExceeded(auth.message, details={"reason": auth.reason})


async def run(
    db: AsyncSession,
    user: User,
    *,
    page: str,
    system: str,
    user_msg: str,
    json_mode: bool = False,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    story_id: str | None = None,
    provider: LLMProvider | None = None,
    meter: bool = True,
) -> tuple[ChatResponse, bool]:
    """Run a chat completion; log result; return (response, used_fallback).

    If the real provider raises, retry once on the FallbackProvider so the
    caller always gets a response.

    Enforces the user's subscription entitlement first: decides which key pays
    (house vs BYOK) and blocks the call when the plan's usage limit is reached.
    Set ``meter=False`` for diagnostics that should bypass the usage cap.
    """
    auth = await entitlement_service.authorize_ai(db, user, page, meter=meter)
    _gate_or_raise(auth)

    if provider is None:
        provider = await get_provider_for_page(db, user, page, key_source=auth.key_source)

    messages = [Message("system", system), Message("user", user_msg)]

    # Insert a placeholder LLMRun row BEFORE calling the provider. The metering
    # query (`authorize_ai`) counts existing rows, so inserting first means any
    # concurrent request that passes the cap check will see this row, preventing
    # N parallel calls from all passing a cap of 1 (the count-then-spend race).
    # The row is updated with actual metrics after the call completes.
    logged_key_source = "none" if not meter else auth.key_source
    run_row = LLMRun(
        user_id=user.id,
        story_id=story_id,
        provider=provider.name,
        model=provider.default_model,
        page=page,
        prompt_excerpt=_excerpt(f"SYSTEM:\n{system}\n\nUSER:\n{user_msg}"),
        response_excerpt="",
        key_source=logged_key_source,
    )
    db.add(run_row)
    await db.flush()  # makes the row visible to concurrent requests in the same tx

    started = time.monotonic()
    fallback_used = False
    error = ""

    try:
        resp = await provider.chat(
            messages,
            json_mode=json_mode,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as e:
        log.warning("Provider %s failed (%s); using fallback", provider.name, e)
        fallback_used = True
        error = str(e)
        resp = await FallbackProvider().chat(messages, json_mode=json_mode)

    # A HTTP-200 response with empty/blank text is a SILENT degradation: the model
    # produced nothing usable (a reasoning model burned its whole budget on
    # <think>, truncated, refused, …). Without this, callers do `parse_json(...) or
    # {}` and surface an authoritative-looking empty result — while still billing
    # tokens. Treat it exactly like a provider failure so the caller gets the
    # honest fallback + an accurate `fallback=True` flag (and the row downgrades to
    # key_source="none", so an empty answer is never metered against the user).
    if not fallback_used and not (resp.text or "").strip():
        log.warning("Provider %s returned an empty response (page=%s); using fallback", provider.name, page)
        fallback_used = True
        error = error or "empty_response"
        resp = await FallbackProvider().chat(messages, json_mode=json_mode)

    # JSON-mode retry: the provider responded (non-empty) but the text doesn't
    # contain parseable JSON — the model spent its tokens on a thinking preamble
    # and never reached the JSON answer. One targeted retry at temperature=0 with
    # an explicit "start with {" instruction forces JSON-first output regardless of
    # provider, model, or thinking mode. We reuse the same llm_run row so this
    # costs nothing extra in metering terms.
    if json_mode and not fallback_used and (resp.text or "").strip() and parse_json(resp.text) is None:
        log.info("JSON-mode retry for page=%s (provider=%s, response did not contain JSON)", page, provider.name)
        retry_messages = messages + [Message("user", "Output ONLY valid JSON. Start your response immediately with {")]
        try:
            # Double the token budget on retry: if the model still emits a
            # thinking preamble, the JSON answer must fit in the remaining space.
            retry_max = (max_tokens * 2) if max_tokens else None
            retry_resp = await provider.chat(
                retry_messages,
                json_mode=json_mode,
                temperature=0,
                max_tokens=retry_max,
            )
            if retry_resp.text and parse_json(retry_resp.text) is not None:
                resp = retry_resp
                error = (error + " [json_retry_ok]").lstrip()
        except Exception as retry_err:
            log.warning("JSON-mode retry failed for page=%s: %s", page, retry_err)

    elapsed_ms = (time.monotonic() - started) * 1000.0

    # Downgrade key_source to "none" if the real provider degraded to fallback.
    if fallback_used or not meter:
        run_row.key_source = "none"

    # Update the placeholder row with actual metrics now that the call is done.
    run_row.provider = "fallback" if fallback_used else provider.name
    run_row.model = resp.model
    run_row.response_excerpt = _excerpt(resp.text)
    run_row.tokens_in = resp.tokens_in
    run_row.tokens_out = resp.tokens_out
    run_row.ms = elapsed_ms
    run_row.fallback = fallback_used
    run_row.error = error
    await db.flush()

    return resp, fallback_used


async def _insert_stream_placeholder(
    *, user_id, story_id, provider_name, page, system, user_msg, key_source,
) -> str | None:
    """Insert a pre-flight LLMRun row (fresh, committed session) BEFORE streaming
    starts, mirroring run()'s placeholder. Returns the row id so the finalizer can
    fill in metrics.

    Making the row durable up front closes the count-then-spend race the streaming
    path otherwise reopens: previously the row only appeared in the `finally` after
    the stream finished, so N parallel streams all passed a cap of 1."""
    from app.db.session import SessionLocal
    try:
        async with SessionLocal() as s:
            row = LLMRun(
                user_id=user_id,
                story_id=story_id,
                provider=provider_name,
                model=provider_name,
                page=page,
                prompt_excerpt=_excerpt(f"SYSTEM:\n{system}\n\nUSER:\n{user_msg}"),
                response_excerpt="",
                key_source=key_source,
            )
            s.add(row)
            await s.commit()
            return row.id
    except Exception:
        log.warning("failed to insert stream placeholder LLM run", exc_info=True)
        return None


async def _finalize_stream_run(
    *, run_id, user_id, story_id, provider_name, page, system, user_msg, full_text,
    elapsed_ms, fallback_used, error, key_source,
) -> None:
    """Fill in the streamed run's metrics on a FRESH session — the request session
    is already closed by the time the StreamingResponse finishes. Updates the
    pre-flight placeholder by id; if that insert failed, inserts a row instead so
    the run is still recorded."""
    from app.db.session import SessionLocal
    tokens_in = _estimate_tokens(f"{system}\n{user_msg}")
    tokens_out = _estimate_tokens(full_text)
    try:
        async with SessionLocal() as s:
            row = await s.get(LLMRun, run_id) if run_id else None
            if row is None:
                row = LLMRun(user_id=user_id, story_id=story_id, page=page,
                             prompt_excerpt=_excerpt(f"SYSTEM:\n{system}\n\nUSER:\n{user_msg}"))
                s.add(row)
            row.provider = "fallback" if fallback_used else provider_name
            row.model = provider_name
            row.response_excerpt = _excerpt(full_text)
            row.tokens_in = tokens_in
            row.tokens_out = tokens_out
            row.ms = elapsed_ms
            row.fallback = fallback_used
            row.error = error
            row.key_source = key_source
            await s.commit()
    except Exception:
        log.warning("failed to finalize streamed LLM run", exc_info=True)


async def open_stream(
    db: AsyncSession,
    user: User,
    *,
    page: str,
    system: str,
    user_msg: str,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    story_id: str | None = None,
    meter: bool = True,
) -> AsyncIterator[str]:
    """Authorize + resolve the provider NOW (request session alive), then return
    an async generator that streams text deltas and logs the run when finished.

    The returned generator runs DURING the StreamingResponse, after the request's
    DB session has closed — so it never touches `db`; it logs via its own session.
    """
    auth = await entitlement_service.authorize_ai(db, user, page, meter=meter)
    _gate_or_raise(auth)
    provider = await get_provider_for_page(db, user, page, key_source=auth.key_source)

    # Capture plain values — do NOT close over the request session or ORM objects.
    uid = user.id
    key_source = auth.key_source
    pname = provider.name

    # Pre-flight placeholder row (mirrors run()) — durable BEFORE the stream opens
    # so it's metered and visible to concurrent cap checks, closing the race.
    logged_key_source = "none" if not meter else key_source
    run_id = await _insert_stream_placeholder(
        user_id=uid, story_id=story_id, provider_name=pname, page=page,
        system=system, user_msg=user_msg, key_source=logged_key_source,
    )

    async def _gen() -> AsyncIterator[str]:
        messages = [Message("system", system), Message("user", user_msg)]
        started = time.monotonic()
        chunks: list[str] = []
        fallback_used = False
        error = ""
        try:
            async for delta in provider.stream(messages, temperature=temperature, max_tokens=max_tokens):
                chunks.append(delta)
                yield delta
        except Exception as e:
            log.warning("Stream provider %s failed (%s); using fallback", pname, e)
            error = str(e)
            # Only substitute the fallback if nothing was streamed yet (don't
            # splice stub text onto a half-real response).
            if not chunks:
                fallback_used = True
                async for delta in FallbackProvider().stream(messages):
                    chunks.append(delta)
                    yield delta
        finally:
            await _finalize_stream_run(
                run_id=run_id, user_id=uid, story_id=story_id, provider_name=pname,
                page=page, system=system, user_msg=user_msg, full_text="".join(chunks),
                elapsed_ms=(time.monotonic() - started) * 1000.0,
                fallback_used=fallback_used, error=error,
                key_source=("none" if (fallback_used or not meter) else key_source),
            )

    return _gen()


async def embed(
    db: AsyncSession,
    user: User,
    texts: list[str],
    *,
    story_id: str | None = None,
    meter: bool = True,
) -> list[list[float]]:
    """The single choke point for embeddings.

    Resolves the user's embedding provider (BYOK → their own key/model; house tiers
    → the house embedder) and, when the call is house-paid (key_source="server"),
    logs an LLMRun so embedding cost is on the ledger and counts against the plan —
    instead of being an invisible, unbounded house-key leak. BYOK ("user") and the
    free local fallback ("none") are never metered.

    Best-effort: callers wrap this in try/except and degrade RAG on failure.
    """
    from app.services.llm.factory import get_embedding_provider_with_source

    provider, key_source = await get_embedding_provider_with_source(db, user)
    started = time.monotonic()
    vectors = await provider.embed(texts)

    if meter and key_source == "server":
        # Log via a FRESH committed session so the row is durable regardless of
        # whether the calling route commits its own transaction (e.g. the SSE
        # companion stream never commits the request session) — otherwise the
        # metering would silently roll back, recreating the leak.
        await _log_embedding_run(
            user_id=user.id, story_id=story_id, provider_name=provider.name,
            model=getattr(provider, "default_embed_model", "") or provider.name,
            tokens_in=_estimate_tokens("\n".join(texts)),
            elapsed_ms=(time.monotonic() - started) * 1000.0,
        )

    return vectors


async def _log_embedding_run(*, user_id, story_id, provider_name, model, tokens_in, elapsed_ms) -> None:
    from app.db.session import SessionLocal
    try:
        async with SessionLocal() as s:
            s.add(LLMRun(
                user_id=user_id, story_id=story_id, provider=provider_name, model=model,
                page="embedding", prompt_excerpt="[embedding]", response_excerpt="",
                tokens_in=tokens_in, tokens_out=0, ms=elapsed_ms, key_source="server",
            ))
            await s.commit()
    except Exception:
        log.warning("failed to log embedding run", exc_info=True)


def parse_json(text: str) -> dict | list | None:
    """Best-effort JSON parse: strips code fences, recovers from truncation.

    Handles every provider and thinking/non-thinking mode. Attempt order:

    1. Direct json.loads  — clean responses
    2. raw_decode(first_pos)  — JSON with trailing prose ("Here you go!")
    3. repair(first_pos)  — truncated root object (hit max_tokens mid-JSON)
    4. raw_decode each subsequent pos  — thinking preamble then complete JSON
    5. repair(last_pos)  — thinking preamble then truncated JSON at end

    Step 3 MUST come before step 4: without it, scan finds the first COMPLETE
    nested sub-object inside a truncated root and returns that instead of the
    full repaired root — callers then get a dict without the expected top-level
    keys (e.g. no "traits") and silently return empty results.
    """
    if not text:
        return None
    t = text.strip()

    import re as _re
    t = _re.sub(r"<think>.*?</think>", "", t, flags=_re.DOTALL | _re.IGNORECASE).strip()

    if t.startswith("```"):
        t = t.strip("`")
        if t.startswith("json"):
            t = t[4:]
        t = t.strip()

    # 1. Direct parse — perfect responses from any provider
    try:
        return json.loads(t)
    except Exception:
        pass

    # Find first { or [
    first_pos = next((i for i, ch in enumerate(t) if ch in ("{", "[")), -1)
    if first_pos < 0:
        return None

    dec = json.JSONDecoder()

    # 2. raw_decode from first position — JSON followed by trailing text
    try:
        obj, _end = dec.raw_decode(t, first_pos)
        return obj
    except Exception:
        pass

    # 3. Repair from first position — truncated root object (max_tokens cut)
    #    This must run BEFORE scanning deeper positions so we return the full
    #    (repaired) root object rather than a complete nested sub-object.
    repaired = _repair_truncated_json(t[first_pos:])
    if repaired:
        try:
            return json.loads(repaired)
        except Exception:
            pass

    # 4. Scan every subsequent { and [ — thinking preamble then JSON at end
    last_pos = first_pos
    for i in range(first_pos + 1, len(t)):
        if t[i] not in ("{", "["):
            continue
        last_pos = i
        try:
            obj, _end = dec.raw_decode(t, i)
            return obj
        except Exception:
            pass

    # 5. Repair from last position — thinking preamble then truncated JSON
    if last_pos > first_pos:
        repaired2 = _repair_truncated_json(t[last_pos:])
        if repaired2:
            try:
                return json.loads(repaired2)
            except Exception:
                pass

    return None


def _repair_truncated_json(t: str) -> str | None:
    """Close unclosed strings, arrays, and objects so a truncated response parses.

    Walks the string respecting string quoting + escapes; at the end, appends
    whatever closers are needed in the right order.
    """
    stack: list[str] = []
    in_string = False
    escape = False
    for i, ch in enumerate(t):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]":
            if stack and stack[-1] == ch:
                stack.pop()
            else:
                return None  # mismatched — can't safely repair

    # Trim trailing partial garbage after the last clean comma/colon
    s = t
    if in_string:
        # Close the open string
        s = s + '"'
    # Drop trailing comma-or-colon-and-junk before closing
    s = s.rstrip().rstrip(",").rstrip(":").rstrip()
    if s.endswith('"'):  # close key without value → drop it
        # Find the comma that precedes this dangling key/value pair
        depth = 0
        cut = -1
        in_s = False
        esc = False
        for i, ch in enumerate(s):
            if in_s:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_s = False
                continue
            if ch == '"':
                in_s = True
            elif ch in "{[":
                depth += 1
            elif ch in "}]":
                depth -= 1
            elif ch == "," and depth == len(stack):
                cut = i
        if cut > 0:
            s = s[:cut]
    # Append closers in reverse stack order
    return s + "".join(reversed(stack))

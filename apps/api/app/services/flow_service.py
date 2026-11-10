"""Flow Writing pipeline: polish rough prose, extract entities, commit a chapter.

Three calls:
  polish(raw, notes)   → polished prose
  extract(polished)    → {title_suggestion, characters, events, themes, locations}
  approve(...)         → commits a new chapter, adds opted-in characters and themes,
                         creates a story_versions snapshot, schedules graph re-projection.
"""
from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.prompt_safety import fence, security_clause
from app.core.errors import Conflict, NotFound
from app.db.models import (
    Chapter,
    Character,
    CharacterRelationship,
    Event,
    Faction,
    FlowDraft,
    Location,
    PlotThread,
    PlotThreadSceneLink,
    Revelation,
    SceneCard,
    Story,
    Theme,
    User,
    World,
)
from app.db.schemas import (
    ExtractedScene,
    FlowApproveRequest,
    FlowEnhanceResponse,
    FlowExtractResponse,
    FlowPolishResponse,
)
from app.services import llm_service
from app.services.context_builder import build_story_context
from app.services.prompts_ar import localized_prompt
from app.services.story_language import get_story_language
from app.services import text_stats

log = logging.getLogger("gink.flow")

# Short-lived cache so the polish → extract pair reuses one context build (each
# build is ~14 SELECTs over unchanged data). Tokens are opaque, expire in 15
# minutes, and the cache is bounded to avoid unbounded memory growth.
_CTX_CACHE: dict[str, tuple[float, str, dict]] = {}
_CTX_TTL = 900
_CTX_MAX = 32


def _cache_context(ctx: str, meta: dict) -> str:
    now = time.time()
    for token, (exp, _ctx, _meta) in list(_CTX_CACHE.items()):
        if exp <= now:
            _CTX_CACHE.pop(token, None)
    if len(_CTX_CACHE) >= _CTX_MAX:
        oldest = min(_CTX_CACHE.items(), key=lambda kv: kv[1][0])[0]
        _CTX_CACHE.pop(oldest, None)
    token = uuid.uuid4().hex
    _CTX_CACHE[token] = (now + _CTX_TTL, ctx, meta)
    return token


def _cached_context(token: str | None) -> tuple[str, dict] | None:
    if not token:
        return None
    entry = _CTX_CACHE.get(token)
    if entry is None:
        return None
    exp, ctx, meta = entry
    if exp <= time.time():
        _CTX_CACHE.pop(token, None)
        return None
    return ctx, meta


POLISH_SYSTEM = """You are a literary editor. The author writes freely with imagination but limited craft.
Your job: rewrite their raw text as polished, evocative prose that respects the story's world and characters.

The STORY CONTEXT below shows what has already happened — characters, world rules, prior chapters.
The raw text you receive is the NEXT SCENE in this continuing story. Keep it consistent with the
world, the established cast's voices, and what's come before.

Rules:
- Keep the author's intent and key facts intact.
- Match the genre's tone.
- Existing characters should sound like themselves (consult their CAST entries).
- Never invent new characters, locations, or rules — only use what the author wrote or what the WORLD context describes.
- Return ONLY the polished prose, no headers, no commentary.
"""

EXTRACT_SYSTEM = """You are a story analyst. Given a polished scene, extract EVERY piece of
structured information so the writer doesn't have to file anything by hand.

This scene is a CONTINUATION of the story shown in STORY CONTEXT. Treat the existing CAST,
LOCATIONS, FACTIONS, THEMES, and PLOT THREADS as already-known. Only flag truly new entities.
For plot threads that the existing CHAPTERS established, reuse the SAME name and update the
status if this scene resolves or abandons them ("open" → "paid_off" / "abandoned"). Surface
new relationships (or evolutions of old ones) that this scene reveals between named characters.

Return ONLY a single JSON object with EXACTLY these keys:

  title_suggestion: short chapter title (≤ 60 chars)
  summary: 1-2 sentence summary
  pov_suggestion: name of the POV character (must match a name in `characters`)
  location_suggestion: primary location of the scene (must match a name in `locations`)

  characters: every character that appears or is named in the scene
              [{"name": "...", "role": "protagonist|antagonist|ally|mentor|rival|supporting|...",
                "note": "1-line summary of their role IN THIS SCENE",
                "status": "alive|dead|unknown|missing|transformed — ONLY set if status CHANGED in this scene; omit or empty string if unchanged",
                "arc_note": "1-sentence character development observed in this scene — omit or empty if no clear growth/change",
                "character_id": "the exact [id:…] value from the CAST entry this refers to, or null if brand-new",
                "is_new": true|false}]
              Mark is_new=true ONLY if absent from the provided CAST.
              If the character IS in the CAST, copy their exact [id:…] into
              character_id (drop the "id:" prefix — just the value). This is how we
              tell apart two cast members who share a name, so always include it for
              existing characters. Leave character_id null only for is_new=true.

  relationships: any relationship between two characters that the scene reveals
              [{"source": "<character name>", "target": "<character name>",
                "type": "ally|enemy|lover|rival|family|friend|mentor|student|colleague|...",
                "description": "1-line description"}]
              Both source and target MUST appear in characters[].

  events: every plot-relevant event in the scene
              [{"kind": "encounter|revelation|betrayal|death|decision|conflict|...",
                "description": "1-2 sentences",
                "involved": ["<character name>", ...]}]

  themes: thematic ideas the scene explores
              ["theme phrase 1", "theme phrase 2"]

  locations: every named place that appears in the scene
              [{"name": "...", "description": "1-line description"}]

  factions: organizations, gangs, houses, governments, cults named in the scene
              [{"name": "...", "description": "1-line description"}]

  threads: open subplots / dangling threads to track
              [{"name": "...", "description": "1-line summary", "status": "open|paid_off|abandoned"}]

  world_rules: any NEW rules, laws, or facts about how this world works that this scene
               reveals — things a reader must know to understand the story logic.
               Only rules that are genuinely revealed FOR THE FIRST TIME in this scene.
               Empty array if nothing new.
               ["The smoke entity can mark a person it chooses to observe.", ...]

  world_lore:  NEW background lore, history, or worldbuilding detail revealed in this scene.
               A single string; empty string if nothing new.
               "Two years ago the city's crime rate inexplicably collapsed overnight."

  scenes: scene-level beat cards in reading order — extract EVERY distinct scene shift
              (location change, time jump, or new dramatic beat = new scene card).
              A chapter with 5–6 beats must have 5–6 cards. Never collapse multiple
              beats into one.
              [{
                "ordinal": 1,
                "title": "short scene title",
                "beat": "inciting incident|reversal|aftermath|decision|revelation|conflict|...",
                "summary": "1 sentence",
                "goal": "what the POV/scene wants",
                "conflict": "what blocks the goal",
                "outcome": "what changes by the end",
                "pov": "<character name>",
                "location": "<location name>",
                "characters": ["<character name>", ...],
                "plot_threads": ["<thread name>", ...],
                "time_anchor": "story-time label if stated e.g. '7pm'",
                "time_sort_key": null,
                "duration_hint": "minutes|hours|...",
                "sensory_palette": {"sight": 0-100, "sound": 0-100, "smell": 0-100, "taste": 0-100, "touch": 0-100},
                "revelations": [],
                "source_excerpt": "1–2 sentence excerpt",
                "content": ""
              }]

Rules:
- Use ONLY information present in the POLISHED SCENE. Do not invent.
- Do NOT extract section headers from the STORY CONTEXT (e.g. "WORLD", "CAST", "CHAPTERS")
  as characters or anything else — those are formatting, not story content.
- If a field has nothing, return an empty array (NEVER omit a key).
- sensory_palette values are integers 0–100 representing how strongly that sense is engaged
  in the scene (0 = absent, 100 = overwhelming). Never leave all five at 0 — every scene
  engages at least sight and usually sound. Base the scores on the actual prose.
- Return ONLY the JSON object — no prose, no code fences, no markdown."""


ENHANCE_SYSTEM = """You are a language editor. Your only job is to improve the language quality
of the author's text without touching the story in any way.

Steps:
1. Detect the language of the input text (it may be Arabic, English, or any other language).
2. Fix grammar, punctuation, word choice, sentence flow, and style — in THAT language.
3. Keep EXACTLY the same story content: same events, characters, dialogue meaning, plot beats.
4. Do NOT translate. The output must be in the same language as the input.
5. Do NOT add, remove, or change any story elements. Only the language quality improves.
6. Preserve the author's voice — clean up errors without rewriting their style entirely.

Return ONLY a single JSON object with these keys:
  language: detected language name in English (e.g. "Arabic", "English", "French")
  enhanced: the improved text in the same language as the input
  notes: one or two sentences in English describing what was improved"""


async def enhance(db: AsyncSession, user: User, story_id: str, raw: str) -> FlowEnhanceResponse:
    """Language-enhance the author's own text without changing the story."""
    lang = await get_story_language(db, story_id)
    resp, fb = await llm_service.run(
        db, user, page="flow.enhance",
        system=localized_prompt("flow.enhance", lang, ENHANCE_SYSTEM) + "\n\n" + security_clause(lang),
        user_msg="AUTHOR TEXT TO ENHANCE:\n" + fence("author_text", raw),
        json_mode=True, temperature=0.2, story_id=story_id,
        language=lang,
        localize_output=False,  # enhance preserves the input's language by design
    )
    parsed = llm_service.parse_json(resp.text) or {}
    if not isinstance(parsed, dict):
        parsed = {}
    enhanced_text = (parsed.get("enhanced") or "").strip()
    return FlowEnhanceResponse(
        language=(parsed.get("language") or "").strip(),
        enhanced=enhanced_text if enhanced_text else raw,
        notes=(parsed.get("notes") or "").strip(),
        fallback=fb,
    )


def _clean_name_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            continue
        name = item.strip()
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        out.append(name)
    return out


def _clean_sensory(value: object) -> dict[str, int]:
    senses = {"sight": 0, "sound": 0, "smell": 0, "taste": 0, "touch": 0}
    if not isinstance(value, dict):
        return senses
    for key in senses:
        raw = value.get(key, 0)
        try:
            n = int(float(raw))
        except Exception:
            n = 0
        senses[key] = max(0, min(100, n))
    return senses


def _clean_sort_key(value: object) -> float | None:
    if value in ("", None):
        return None
    try:
        return float(value)
    except Exception:
        return None


async def polish(
    db: AsyncSession,
    user: User,
    story_id: str,
    raw: str,
    notes: str = "",
    *,
    scene_character_ids: list[str] | None = None,
    scene_location_id: str | None = None,
) -> FlowPolishResponse:
    # Scene setup (optional): pin the in-scene cast's full identity + place identity
    # so the characters actually in this scene always get their complete voice.
    # Entity ids are included so the SAME context can be handed to extract.
    ctx_meta: dict = {}
    ctx = await build_story_context(
        db, story_id,
        include_entity_ids=True,
        scene_character_ids=scene_character_ids,
        scene_location_id=scene_location_id,
        meta=ctx_meta,
    )
    context_token = _cache_context(ctx, ctx_meta)
    user_msg = (
        "STORY CONTEXT (reference only):\n"
        f"{fence('story_context', ctx)}\n\n"
        "RAW DRAFT (the next scene to polish):\n"
        f"{fence('author_draft', raw)}"
    )
    if notes.strip():
        user_msg += "\n\nREVISION NOTES FROM AUTHOR:\n" + fence("revision_notes", notes)
    lang = await get_story_language(db, story_id)
    resp, fb = await llm_service.run(
        db, user, page="flow.polish",
        system=localized_prompt("flow.polish", lang, POLISH_SYSTEM) + "\n\n" + security_clause(lang),
        user_msg=user_msg,
        temperature=0.7, max_tokens=64000, story_id=story_id,
        language=lang,
    )
    return FlowPolishResponse(polished=resp.text.strip(), fallback=fb, context_token=context_token)


async def extract(
    db: AsyncSession,
    user: User,
    story_id: str,
    polished: str,
    context_token: str | None = None,
) -> FlowExtractResponse:
    ctx_meta: dict = {}
    cached = _cached_context(context_token)
    if cached is not None:
        ctx, ctx_meta = cached
    else:
        ctx = await build_story_context(db, story_id, include_entity_ids=True, meta=ctx_meta)
    user_msg = (
        "STORY CONTEXT (reference only):\n"
        f"{fence('story_context', ctx)}\n\n"
        "POLISHED SCENE (analyze ONLY this):\n"
        f"{fence('polished_scene', polished)}"
    )
    lang = await get_story_language(db, story_id)
    resp, fb = await llm_service.run(
        db, user, page="flow.extract",
        system=localized_prompt("flow.extract", lang, EXTRACT_SYSTEM) + "\n\n" + security_clause(lang),
        user_msg=user_msg,
        json_mode=True, temperature=0.2, max_tokens=64000, story_id=story_id,
        language=lang,
    )
    parsed = llm_service.parse_json(resp.text) or {}
    if not isinstance(parsed, dict):
        parsed = {}

    # Resolve each extracted character to an existing cast member. Name alone is
    # ambiguous — two cast members can share a name — so we resolve by the [id:…]
    # the model echoes back (authoritative) and fall back to a name match ONLY
    # when that name is unique in the cast. Ambiguous names with no id resolve to
    # "exists but unidentified" (is_new=False, existing_id=None): approve then
    # neither creates a duplicate nor mutates the wrong record.
    existing_chars = ctx_meta.get("characters")
    if existing_chars is None:  # defensive: older callers / future context changes
        existing_chars = (
            await db.execute(
                select(Character.id, Character.name).where(Character.story_id == story_id)
            )
        ).all()
    by_id = {c.id: c for c in existing_chars}
    by_name = {c.name.lower(): c for c in existing_chars}
    name_counts: dict[str, int] = {}
    for c in existing_chars:
        name_counts[c.name.lower()] = name_counts.get(c.name.lower(), 0) + 1
    cleaned_chars = []
    for c in parsed.get("characters", []):
        if not isinstance(c, dict) or not c.get("name"):
            continue
        name = c["name"].strip()[:120]  # sanity cap — defang absurd/injected names
        key = name.lower()
        # Normalize the echoed id: tolerate "[id:abc]", "id:abc" or bare "abc".
        cid = (c.get("character_id") or "").strip().strip("[]")
        if cid.startswith("id:"):
            cid = cid[3:].strip()
        match = by_id.get(cid) if cid else None
        if match is None and name_counts.get(key, 0) == 1:
            match = by_name.get(key)
        # Exists if we matched one, OR the name is present in the cast at all
        # (ambiguous duplicate) — either way it is NOT a new character.
        exists = match is not None or name_counts.get(key, 0) >= 1
        raw_status = (c.get("status") or "").strip().lower()
        if raw_status not in ("alive", "dead", "unknown", "missing", "transformed"):
            raw_status = ""
        cleaned_chars.append({
            "name": name,
            "role": c.get("role", "") or "",
            "note": c.get("note", "") or "",
            "status": raw_status,
            "arc_note": (c.get("arc_note") or "").strip(),
            "is_new": not exists,
            "character_id": match.id if match is not None else "",
            "existing_id": match.id if match is not None else None,
        })

    cleaned_events = []
    for e in parsed.get("events", []):
        if not isinstance(e, dict) or not e.get("description"):
            continue
        cleaned_events.append({
            "kind": e.get("kind", "event"),
            "description": e["description"],
            "involved": e.get("involved", []) or [],
        })

    cleaned_rels = []
    char_name_set = {c["name"].lower() for c in cleaned_chars}
    for r in parsed.get("relationships", []):
        if not isinstance(r, dict):
            continue
        src = (r.get("source") or "").strip()
        dst = (r.get("target") or "").strip()
        rtype = (r.get("type") or "").strip()
        if not src or not dst or not rtype or src.lower() == dst.lower():
            continue
        # Only keep relationships between extracted characters
        if src.lower() not in char_name_set or dst.lower() not in char_name_set:
            continue
        cleaned_rels.append({"source": src, "target": dst, "type": rtype, "description": r.get("description", "")})

    cleaned_locations: list[dict] = []
    for loc in parsed.get("locations") or []:
        if isinstance(loc, str):
            cleaned_locations.append({"name": loc.strip(), "description": ""})
        elif isinstance(loc, dict) and loc.get("name"):
            cleaned_locations.append({"name": loc["name"].strip(), "description": loc.get("description", "") or ""})

    cleaned_factions: list[dict] = []
    for f in parsed.get("factions") or []:
        if isinstance(f, str):
            cleaned_factions.append({"name": f.strip(), "description": ""})
        elif isinstance(f, dict) and f.get("name"):
            cleaned_factions.append({"name": f["name"].strip(), "description": f.get("description", "") or ""})

    cleaned_threads: list[dict] = []
    for t in parsed.get("threads") or []:
        if isinstance(t, dict) and t.get("name"):
            status = t.get("status") or "open"
            if status not in ("open", "paid_off", "abandoned"):
                status = "open"
            cleaned_threads.append({"name": t["name"].strip(), "description": t.get("description", "") or "", "status": status})

    cleaned_scenes: list[dict] = []
    for idx, scene in enumerate(parsed.get("scenes") or [], start=1):
        if not isinstance(scene, dict):
            continue
        try:
            ordinal = int(scene.get("ordinal") or idx)
        except Exception:
            ordinal = idx
        revelations: list[dict] = []
        for rev in scene.get("revelations") or []:
            if not isinstance(rev, dict) or not rev.get("description"):
                continue
            try:
                confidence = float(rev.get("confidence", 1.0))
            except Exception:
                confidence = 1.0
            revelations.append({
                "description": str(rev.get("description", "")).strip(),
                "kind": (rev.get("kind") or "revelation").strip() if isinstance(rev.get("kind"), str) else "revelation",
                "characters_who_know": _clean_name_list(rev.get("characters_who_know")),
                "reader_knows": bool(rev.get("reader_knows", False)),
                "notes": rev.get("notes", "") or "",
                "confidence": max(0.0, min(1.0, confidence)),
            })
        cleaned_scenes.append({
            "ordinal": ordinal,
            "title": scene.get("title", "") or "",
            "beat": scene.get("beat", "") or "",
            "summary": scene.get("summary", "") or "",
            "goal": scene.get("goal", "") or "",
            "conflict": scene.get("conflict", "") or "",
            "outcome": scene.get("outcome", "") or "",
            "pov": scene.get("pov", "") or "",
            "location": scene.get("location", "") or "",
            "characters": _clean_name_list(scene.get("characters")),
            "plot_threads": _clean_name_list(scene.get("plot_threads")),
            "time_anchor": scene.get("time_anchor", "") or "",
            "time_sort_key": _clean_sort_key(scene.get("time_sort_key")),
            "duration_hint": scene.get("duration_hint", "") or "",
            "sensory_palette": _clean_sensory(scene.get("sensory_palette")),
            "revelations": revelations,
            "source_excerpt": scene.get("source_excerpt", "") or "",
            "content": scene.get("content", "") or "",
        })

    # Only synthesize a single convenience scene when the model genuinely ran but
    # returned no scene breakdown. If the call DEGRADED to the fallback (fb), the
    # extract is all-empty, so a manufactured scene would be a pure stub (blank
    # title/summary, "drafted scene" beat) that gets persisted as a real SceneCard
    # on approve — exactly the noise we don't want.
    if not cleaned_scenes and polished.strip() and not fb:
        cleaned_scenes.append({
            "ordinal": 1,
            "title": parsed.get("title_suggestion", "") or "",
            "beat": "drafted scene",
            "summary": parsed.get("summary", "") or "",
            "goal": "",
            "conflict": "",
            "outcome": "",
            "pov": parsed.get("pov_suggestion", "") or "",
            "location": parsed.get("location_suggestion", "") or "",
            "characters": [c["name"] for c in cleaned_chars],
            "plot_threads": [t["name"] for t in cleaned_threads],
            "time_anchor": "",
            "time_sort_key": None,
            "duration_hint": "",
            "sensory_palette": _clean_sensory({}),
            "revelations": [],
            "source_excerpt": polished[:300],
            "content": "",
        })

    return FlowExtractResponse(
        title_suggestion=parsed.get("title_suggestion", "") or "",
        summary=parsed.get("summary", "") or "",
        pov_suggestion=parsed.get("pov_suggestion", "") or "",
        location_suggestion=parsed.get("location_suggestion", "") or "",
        characters=cleaned_chars,
        events=cleaned_events,
        relationships=cleaned_rels,
        themes=[t for t in (parsed.get("themes") or []) if isinstance(t, str)],
        locations=cleaned_locations,
        factions=cleaned_factions,
        threads=cleaned_threads,
        scenes=cleaned_scenes,
        world_rules=[r for r in (parsed.get("world_rules") or []) if isinstance(r, str) and r.strip()],
        world_lore=(parsed.get("world_lore") or "").strip(),
        fallback=fb,
    )


def _resolve_ids_from_names(names: list[str], name_to_id: dict[str, str]) -> list[str]:
    """Map character names to ids via a pre-built safe name→id map.

    Ambiguous names that the map deliberately omits (a same-named pair the extract
    couldn't disambiguate) resolve to nothing — never to the wrong character.
    """
    ids: list[str] = []
    for name in names:
        cid = name_to_id.get(name.strip().lower())
        if cid and cid not in ids:
            ids.append(cid)
    return ids


def _scene_fallback(payload: FlowApproveRequest) -> ExtractedScene:
    return ExtractedScene(
        ordinal=1,
        title=payload.extracted.title_suggestion or payload.chapter_title,
        beat="drafted scene",
        summary=payload.extracted.summary or payload.chapter_summary,
        pov=payload.extracted.pov_suggestion,
        location=payload.extracted.location_suggestion,
        characters=[c.name for c in payload.extracted.characters],
        plot_threads=[t.name for t in payload.extracted.threads],
        source_excerpt=payload.polished[:300],
    )


async def approve(
    db: AsyncSession,
    user: User,
    story_id: str,
    payload: FlowApproveRequest,
) -> tuple[Chapter, list[str], list[str], int, list[str], list[str], list[str]]:
    """Commit a polished scene to the story.

    File everything the AI found into the right tables so the writer can keep
    writing instead of doing bookkeeping:
      • New chapter (with title, summary, POV, location, characters present)
      • Opted-in new characters (Cast)
      • All new themes (World bible + Themes table)
      • All new locations mentioned (Locations)
      • All extracted events (Events, linked to the chapter)
      • Story snapshot (story_versions)
      • Graph re-projection (Neo4j)
    """
    from app.services import version_service

    if payload.extracted.fallback and not payload.allow_fallback:
        # Degraded extraction is only dangerous when it is empty/stub output —
        # that would write placeholder text as a real chapter. If the payload
        # still carries usable entities (a caller-supplied/manual extraction),
        # filing it is intentional.
        has_content = bool(
            payload.extracted.title_suggestion
            or payload.extracted.characters
            or payload.extracted.events
            or payload.extracted.scenes
        )
        if not has_content:
            raise Conflict(
                "This extraction came from the degraded fallback provider. Re-run it, or confirm to save anyway."
            )

    # Lock the story row for the whole approve transaction. Two concurrent
    # approvals used to read the same max(chapter.number) and both insert the
    # next chapter — a silent duplicate. FOR UPDATE serializes them on Postgres
    # (a no-op on SQLite, where the test suite runs).
    story = (
        await db.execute(select(Story).where(Story.id == story_id).with_for_update())
    ).scalar_one_or_none()
    if story is None:
        raise NotFound("Story not found")

    # Decide the target chapter:
    #   target_chapter_id  → overwrite that existing chapter
    #   target_chapter_number → create at that specific number (fill a gap)
    #   neither            → append as max(number) + 1
    overwrite_chapter: Chapter | None = None
    if payload.target_chapter_id:
        overwrite_chapter = await db.get(Chapter, payload.target_chapter_id)
        if overwrite_chapter is None or overwrite_chapter.story_id != story_id:
            raise NotFound("target_chapter_id not found in this story")
        next_num = overwrite_chapter.number
    elif payload.target_chapter_number and payload.target_chapter_number > 0:
        # Reject if a chapter already lives at that number
        clash = await db.scalar(select(Chapter.id).where(Chapter.story_id == story_id, Chapter.number == payload.target_chapter_number))
        if clash:
            raise Conflict(f"Chapter {payload.target_chapter_number} already exists — pass target_chapter_id to overwrite")
        next_num = payload.target_chapter_number
    else:
        max_num = await db.scalar(select(func.coalesce(func.max(Chapter.number), 0)).where(Chapter.story_id == story_id)) or 0
        next_num = int(max_num) + 1

    # 1. Add ALL new characters automatically (no opt-in — the writer focuses on writing).
    # `include_character_names`, if non-empty, ONLY excludes (an explicit allow-list overrides).
    explicit_allow = {n.strip().lower() for n in payload.include_character_names}
    existing_chars = (await db.execute(
        select(Character).where(Character.story_id == story_id).order_by(Character.created_at)
    )).scalars().all()
    existing_by_name = {c.name.lower(): c for c in existing_chars}
    existing_by_id = {c.id: c for c in existing_chars}
    # Names that map to >1 cast member can't be resolved by name without risking
    # the wrong record — destructive updates below require an explicit id for these.
    ambiguous_names: set[str] = {
        n for n in {c.name.lower() for c in existing_chars}
        if sum(1 for c in existing_chars if c.name.lower() == n) > 1
    }
    new_char_ids: list[str] = []
    name_to_new_id: dict[str, str] = {}
    pending_chars: list[tuple[str, Character]] = []
    for c in payload.extracted.characters:
        if not c.is_new:
            continue
        key = c.name.strip().lower()
        if not key:
            continue
        # If client passed an allow-list, respect it; otherwise auto-add everything new.
        if explicit_allow and key not in explicit_allow:
            continue
        if key in existing_by_name:
            continue
        ch = Character(story_id=story_id, name=c.name.strip(), role=c.role or "", personality=c.note or "")
        db.add(ch)
        pending_chars.append((key, ch))
        existing_by_name[key] = ch
    # One flush for the whole cast instead of one per character. UUID defaults are
    # applied at flush, so ids are read back here before the name→id map is built.
    if pending_chars:
        await db.flush()
        for key, ch in pending_chars:
            new_char_ids.append(ch.id)
            name_to_new_id[key] = ch.id

    # 1b. Update status / arc for existing characters when the scene changes them.
    # Resolve by explicit id first (the only safe key for same-named cast members);
    # fall back to a name match ONLY when that name is unambiguous. For an ambiguous
    # name with no id we skip the mutation rather than risk corrupting the wrong
    # character's record.
    for c in payload.extracted.characters:
        if c.is_new:
            continue
        key = c.name.strip().lower()
        existing_char = existing_by_id.get(c.existing_id) if c.existing_id else None
        if existing_char is None and key not in ambiguous_names:
            existing_char = existing_by_name.get(key)
        if existing_char is None:
            continue
        if c.status and existing_char.status != c.status:
            existing_char.status = c.status
        if c.arc_note:
            existing_char.arc = (
                (existing_char.arc + " · " if existing_char.arc else "") + c.arc_note
            )

    # 2. Weave new themes into the world bible + Themes table
    added_themes: list[str] = []
    world: World | None = None  # loaded lazily; shared across sections 2, 2b
    if payload.extracted.themes:
        world = await db.get(World, story_id)
        if world is None:
            world = World(story_id=story_id)
            db.add(world)
        current = set((world.themes or []))
        existing_theme_names = {t.lower() for (t,) in await db.execute(select(Theme.name).where(Theme.story_id == story_id))}
        for t in payload.extracted.themes:
            if t and t not in current:
                world.themes = (world.themes or []) + [t]
                current.add(t)
                added_themes.append(t)
            if t and t.lower() not in existing_theme_names:
                db.add(Theme(story_id=story_id, name=t))
                existing_theme_names.add(t.lower())

    # 2b. Append newly discovered world rules and lore to the world bible.
    if payload.extracted.world_rules or payload.extracted.world_lore:
        if world is None:
            world = await db.get(World, story_id)
        if world is None:
            world = World(story_id=story_id)
            db.add(world)
        existing_rules = set(world.rules or [])
        for rule in (payload.extracted.world_rules or []):
            rule = rule.strip()
            if rule and rule not in existing_rules:
                world.rules = (world.rules or []) + [rule]
                existing_rules.add(rule)
        if payload.extracted.world_lore:
            new_lore = payload.extracted.world_lore.strip()
            if new_lore:
                world.lore = ((world.lore + "\n\n") if world.lore else "") + new_lore

    # 3. Add new locations (deduped against existing by name)
    existing_loc_rows = (await db.execute(select(Location).where(Location.story_id == story_id))).scalars().all()
    existing_loc_by_name: dict[str, Location] = {
        loc_row.name.lower(): loc_row for loc_row in existing_loc_rows
    }
    chapter_location_id: str | None = None
    new_locs: list[Location] = []
    for loc in payload.extracted.locations:
        if not loc.name:
            continue
        key = loc.name.strip().lower()
        if key not in existing_loc_by_name:
            new_loc = Location(story_id=story_id, name=loc.name.strip(), description=loc.description or "")
            db.add(new_loc)
            new_locs.append(new_loc)
            existing_loc_by_name[key] = new_loc
        elif loc.description and not existing_loc_by_name[key].description:
            existing_loc_by_name[key].description = loc.description

    # Try to set the chapter's location_id from location_suggestion
    if payload.extracted.location_suggestion:
        sug = payload.extracted.location_suggestion.strip().lower()
        if sug not in existing_loc_by_name:
            new_loc = Location(story_id=story_id, name=payload.extracted.location_suggestion.strip(), description="")
            db.add(new_loc)
            new_locs.append(new_loc)
            existing_loc_by_name[sug] = new_loc
    # One flush for every location created in this section (ids needed below).
    if new_locs:
        await db.flush()
    if payload.extracted.location_suggestion:
        sug = payload.extracted.location_suggestion.strip().lower()
        chapter_location_id = existing_loc_by_name[sug].id if sug in existing_loc_by_name else None

    # 3b. Add new factions
    existing_fac_rows = (await db.execute(select(Faction).where(Faction.story_id == story_id))).scalars().all()
    existing_fac_names = {f.name.lower() for f in existing_fac_rows}
    for f in payload.extracted.factions:
        if not f.name or f.name.lower() in existing_fac_names:
            continue
        db.add(Faction(story_id=story_id, name=f.name.strip(), description=f.description or ""))
        existing_fac_names.add(f.name.lower())

    # 3c. Add new plot threads OR update existing ones (status evolution).
    # If a thread the AI surfaces matches an existing one by name, we update its
    # status (e.g. "open" → "paid_off") and extend its description. The new
    # chapter gets linked into chapter_ids below, after the chapter is flushed.
    existing_thread_rows = (await db.execute(select(PlotThread).where(PlotThread.story_id == story_id))).scalars().all()
    existing_thread_by_name: dict[str, PlotThread] = {t.name.lower(): t for t in existing_thread_rows}
    new_threads: list[PlotThread] = []
    for t in payload.extracted.threads:
        if not t.name:
            continue
        key = t.name.lower()
        existing = existing_thread_by_name.get(key)
        if existing is None:
            new_thread = PlotThread(
                story_id=story_id,
                name=t.name.strip(),
                description=t.description or "",
                status=t.status,
                chapter_ids=[],
            )
            db.add(new_thread)
            new_threads.append(new_thread)
            existing_thread_by_name[key] = new_thread
        else:
            # Status evolution: open → paid_off / abandoned is meaningful info from later scenes
            if t.status and t.status != existing.status and t.status in ("open", "paid_off", "abandoned"):
                existing.status = t.status
            # Extend description if the AI offered more detail
            if t.description and t.description not in (existing.description or ""):
                existing.description = (existing.description + " · " if existing.description else "") + t.description
    if new_threads:
        await db.flush()  # ids needed when linking chapters/scenes below

    # 4. Determine character_ids for the chapter (existing referenced + opted-in new)
    # Build a SAFE name→id map used for every downstream by-name resolution (chapter
    # links, POV, events, relationships, scene members, revelation knowers):
    #   • unambiguous existing names → their id
    #   • newly-created characters    → their new id
    #   • an ambiguous name is included ONLY if the extract disambiguated it with an
    #     explicit existing_id; otherwise it's left out so a same-named pair can
    #     never resolve to the wrong character (it resolves to nothing instead).
    referenced_ids: list[str] = []
    name_to_any_id: dict[str, str] = {
        n: c.id for n, c in existing_by_name.items() if n not in ambiguous_names
    }
    name_to_any_id.update(name_to_new_id)
    for c in payload.extracted.characters:
        key = c.name.strip().lower()
        if c.existing_id and c.existing_id in existing_by_id:
            name_to_any_id[key] = c.existing_id  # extract-disambiguated id wins
    for c in payload.extracted.characters:
        # Trust existing_id only if it's a real character of THIS story (the client
        # supplies the payload — never let it inject a foreign/bogus id into the
        # chapter's denormalized character_ids). Otherwise resolve by name.
        cid = c.existing_id if (c.existing_id and c.existing_id in existing_by_id) else None
        if cid is None:
            cid = name_to_any_id.get(c.name.strip().lower())
        if cid and cid not in referenced_ids:
            referenced_ids.append(cid)

    # 5. Resolve POV
    pov_id: str | None = None
    if payload.extracted.pov_suggestion:
        pov_name = payload.extracted.pov_suggestion.strip().lower()
        match_id = name_to_any_id.get(pov_name)
        if match_id:
            pov_id = match_id

    new_title = payload.chapter_title or payload.extracted.title_suggestion or f"Chapter {next_num}"
    new_summary = payload.chapter_summary or payload.extracted.summary
    new_words = text_stats.count_words(payload.polished)
    if overwrite_chapter is not None:
        # Redo: overwrite in place — keeps the chapter id stable so existing
        # links (events, threads, graph nodes) don't break. Snapshot the old
        # prose FIRST so a bad overwrite is always recoverable.
        from app.services import revision_service

        await revision_service.capture(
            db, overwrite_chapter, source="flow", note=f"before flow overwrite ch{next_num}"
        )
        delta = new_words - (overwrite_chapter.word_count or text_stats.count_words(overwrite_chapter.content))
        overwrite_chapter.title = new_title
        overwrite_chapter.content = payload.polished
        overwrite_chapter.summary = new_summary
        overwrite_chapter.word_count = new_words
        overwrite_chapter.pov_character_id = pov_id
        overwrite_chapter.location_id = chapter_location_id
        overwrite_chapter.character_ids = referenced_ids
        await text_stats.record_delta(db, story_id, delta)
        # Clear stale events that were extracted for the previous content
        await db.execute(sa_delete(Event).where(Event.chapter_id == overwrite_chapter.id))
        await db.execute(sa_delete(PlotThreadSceneLink).where(PlotThreadSceneLink.chapter_id == overwrite_chapter.id))
        await db.execute(sa_delete(Revelation).where(Revelation.chapter_id == overwrite_chapter.id))
        await db.execute(sa_delete(SceneCard).where(SceneCard.chapter_id == overwrite_chapter.id))
        chapter = overwrite_chapter
    else:
        chapter = Chapter(
            story_id=story_id,
            number=next_num,
            title=new_title,
            content=payload.polished,
            summary=new_summary,
            word_count=new_words,
            pov_character_id=pov_id,
            location_id=chapter_location_id,
            character_ids=referenced_ids,
            seeds=[],
        )
        db.add(chapter)
        await text_stats.record_delta(db, story_id, new_words)
    await db.flush()

    # 6. Add extracted events, linked to the new chapter
    for ev in payload.extracted.events:
        if not ev.description:
            continue
        involved_ids: list[str] = []
        for name in (ev.involved or []):
            cid = name_to_any_id.get(name.strip().lower())
            if cid:
                involved_ids.append(cid)
        db.add(Event(
            story_id=story_id,
            chapter_id=chapter.id,
            kind=ev.kind or "event",
            description=ev.description,
            involved=involved_ids,
        ))

    # 7. Add or UPDATE extracted relationships. One row per (source, target)
    # pair — a later chapter that re-describes the same bond updates its type +
    # description instead of stacking a near-duplicate row (mirrors how plot
    # threads evolve). Keyed directionally (source→target), matching how rows
    # are created and how the Characters tab lists each character's own bonds.
    existing_rels = (await db.execute(select(CharacterRelationship).where(CharacterRelationship.story_id == story_id))).scalars().all()
    rel_by_pair: dict[tuple[str, str], CharacterRelationship] = {(r.source_id, r.target_id): r for r in existing_rels}
    for rel in payload.extracted.relationships:
        src_id = name_to_any_id.get(rel.source.strip().lower())
        dst_id = name_to_any_id.get(rel.target.strip().lower())
        if not src_id or not dst_id or src_id == dst_id:
            continue
        existing = rel_by_pair.get((src_id, dst_id))
        if existing is None:
            new_rel = CharacterRelationship(
                story_id=story_id,
                source_id=src_id,
                target_id=dst_id,
                type=rel.type.lower(),
                description=rel.description or "",
            )
            db.add(new_rel)
            rel_by_pair[(src_id, dst_id)] = new_rel
        else:
            # Bond already known — refresh it to the latest description of the pair.
            if rel.type:
                existing.type = rel.type.lower()
            if rel.description:
                existing.description = rel.description

    # 8. Link the new chapter into any plot threads it advances.
    # `existing_thread_by_name` already contains every existing thread plus the
    # ones created in 3c — re-selecting the whole table here was a redundant query.
    if payload.extracted.threads:
        for t in payload.extracted.threads:
            thr = existing_thread_by_name.get(t.name.lower())
            if thr is None:
                continue
            ids = list(thr.chapter_ids or [])
            if chapter.id not in ids:
                ids.append(chapter.id)
                thr.chapter_ids = ids

    # 9. Store scene-level annotations, revelations, and scene-thread links.
    # Batched in dependency order (locations → threads → scenes → links/revelations)
    # so the whole section costs ~4 flushes instead of one per row.
    scene_ids: list[str] = []
    revelation_ids: list[str] = []
    thread_scene_link_ids: list[str] = []
    has_any_extraction = bool(
        payload.extracted.characters
        or payload.extracted.title_suggestion
        or payload.extracted.summary
        or payload.extracted.pov_suggestion
        or payload.extracted.location_suggestion
        or payload.extracted.events
        or payload.extracted.threads
    )
    scenes = payload.extracted.scenes or ([_scene_fallback(payload)] if has_any_extraction else [])

    # 9a. Resolve every scene location up front, then flush once.
    new_scene_locs: list[Location] = []
    for sc in scenes:
        loc_name = (sc.location or payload.extracted.location_suggestion or "").strip()
        if not loc_name:
            continue
        loc_key = loc_name.lower()
        if loc_key not in existing_loc_by_name:
            loc_row = Location(story_id=story_id, name=loc_name, description="")
            db.add(loc_row)
            new_scene_locs.append(loc_row)
            existing_loc_by_name[loc_key] = loc_row
    if new_scene_locs:
        await db.flush()

    # 9b. Resolve every scene thread up front (create missing, link the chapter),
    # then flush once so the ids exist before SceneCard rows reference them.
    scene_thread_objs: list[list[PlotThread]] = []
    new_scene_threads: list[PlotThread] = []
    for sc in scenes:
        thread_names = list(sc.plot_threads or [])
        if len(scenes) == 1 and not thread_names:
            thread_names = [t.name for t in payload.extracted.threads]
        objs: list[PlotThread] = []
        for name in thread_names:
            key = name.strip().lower()
            if not key:
                continue
            thr = existing_thread_by_name.get(key)
            if thr is None:
                thr = PlotThread(story_id=story_id, name=name.strip(), description="", status="open", chapter_ids=[])
                db.add(thr)
                new_scene_threads.append(thr)
                existing_thread_by_name[key] = thr
            if thr not in objs:
                objs.append(thr)
            ids = list(thr.chapter_ids or [])
            if chapter.id not in ids:
                ids.append(chapter.id)
                thr.chapter_ids = ids
        scene_thread_objs.append(objs)
    if new_scene_threads:
        await db.flush()

    # 9c. Create every scene card in one batch.
    scene_rows: list[SceneCard] = []
    for idx, sc in enumerate(scenes, start=1):
        pov_id = name_to_any_id.get((sc.pov or payload.extracted.pov_suggestion or "").strip().lower())
        loc_id = chapter_location_id
        loc_name = (sc.location or payload.extracted.location_suggestion or "").strip()
        if loc_name:
            loc_id = existing_loc_by_name[loc_name.lower()].id
        scene_char_ids = _resolve_ids_from_names(sc.characters, name_to_any_id)
        if not scene_char_ids:
            scene_char_ids = list(referenced_ids)
        scene = SceneCard(
            story_id=story_id,
            chapter_id=chapter.id,
            ordinal=sc.ordinal or idx,
            beat=sc.beat or "",
            title=sc.title or "",
            summary=sc.summary or "",
            goal=sc.goal or "",
            conflict=sc.conflict or "",
            outcome=sc.outcome or "",
            pov_character_id=pov_id,
            location_id=loc_id,
            character_ids=scene_char_ids,
            plot_thread_ids=[t.id for t in scene_thread_objs[idx - 1]],
            time_anchor=sc.time_anchor or "",
            time_sort_key=sc.time_sort_key,
            duration_hint=sc.duration_hint or "",
            sensory_palette=sc.sensory_palette or {},
            source_excerpt=sc.source_excerpt or "",
            content=sc.content or "",
        )
        db.add(scene)
        scene_rows.append(scene)
    if scene_rows:
        await db.flush()
        scene_ids.extend(s.id for s in scene_rows)

    # 9d. Links + revelations in one batch (scene ids now exist).
    pending_links: list[PlotThreadSceneLink] = []
    pending_revelations: list[Revelation] = []
    for idx, sc in enumerate(scenes):
        scene = scene_rows[idx]
        for tid in (scene.plot_thread_ids or []):
            pending_links.append(PlotThreadSceneLink(
                story_id=story_id,
                thread_id=tid,
                scene_id=scene.id,
                chapter_id=chapter.id,
                status="touch",
                strength=1.0,
                evidence=sc.summary or sc.beat or sc.source_excerpt[:200],
            ))
        for rev in sc.revelations:
            if not rev.description:
                continue
            knowers = [cid for cid in _resolve_ids_from_names(rev.characters_who_know, name_to_any_id) if cid]
            pending_revelations.append(Revelation(
                story_id=story_id,
                scene_id=scene.id,
                chapter_id=chapter.id,
                description=rev.description,
                kind=rev.kind or "revelation",
                characters_who_know=knowers,
                reader_knows=rev.reader_knows,
                notes=rev.notes or "",
                confidence=rev.confidence,
            ))
    if pending_links:
        db.add_all(pending_links)
        await db.flush()
        thread_scene_link_ids.extend(link.id for link in pending_links)
    if pending_revelations:
        db.add_all(pending_revelations)
        await db.flush()
        revelation_ids.extend(row.id for row in pending_revelations)

    # 11. Mark every open draft for this story as approved so the next Flow
    # Writing session starts on a blank slate (the work that was in progress
    # has now been committed as a real chapter).
    open_drafts = (await db.execute(
        select(FlowDraft).where(FlowDraft.story_id == story_id, FlowDraft.approved_at.is_(None))
    )).scalars().all()
    now = datetime.now(timezone.utc)
    for d in open_drafts:
        d.approved_at = now

    # The story row was locked for this transaction; mark the graph stale BEFORE
    # committing so a crash between commit and the background job is visible to
    # the reconciler (it retries anything != "ok").
    story.updated_at = now
    story.graph_status = "pending"
    await db.commit()
    await db.refresh(chapter)

    # Snapshot on its own session, AFTER the write transaction released row locks.
    # (It used to run inside the FOR UPDATE transaction, holding the story row
    # across a whole-manuscript serialization.) The number is returned to the
    # client, so this one pass stays synchronous; everything else is queued.
    version_no = 0
    try:
        from sqlalchemy.exc import IntegrityError

        from app.db.session import SessionLocal

        # Retry on a concurrent approve that inserted the same version number
        # between our commit and this snapshot (the write transaction no longer
        # holds the story lock while the whole-manuscript snapshot runs).
        for attempt in range(3):
            try:
                async with SessionLocal() as vdb:
                    version = await version_service.snapshot(vdb, story_id, note=f"flow approve ch{next_num}")
                    await vdb.commit()
                    version_no = version.version_no
                break
            except IntegrityError:
                if attempt == 2:
                    raise
                continue
    except Exception as e:
        log.warning("story snapshot failed after approve: %s", e)

    # Voice fingerprints, vector index, and Neo4j projection all run off-request
    # (ARQ when Redis is configured, a detached task otherwise).
    try:
        from app.services import post_approve

        await post_approve.schedule(story_id, chapter.id)
    except Exception as e:
        log.warning("post-approve scheduling failed: %s", e)

    return chapter, new_char_ids, added_themes, version_no, scene_ids, revelation_ids, thread_scene_link_ids

"""Locale primitives shared by the API, prompts, and user-facing metadata.

UI language and story language are deliberately separate:

* ``users.locale`` controls interface language and author-facing question text.
* ``stories.language`` controls the language of AI-generated prose/analysis for
  that story.

The same contract is used by the frontend (``en`` / ``ar``) and stored as a
short string so SQLite and Postgres stay identical.
"""
from __future__ import annotations

from typing import Literal

Locale = Literal["en", "ar"]
LOCALES: tuple[Locale, ...] = ("en", "ar")
DEFAULT_LOCALE: Locale = "en"


def normalize_locale(value: str | None) -> Locale:
    """Return a supported locale, defaulting to English for blank/unknown input."""
    if not value:
        return DEFAULT_LOCALE
    tag = value.strip().lower().replace("_", "-")
    if tag == "ar" or tag.startswith("ar-"):
        return "ar"
    return "en"


def locale_from_accept_language(header: str | None) -> Locale:
    """Resolve the first supported language in an ``Accept-Language`` header.

    We intentionally do not do full q-value negotiation: the app supports two
    locales, and an explicit Arabic tag anywhere in the header should win over a
    generic ``*``. Unknown tags fall back to English.
    """
    if not header:
        return DEFAULT_LOCALE
    for part in header.split(","):
        tag = part.split(";", 1)[0].strip()
        if tag:
            locale = normalize_locale(tag)
            if locale == "ar" or tag.lower().startswith("en"):
                return locale
    return DEFAULT_LOCALE


def output_language_clause(locale: Locale, *, json_mode: bool = False) -> str:
    """A hard output-language contract appended to every story LLM call.

    Native prompt packs are still used for each task; this clause is the safety
    net that prevents an English-only provider prompt from silently producing an
    English answer for an Arabic story.
    """
    if locale == "ar":
        base = (
            "LANGUAGE CONTRACT (non-negotiable): Write every piece of prose, "
            "analysis, note, title, and user-facing value in Modern Standard "
            "Arabic (العربية الفصحى الحديثة). Do not answer in English and do not "
            "translate the author's text into another language. Preserve the "
            "author's voice, dialect choices inside dialogue, and all proper nouns."
        )
        if json_mode:
            base += (
                " Keep every JSON key exactly as specified in English; translate "
                "only human-readable values. Return valid JSON with no markdown."
            )
        return base
    base = (
        "LANGUAGE CONTRACT (non-negotiable): Write every piece of prose, analysis, "
        "note, title, and user-facing value in English. Preserve the author's voice "
        "and all proper nouns."
    )
    if json_mode:
        base += " Return valid JSON with no markdown."
    return base

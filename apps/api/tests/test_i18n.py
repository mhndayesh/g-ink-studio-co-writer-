"""Bilingual contract tests: locale normalization, prompt packs, error copy."""
from app.core.error_messages_ar import localize_error
from app.core.i18n import locale_from_accept_language, normalize_locale, output_language_clause
from app.services.prompts_ar import localized_prompt


def test_locale_normalization():
    assert normalize_locale("ar-SA") == "ar"
    assert normalize_locale("en-US") == "en"
    assert normalize_locale(None) == "en"
    assert locale_from_accept_language("en-US,en;q=0.9,ar;q=0.8") == "en"
    assert locale_from_accept_language("fr-FR,ar;q=0.9") == "ar"


def test_arabic_prompt_pack_and_output_contract():
    arabic = localized_prompt("flow.polish", "ar", "English prompt")
    assert arabic != "English prompt"
    assert any("\u0600" <= ch <= "\u06ff" for ch in arabic)
    assert "Modern Standard Arabic" in output_language_clause("ar")
    assert "JSON" in output_language_clause("ar", json_mode=True)


def test_english_prompt_unchanged():
    assert localized_prompt("flow.polish", "en", "English prompt") == "English prompt"


def test_arabic_error_copy():
    assert localize_error("Invalid email or password", "ar") == "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    assert localize_error("Some unmapped provider detail", "ar") == "Some unmapped provider detail"
    assert localize_error("Invalid email or password", "en") == "Invalid email or password"

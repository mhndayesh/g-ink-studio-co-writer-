"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useIsAuthed } from "@/lib/auth";
import * as api from "@/lib/api";
import { useMediaQuery } from "@/lib/useMediaQuery";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const authed = useIsAuthed();
  const compact = useMediaQuery("(max-width: 560px)");
  const next = locale === "ar" ? "en" : "ar";

  async function toggle() {
    setLocale(next);
    if (authed) {
      // Best-effort sync; the cookie already switched the interface immediately.
      api.updateMyProfile({ locale: next }).catch(() => undefined);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "ar" ? t("nav.switchToArabic") : t("nav.switchToEnglish")}
      title={next === "ar" ? t("nav.switchToArabic") : t("nav.switchToEnglish")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 9px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "transparent",
        color: "var(--muted)",
        fontSize: 12,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      <Languages size={14} />
      {!compact && <span>{locale === "ar" ? t("common.english") : t("common.arabic")}</span>}
      {compact && <span>{locale === "ar" ? "EN" : "ع"}</span>}
    </button>
  );
}

export type Locale = "en" | "ar";
export const LOCALE_COOKIE = "gink_locale";

export function normalizeLocale(value: string | null | undefined): Locale {
  const tag = (value || "").trim().toLowerCase();
  return tag === "ar" || tag.startsWith("ar-") ? "ar" : "en";
}

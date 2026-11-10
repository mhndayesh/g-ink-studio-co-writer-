"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_COOKIE, type Locale } from "./locale";

export type { Locale };
export { LOCALE_COOKIE, normalizeLocale } from "./locale";

export const en = {
  "common.loading": "Loading…",
  "common.saving": "Saving…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.create": "Create",
  "common.creating": "Creating…",
  "common.open": "Open",
  "common.back": "Back",
  "common.close": "Close",
  "common.tryAgain": "Try again",
  "common.somethingWrong": "Something went wrong",
  "common.optional": "optional",
  "common.none": "None",
  "common.confirm": "Confirm",
  "common.email": "Email",
  "common.password": "Password",
  "common.displayName": "Display name",
  "common.settings": "Settings",
  "common.profile": "Profile",
  "common.language": "Language",
  "common.theme": "Appearance",
  "common.direction": "Direction",
  "common.mode": "Mode",
  "common.dark": "Dark",
  "common.soft": "Soft",
  "common.light": "Light",
  "common.sienna": "Sienna",
  "common.sage": "Sage",
  "common.english": "English",
  "common.arabic": "Arabic",
  "common.notifications": "Notifications",
  "common.story": "Story",
  "common.stories": "Stories",
  "common.chapters": "Chapters",
  "common.characters": "Characters",
  "common.words": "Words",
  "common.publish": "Publish",
  "common.signIn": "Sign in",
  "common.signOut": "Sign out",
  "common.signUp": "Sign up",
  "common.getStarted": "Get started",
  "common.backToStudio": "Back to studio",
  "common.allStories": "All stories",
  "common.deleteStory": "Delete story",
  "common.untitled": "Untitled",
  "common.anonymous": "Anonymous",
  "common.search": "Search",
  "common.all": "All",
  "common.retry": "Retry",
  "common.dismiss": "Dismiss",
  "common.apply": "Apply",
  "common.next": "Next",
  "common.previous": "Previous",
  "common.done": "Done",
  "nav.hub": "Hub",
  "nav.pricing": "Pricing",
  "nav.library": "Library",
  "nav.inbox": "Inbox",
  "nav.profile": "Profile",
  "nav.admin": "Admin",
  "nav.forWriters": "For writers",
  "nav.myStudio": "My Studio",
  "nav.signOut": "Sign out",
  "nav.signIn": "Sign in",
  "nav.getStarted": "Get started",
  "nav.back": "Back",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.switchToArabic": "Switch to Arabic",
  "nav.switchToEnglish": "Switch to English",
  "nav.language": "Language",
  "footer.pricing": "Pricing",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.contact": "Contact",
  "footer.rights": "© 2026 G-Ink Studio",
  "theme.direction": "Direction",
  "theme.mode": "Mode",
  "theme.sienna": "Sienna",
  "theme.sage": "Sage",
  "theme.dark": "Dark",
  "theme.soft": "Soft",
  "theme.light": "Light",
  "auth.welcomeBack": "Welcome back",
  "auth.signInSubtitle": "Sign in to your studio.",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signingIn": "Signing in…",
  "auth.signIn": "Sign in",
  "auth.newHere": "New here?",
  "auth.createAccount": "Create an account",
  "auth.createYourAccount": "Create your account",
  "auth.startWriting": "Start writing in seconds.",
  "auth.displayName": "Display name",
  "auth.passwordHint": "At least 6 characters.",
  "auth.creatingAccount": "Creating account…",
  "auth.alreadyHaveAccount": "Already have an account?",
  "auth.passwordTooShort": "Password must be at least 6 characters.",
  "auth.failed": "Sign in failed",
  "auth.signupFailed": "Sign up failed",
  "auth.language": "Interface language",
  "studio.coWriter": "Co-Writer",
  "studio.brand": "G-Ink Studio",
  "studio.yourStories": "Your stories",
  "studio.storiesSubtitle": "Each story is a separate project. Open one to start writing.",
  "studio.newStory": "New story",
  "studio.title": "Title",
  "studio.titlePlaceholder": "e.g. Bonebreaker Bay",
  "studio.genre": "Genre",
  "studio.noStories": "No stories yet. Create your first above.",
  "studio.deleteConfirm": "Delete \"{title}\"?",
  "studio.open": "Open",
  "studio.settings": "Settings",
  "studio.signOut": "Sign out",
  "studio.chaptersCount": "{count} chapters",
  "studio.charactersCount": "{count} characters",
  "studio.wordsCount": "{count} words",
  "studio.writingLanguage": "Writing language",
  "studio.languageEnglish": "English",
  "studio.languageArabic": "Arabic",
  "genres.fantasy": "Fantasy",
  "genres.scifi": "Sci-Fi",
  "genres.mystery": "Mystery",
  "genres.thriller": "Thriller",
  "genres.romance": "Romance",
  "genres.historical": "Historical",
  "genres.horror": "Horror",
  "genres.literary": "Literary",
  "genres.other": "Other",
  "settings.title": "Settings",
  "settings.subtitle": "Choose how the AI is powered: G-Ink's built-in models, or your own provider keys.",
  "settings.languageSection": "Language",
  "settings.languageHint": "This changes the interface language. Each story has its own writing language.",
} as const;

export type MessageKey = keyof typeof en;

export const ar: Record<MessageKey, string> = {
  "common.loading": "جارٍ التحميل…",
  "common.saving": "جارٍ الحفظ…",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.delete": "حذف",
  "common.edit": "تعديل",
  "common.create": "إنشاء",
  "common.creating": "جارٍ الإنشاء…",
  "common.open": "فتح",
  "common.back": "رجوع",
  "common.close": "إغلاق",
  "common.tryAgain": "حاول مرة أخرى",
  "common.somethingWrong": "حدث خطأ ما",
  "common.optional": "اختياري",
  "common.none": "لا شيء",
  "common.confirm": "تأكيد",
  "common.email": "البريد الإلكتروني",
  "common.password": "كلمة المرور",
  "common.displayName": "اسم العرض",
  "common.settings": "الإعدادات",
  "common.profile": "الملف الشخصي",
  "common.language": "اللغة",
  "common.theme": "المظهر",
  "common.direction": "الاتجاه",
  "common.mode": "الوضع",
  "common.dark": "داكن",
  "common.soft": "ناعم",
  "common.light": "فاتح",
  "common.sienna": "سيينا",
  "common.sage": "سِيج",
  "common.english": "الإنجليزية",
  "common.arabic": "العربية",
  "common.notifications": "الإشعارات",
  "common.story": "قصة",
  "common.stories": "القصص",
  "common.chapters": "الفصول",
  "common.characters": "الشخصيات",
  "common.words": "الكلمات",
  "common.publish": "نشر",
  "common.signIn": "تسجيل الدخول",
  "common.signOut": "تسجيل الخروج",
  "common.signUp": "إنشاء حساب",
  "common.getStarted": "ابدأ الآن",
  "common.backToStudio": "العودة إلى الاستوديو",
  "common.allStories": "كل القصص",
  "common.deleteStory": "حذف القصة",
  "common.untitled": "بلا عنوان",
  "common.anonymous": "مجهول",
  "common.search": "بحث",
  "common.all": "الكل",
  "common.retry": "إعادة المحاولة",
  "common.dismiss": "إغلاق",
  "common.apply": "تطبيق",
  "common.next": "التالي",
  "common.previous": "السابق",
  "common.done": "تم",
  "nav.hub": "الرئيسية",
  "nav.pricing": "الأسعار",
  "nav.library": "مكتبتي",
  "nav.inbox": "الوارد",
  "nav.profile": "الملف الشخصي",
  "nav.admin": "الإدارة",
  "nav.forWriters": "للكُتّاب",
  "nav.myStudio": "استوديوي",
  "nav.signOut": "تسجيل الخروج",
  "nav.signIn": "تسجيل الدخول",
  "nav.getStarted": "ابدأ الآن",
  "nav.back": "رجوع",
  "nav.openMenu": "فتح القائمة",
  "nav.closeMenu": "إغلاق القائمة",
  "nav.switchToArabic": "التبديل إلى العربية",
  "nav.switchToEnglish": "التبديل إلى الإنجليزية",
  "nav.language": "اللغة",
  "footer.pricing": "الأسعار",
  "footer.privacy": "الخصوصية",
  "footer.terms": "الشروط",
  "footer.contact": "تواصل معنا",
  "footer.rights": "© 2026 G-Ink Studio",
  "theme.direction": "الاتجاه",
  "theme.mode": "الوضع",
  "theme.sienna": "سيينا",
  "theme.sage": "سِيج",
  "theme.dark": "داكن",
  "theme.soft": "ناعم",
  "theme.light": "فاتح",
  "auth.welcomeBack": "أهلًا بعودتك",
  "auth.signInSubtitle": "سجّل الدخول إلى استوديوك.",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.signingIn": "جارٍ تسجيل الدخول…",
  "auth.signIn": "تسجيل الدخول",
  "auth.newHere": "أول مرة هنا؟",
  "auth.createAccount": "أنشئ حسابًا",
  "auth.createYourAccount": "أنشئ حسابك",
  "auth.startWriting": "ابدأ الكتابة في ثوانٍ.",
  "auth.displayName": "اسم العرض",
  "auth.passwordHint": "ستة أحرف على الأقل.",
  "auth.creatingAccount": "جارٍ إنشاء الحساب…",
  "auth.alreadyHaveAccount": "لديك حساب بالفعل؟",
  "auth.passwordTooShort": "يجب أن تتكون كلمة المرور من ستة أحرف على الأقل.",
  "auth.failed": "تعذّر تسجيل الدخول",
  "auth.signupFailed": "تعذّر إنشاء الحساب",
  "auth.language": "لغة الواجهة",
  "studio.coWriter": "الكاتب المشارك",
  "studio.brand": "G-Ink Studio",
  "studio.yourStories": "قصصك",
  "studio.storiesSubtitle": "كل قصة مشروع مستقل. افتح إحداها لبدء الكتابة.",
  "studio.newStory": "قصة جديدة",
  "studio.title": "العنوان",
  "studio.titlePlaceholder": "مثال: خليج كاسر العظام",
  "studio.genre": "التصنيف",
  "studio.noStories": "لا توجد قصص بعد. أنشئ قصتك الأولى بالأعلى.",
  "studio.deleteConfirm": "حذف «{title}»؟",
  "studio.open": "فتح",
  "studio.settings": "الإعدادات",
  "studio.signOut": "تسجيل الخروج",
  "studio.chaptersCount": "{count} فصلًا",
  "studio.charactersCount": "{count} شخصية",
  "studio.wordsCount": "{count} كلمة",
  "studio.writingLanguage": "لغة الكتابة",
  "studio.languageEnglish": "الإنجليزية",
  "studio.languageArabic": "العربية",
  "genres.fantasy": "فانتازيا",
  "genres.scifi": "خيال علمي",
  "genres.mystery": "غموض",
  "genres.thriller": "إثارة",
  "genres.romance": "رومانسية",
  "genres.historical": "تاريخية",
  "genres.horror": "رعب",
  "genres.literary": "أدبية",
  "genres.other": "أخرى",
  "settings.title": "الإعدادات",
  "settings.subtitle": "اختر كيف يعمل الذكاء الاصطناعي: بنماذج G-Ink المدمجة أو بمفاتيح مزوّدك الخاص.",
  "settings.languageSection": "اللغة",
  "settings.languageHint": "يغيّر هذا لغة الواجهة. ولكل قصة لغة كتابة مستقلة.",
};

const MESSAGES: Record<Locale, Record<string, string>> = { en, ar };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

type I18nValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  t: Translate;
  formatDate: (value: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`,
  );
}

function writeCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeCookie(next);
  }, []);

  const t = useCallback<Translate>((key, vars) => {
    const table = MESSAGES[locale] || en;
    return interpolate(table[key] ?? en[key] ?? String(key), vars);
  }, [locale]);

  const formatDate = useCallback((value: string | number | Date, opts?: Intl.DateTimeFormatOptions) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en", opts).format(date);
  }, [locale]);

  const formatNumber = useCallback((value: number, opts?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en", opts).format(value);
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    isRTL: locale === "ar",
    setLocale,
    t,
    formatDate,
    formatNumber,
  }), [locale, setLocale, t, formatDate, formatNumber]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/**
 * Page-local bilingual copy. Use this for page-specific labels instead of growing
 * the global catalog; shared chrome still uses ``t()``. The two variants share one
 * type, so a missing field is a compile error.
 */
export function useCopy<T>(copy: Record<Locale, T>): T {
  const { locale } = useI18n();
  return copy[locale];
}


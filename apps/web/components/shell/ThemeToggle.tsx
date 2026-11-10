"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Sunset } from "lucide-react";
import { applyMode, getStoredMode, setStoredMode, nextMode, type Mode, type Direction } from "@/lib/theme";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

const ICONS: Record<Mode, React.ReactNode> = {
  soft:  <Sunset  size={12} />,
  dark:  <Moon    size={12} />,
  light: <Sun     size={12} />,
};

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("soft");
  const { t, locale } = useI18n();

  const LABELS: Record<Mode, string> = {
    soft:  t("theme.soft"),
    dark:  t("theme.dark"),
    light: t("theme.light"),
  };

  useEffect(() => {
    const stored = getStoredMode();
    const html = document.documentElement;
    const attr = html.getAttribute("data-mode") as Mode | null;
    setMode(stored ?? attr ?? "soft");
  }, []);

  function cycle() {
    const next = nextMode(mode);
    setMode(next);
    setStoredMode(next);
    // Preserve the active color direction instead of resetting it to "ember".
    const dir = (document.documentElement.getAttribute("data-dir") as Direction | null) ?? "ember";
    applyMode(next, dir);
  }

  const nextLabel = LABELS[nextMode(mode)];

  return (
    <button
      onClick={cycle}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors",
        "text-iw-muted hover:text-iw-text border border-transparent hover:border-iw-border",
        className,
      )}
      title={locale === "ar" ? `التبديل إلى الوضع ${nextLabel}` : `Switch to ${nextLabel} mode`}
      aria-label={locale === "ar" ? "تبديل المظهر" : "Toggle theme"}
    >
      {ICONS[mode]}
      <span className="hidden sm:inline font-mono tracking-wider uppercase text-[10px]">{LABELS[mode]}</span>
    </button>
  );
}

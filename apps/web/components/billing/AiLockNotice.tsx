"use client";
import { Lock } from "lucide-react";
import { useEntitlement } from "@/lib/useEntitlement";
import { useUI } from "@/lib/store";
import { Btn } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    trialUsed: "Your free AI trial is used up.",
    quotaReached: "You've reached this month's AI usage limit.",
    manual: "You can still write and edit manually — subscribe to re-enable the AI tools.",
    seePlans: "See plans",
  },
  ar: {
    trialUsed: "انتهت تجربتك المجانية للذكاء الاصطناعي.",
    quotaReached: "بلغت حدّ استخدام الذكاء الاصطناعي لهذا الشهر.",
    manual: "يمكنك الكتابة والتحرير يدويًا — اشترك لإعادة تفعيل أدوات الذكاء الاصطناعي.",
    seePlans: "عرض الخطط",
  },
} as const;

/**
 * Banner shown above AI tools when the current plan can't run them right now
 * (free trial used up, or monthly Dev-AI allowance reached). Manual writing is
 * unaffected — only the AI assists are locked. Renders nothing when AI is free
 * to use, so it can be dropped in at the top of any AI page.
 */
export function AiLockNotice() {
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { aiAvailable, isLoading, tier } = useEntitlement();
  const openUpgrade = useUI((s) => s.openUpgrade);
  if (isLoading || aiAvailable) return null;

  const trial = tier === "free";
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-ink-gold/40 bg-ink-gold/10 p-3">
      <Lock size={16} className="text-ink-gold shrink-0" />
      <div className="flex-1 text-sm">
        <p className="text-ink-text">
          {trial ? c.trialUsed : c.quotaReached}
        </p>
        <p className="text-xs text-ink-text2">{c.manual}</p>
      </div>
      <Btn variant="primary" onClick={() => openUpgrade(trial ? "subscription_required" : "quota_exceeded")}>
        {c.seePlans}
      </Btn>
    </div>
  );
}

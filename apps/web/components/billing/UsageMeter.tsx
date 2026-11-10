"use client";
import { KeyRound, Sparkles, Gift, Crown } from "lucide-react";
import { useEntitlement } from "@/lib/useEntitlement";
import { useUI } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    tierLabel: {
      free: "Free trial",
      dev_ai: "Plus",
      byok: "Your own keys",
      owner: "Owner",
    } as Record<string, string>,
    upgrade: "Upgrade",
    manage: "Manage",
    actions: (used: string, cap: string, period: string) => `${used}/${cap} AI actions ${period}`,
    thisMonth: "this month",
    trial: "(trial)",
    unlimitedProvider: "Unlimited · billed by your provider",
    unlimitedOwner: "Unlimited · owner account",
  },
  ar: {
    tierLabel: {
      free: "تجربة مجانية",
      dev_ai: "بلس",
      byok: "مفاتيحك الخاصة",
      owner: "المالك",
    } as Record<string, string>,
    upgrade: "ترقية",
    manage: "إدارة",
    actions: (used: string, cap: string, period: string) => `${used}/${cap} إجراء ذكاء اصطناعي ${period}`,
    thisMonth: "هذا الشهر",
    trial: "(تجريبي)",
    unlimitedProvider: "بلا حدود · تُحتسب لدى مزوّدك",
    unlimitedOwner: "بلا حدود · حساب المالك",
  },
} as const;

/** Compact subscription + usage readout for the studio sidebar. */
export function UsageMeter() {
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { entitlement: e } = useEntitlement();
  const openUpgrade = useUI((s) => s.openUpgrade);
  if (!e) return null;

  const tier = e.effective_tier;
  const label = c.tierLabel[tier] ?? tier;
  const Icon = tier === "owner" ? Crown : tier === "byok" ? KeyRound : tier === "free" ? Gift : Sparkles;

  const cap = e.limits.max_actions;
  const used = e.usage.actions_used;
  const showBar = e.metered && cap != null;
  const pct = showBar ? Math.min(100, Math.round((used / Math.max(1, cap as number)) * 100)) : 0;
  const exhausted = !e.ai_available;

  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-ink-text2">
          <Icon size={12} className="text-ink-gold" /> {label}
        </span>
        {tier !== "byok" && tier !== "owner" && (
          <button
            onClick={() => openUpgrade("manual")}
            className="text-[10px] uppercase tracking-wider text-ink-goldLight hover:underline"
          >
            {tier === "free" ? c.upgrade : c.manage}
          </button>
        )}
      </div>

      {showBar && (
        <div className="mt-1">
          <div className="h-1 rounded-full bg-ink-surface3 overflow-hidden">
            <div
              className={`h-full rounded-full ${exhausted ? "bg-ink-red" : "bg-ink-gold"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-ink-text3 mt-0.5">
            {c.actions(
              formatNumber(used),
              formatNumber(cap as number),
              e.period === "lifetime" ? c.trial : c.thisMonth,
            )}
          </div>
        </div>
      )}

      {tier === "byok" && <div className="text-[10px] text-ink-text3 mt-0.5">{c.unlimitedProvider}</div>}
      {tier === "owner" && <div className="text-[10px] text-ink-text3 mt-0.5">{c.unlimitedOwner}</div>}
    </div>
  );
}

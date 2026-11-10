"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, KeyRound, Sparkles, Check } from "lucide-react";
import Link from "next/link";
import * as api from "@/lib/api";
import { useUI } from "@/lib/store";
import { Btn } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const REASON_COPY = {
  en: {
    subscription_required: {
      title: "Subscribe to keep writing with AI",
      body: "Your free AI trial is used up. Pick a plan to keep the AI tools flowing.",
    },
    quota_exceeded: {
      title: "You've hit this month's AI limit",
      body: "Upgrade your plan, or wait for your allowance to reset at the start of next month.",
    },
    byok_key_missing: {
      title: "Add your own API key",
      body: "Your plan runs on your own provider keys. Add one in Settings — or switch to the Plus plan.",
    },
    manual: {
      title: "Choose your plan",
      body: "Unlock the AI writing tools with the plan that fits how you work.",
    },
  },
  ar: {
    subscription_required: {
      title: "اشترك لمواصلة الكتابة بالذكاء الاصطناعي",
      body: "انتهت تجربتك المجانية للذكاء الاصطناعي. اختر خطة لإبقاء أدوات الذكاء الاصطناعي متاحة.",
    },
    quota_exceeded: {
      title: "بلغت حدّ الذكاء الاصطناعي لهذا الشهر",
      body: "ارتقِ بخطتك، أو انتظر تجدّد رصيدك في بداية الشهر المقبل.",
    },
    byok_key_missing: {
      title: "أضِف مفتاح API الخاص بك",
      body: "خطتك تعمل بمفاتيح مزوّدك الخاص. أضِف مفتاحًا من الإعدادات — أو انتقل إلى خطة Plus.",
    },
    manual: {
      title: "اختر خطتك",
      body: "افتح أدوات الكتابة بالذكاء الاصطناعي بالخطة التي تناسب طريقة عملك.",
    },
  },
} as const;

const UI_COPY = {
  en: {
    close: "Close",
    aiActions: (n: string) => `${n} AI actions / month`,
    noKeys: "No API keys to manage",
    ownKeys: "Use your own provider keys",
    unlimited: "Unlimited on our side",
    priceSoon: "Price coming soon",
    working: "Working…",
    plus: "Plus",
    byok: "Bring Your Own Key",
    plusBlurb: "G-Ink's built-in models with a monthly AI action allowance.",
    byokBlurb: "Use your own provider keys; unlimited on our side.",
    choose: (name: string) => `Choose ${name}`,
    comparePlans: "Compare plans",
    finalizing: "Pricing is being finalized.",
  },
  ar: {
    close: "إغلاق",
    aiActions: (n: string) => `${n} إجراء ذكاء اصطناعي شهريًا`,
    noKeys: "لا مفاتيح API لإدارتها",
    ownKeys: "استخدم مفاتيح مزوّدك الخاص",
    unlimited: "بلا حدود من جانبنا",
    priceSoon: "السعر قريبًا",
    working: "جارٍ التنفيذ…",
    plus: "بلس",
    byok: "مفاتيحك الخاصة",
    plusBlurb: "نماذج G-Ink المدمجة مع حصة شهرية من إجراءات الذكاء الاصطناعي.",
    byokBlurb: "استخدم مفاتيح مزوّدك الخاص؛ الاستخدام غير محدود من جانبنا.",
    choose: (name: string) => `اختيار ${name}`,
    comparePlans: "قارن الخطط",
    finalizing: "يجري وضع اللمسات الأخيرة على الأسعار.",
  },
} as const;

export function UpgradeModal() {
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? UI_COPY.ar : UI_COPY.en;
  const { upgradeOpen, upgradeReason, closeUpgrade } = useUI();
  const qc = useQueryClient();
  const { data: plans } = useQuery({ queryKey: ["billing-plans"], queryFn: api.billingPlans, enabled: upgradeOpen });

  const checkout = useMutation({
    mutationFn: (tier: api.Tier) => api.billingCheckout(tier),
    onSuccess: (res) => {
      if (res.url && !res.activated) { window.location.href = res.url; return; }
      qc.invalidateQueries({ queryKey: ["billing-me"] });
      qc.invalidateQueries({ queryKey: ["llm-status"] });
      qc.invalidateQueries({ queryKey: ["llm-config"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      closeUpgrade();
    },
  });

  if (!upgradeOpen) return null;
  const reasons = locale === "ar" ? REASON_COPY.ar : REASON_COPY.en;
  const copy = reasons[upgradeReason] || reasons.manual;
  const paid = (plans || []).filter((p) => p.requires_subscription);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeUpgrade}>
      <div className="w-full max-w-2xl card-ink p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute end-4 top-4 text-ink-text3 hover:text-ink-text" onClick={closeUpgrade} aria-label={c.close}>
          <X size={18} />
        </button>
        <h2 className="text-2xl font-display text-ink-text pe-8">{copy.title}</h2>
        <p className="text-sm text-ink-text2 mt-1 mb-5">{copy.body}</p>

        <div className="grid gap-4 md:grid-cols-2">
          {paid.map((p) => {
            const planName = p.tier === "dev_ai" ? c.plus : p.tier === "byok" ? c.byok : p.name;
            const planBlurb = p.tier === "dev_ai" ? c.plusBlurb : p.tier === "byok" ? c.byokBlurb : p.blurb;
            return (
            <div key={p.tier} className="rounded-lg border border-ink-border bg-ink-surface2/50 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                {p.tier === "byok" ? <KeyRound size={16} className="text-ink-gold" /> : <Sparkles size={16} className="text-ink-gold" />}
                <h3 className="font-display text-lg">{planName}</h3>
              </div>
              <p className="text-sm text-ink-text2 flex-1">{planBlurb}</p>
              <ul className="text-xs text-ink-text3 my-3 space-y-1">
                {p.tier === "dev_ai" && <li className="flex items-center gap-1"><Check size={12} /> {c.aiActions(p.max_actions != null ? formatNumber(p.max_actions) : "—")}</li>}
                {p.tier === "dev_ai" && <li className="flex items-center gap-1"><Check size={12} /> {c.noKeys}</li>}
                {p.tier === "byok" && <li className="flex items-center gap-1"><Check size={12} /> {c.ownKeys}</li>}
                {p.tier === "byok" && <li className="flex items-center gap-1"><Check size={12} /> {c.unlimited}</li>}
              </ul>
              <div className="text-sm text-ink-text mb-3">{p.price_label || c.priceSoon}</div>
              <Btn variant="primary" disabled={checkout.isPending} onClick={() => checkout.mutate(p.tier)}>
                {checkout.isPending ? c.working : c.choose(planName)}
              </Btn>
            </div>
          );})}
        </div>

        <div className="flex items-center justify-between mt-4">
          <Link href="/pricing" className="text-xs text-ink-text3 hover:text-ink-goldLight underline" onClick={closeUpgrade}>
            {c.comparePlans}
          </Link>
          <p className="text-xs text-ink-text3">{c.finalizing}</p>
        </div>
      </div>
    </div>
  );
}

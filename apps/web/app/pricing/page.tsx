"use client";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { KeyRound, Sparkles, Gift, Check } from "lucide-react";
import * as api from "@/lib/api";
import { useIsAuthed } from "@/lib/auth";
import { useEntitlement } from "@/lib/useEntitlement";
import { Btn, Card, PageHdr, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const ICONS: Record<string, any> = { free: Gift, dev_ai: Sparkles, byok: KeyRound };

const COPY = {
  en: {
    title: "Plans",
    subtitle: "Write with AI on G-Ink's models, or bring your own keys. Manual writing is always free.",
    current: "current",
    popular: "popular",
    comingSoon: "Coming soon",
    free: "Free",
    yourPlan: "Your plan",
    choose: "Choose {name}",
    startWriting: "Start writing",
    getStarted: "Get started",
    unlimited: "Unlimited",
    million: "M",
    thousand: "K",
    aFew: "A few",
    footer: "Pricing is being finalized. Subscriptions activate immediately while we wire up payments.",
    plans: {
      free: {
        name: "Free",
        blurb: "Try the AI writing tools on us — a handful of assists to start.",
      },
      dev_ai: {
        name: "Plus",
        blurb: "Write with G-Ink's built-in models. Monthly allowance, no keys to manage.",
      },
      byok: {
        name: "Bring Your Own Key",
        blurb: "Use your own provider keys. Unlimited on our side, fixed price.",
      },
    },
    features: {
      free: (actions: string) => [
        "Unlimited manual writing — always free",
        `${actions} AI actions to try`,
        "Full toolkit: Flow, Companion, Story Check & Voice Studio",
        "No credit card required",
      ],
      dev_ai: (actions: string, tokens: string) => [
        `${actions} AI actions / month`,
        `${tokens} tokens / month`,
        "Built-in models — no API keys to manage",
        "Everything: Flow, Writing Companion, Story Check, Voice Studio & Graph-RAG",
        "Cover art, publishing & reader library",
      ],
      byok: () => [
        "Use your own provider keys",
        "Unlimited AI on our side — you pay your provider",
        "OpenAI · Anthropic · Gemini · OpenRouter · local",
        "All G-Ink features unlocked",
      ],
    },
  },
  ar: {
    title: "الخطط",
    subtitle: "اكتب بالذكاء الاصطناعي عبر نماذج G-Ink، أو استخدم مفاتيحك الخاصة. الكتابة اليدوية مجانية دائمًا.",
    current: "الحالية",
    popular: "الأكثر رواجًا",
    comingSoon: "قريبًا",
    free: "مجاني",
    yourPlan: "خطتك",
    choose: "اختر {name}",
    startWriting: "ابدأ الكتابة",
    getStarted: "ابدأ الآن",
    unlimited: "غير محدود",
    million: " مليون",
    thousand: " ألف",
    aFew: "بضع",
    footer: "لا تزال الأسعار قيد الإقرار النهائي. تُفعَّل الاشتراكات فورًا ريثما نستكمل ربط المدفوعات.",
    plans: {
      free: {
        name: "مجاني",
        blurb: "جرّب أدوات الكتابة بالذكاء الاصطناعي على حسابنا — بضع مساعدات للبدء.",
      },
      dev_ai: {
        name: "بلس",
        blurb: "اكتب بنماذج G-Ink المدمجة. رصيد شهري دون أي مفاتيح لإدارتها.",
      },
      byok: {
        name: "مفتاحك الخاص",
        blurb: "استخدم مفاتيح مزوّدك الخاص. غير محدود من جانبنا بسعر ثابت.",
      },
    },
    features: {
      free: (actions: string) => [
        "كتابة يدوية غير محدودة — مجانية دائمًا",
        `رصيد تجريبي من إجراءات الذكاء الاصطناعي: ${actions}`,
        "مجموعة الأدوات كاملة: التدفق، المرافق، تدقيق القصة واستوديو الصوت",
        "دون الحاجة إلى بطاقة ائتمانية",
      ],
      dev_ai: (actions: string, tokens: string) => [
        `إجراءات الذكاء الاصطناعي شهريًا: ${actions}`,
        `الرموز المميزة (tokens) شهريًا: ${tokens}`,
        "نماذج مدمجة — دون أي مفاتيح API لإدارتها",
        "كل شيء: التدفق، مرافق الكتابة، تدقيق القصة، استوديو الصوت وGraph-RAG",
        "غلاف فني ونشر ومكتبة قرّاء",
      ],
      byok: () => [
        "استخدم مفاتيح مزوّدك الخاص",
        "ذكاء اصطناعي غير محدود من جانبنا — وأنت تدفع لمزوّدك",
        "OpenAI · Anthropic · Gemini · OpenRouter · محلي",
        "جميع مزايا G-Ink مفتوحة",
      ],
    },
  },
} as const;

export default function PricingPage() {
  const router = useRouter();
  const { data: plans } = useQuery({ queryKey: ["billing-plans"], queryFn: api.billingPlans });
  const { planTier } = useEntitlement();
  const authed = useIsAuthed();
  const { locale, formatNumber } = useI18n();

  const c = locale === "ar" ? COPY.ar : COPY.en;

  function fmtTokens(n: number | null): string {
    if (n == null) return c.unlimited;
    if (n >= 1_000_000) {
      const value = +(n / 1_000_000).toFixed(1);
      return `${formatNumber(value, { maximumFractionDigits: 1 })}${c.million}`;
    }
    if (n >= 1_000) return `${formatNumber(Math.round(n / 1_000))}${c.thousand}`;
    return formatNumber(n);
  }

  function planCopy(tier: string, fallback: { name: string; blurb: string }) {
    return (c.plans as Record<string, { name: string; blurb: string }>)[tier] ?? fallback;
  }

  function priceLabel(p: api.Plan): string {
    if (p.price_label) {
      if (p.price_label === "Free") return c.free;
      return locale === "ar" ? p.price_label.replace(/\/mo\b/, "/شهريًا") : p.price_label;
    }
    return p.requires_subscription ? c.comingSoon : c.free;
  }

  const checkout = useMutation({
    mutationFn: (tier: api.Tier) => api.billingCheckout(tier),
    onSuccess: (res) => {
      if (res.url && !res.activated) { window.location.href = res.url; return; }
      router.push("/settings?billing=success");
    },
  });

  function choose(tier: api.Tier, requiresSub: boolean) {
    if (!requiresSub) { router.push(authed ? "/studio" : "/signup"); return; }
    if (!authed) { router.push("/signup?next=/pricing"); return; }
    checkout.mutate(tier);
  }

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6">
      <PageHdr title={c.title} subtitle={c.subtitle} />

      <div className="grid gap-5 md:grid-cols-3">
        {(plans || []).map((p) => {
          const Icon = ICONS[p.tier] ?? Sparkles;
          const current = authed && planTier === p.tier;
          const featured = p.tier === "dev_ai";
          const local = planCopy(p.tier, { name: p.name, blurb: p.blurb });
          const actions = p.max_actions == null ? c.aFew : formatNumber(p.max_actions);
          const features: string[] =
            p.tier === "free" ? c.features.free(actions)
              : p.tier === "dev_ai" ? c.features.dev_ai(actions, fmtTokens(p.max_tokens))
              : c.features.byok();
          return (
            <Card key={p.tier} className={featured ? "border-ink-gold/50" : ""}>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-2 font-display text-lg">
                  <Icon size={18} className="text-ink-gold" /> {local.name}
                </span>
                {current && <Tag color="green">{c.current}</Tag>}
                {featured && !current && <Tag color="gold">{c.popular}</Tag>}
              </div>
              <p className="text-sm text-ink-text2 min-h-[40px]">{local.blurb}</p>

              <div className="text-2xl font-display my-3 text-ink-text">
                {priceLabel(p)}
              </div>

              <ul className="text-sm text-ink-text2 space-y-1.5 mb-4">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2"><Check size={14} className="text-ink-gold mt-0.5 shrink-0"/> <span>{f}</span></li>
                ))}
              </ul>

              <Btn
                variant={featured ? "primary" : "default"}
                className="w-full"
                disabled={current || checkout.isPending}
                onClick={() => choose(p.tier, p.requires_subscription)}
              >
                {current
                  ? c.yourPlan
                  : p.requires_subscription
                    ? c.choose.replace("{name}", local.name)
                    : authed ? c.startWriting : c.getStarted}
              </Btn>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-ink-text3 mt-6 text-center">
        {c.footer}
      </p>
    </main>
  );
}

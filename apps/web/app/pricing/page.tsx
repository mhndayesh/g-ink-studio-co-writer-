"use client";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { KeyRound, Sparkles, Gift, Check } from "lucide-react";
import * as api from "@/lib/api";
import { useIsAuthed } from "@/lib/auth";
import { useEntitlement } from "@/lib/useEntitlement";
import { Btn, Card, PageHdr, Tag } from "@/components/ui/Primitives";

const ICONS: Record<string, any> = { free: Gift, dev_ai: Sparkles, byok: KeyRound };

function fmtTokens(n: number | null): string {
  if (n == null) return "Unlimited";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

export default function PricingPage() {
  const router = useRouter();
  const { data: plans } = useQuery({ queryKey: ["billing-plans"], queryFn: api.billingPlans });
  const { planTier } = useEntitlement();
  const authed = useIsAuthed();

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
      <PageHdr title="Plans" subtitle="Write with AI on G-Ink's models, or bring your own keys. Manual writing is always free." />

      <div className="grid gap-5 md:grid-cols-3">
        {(plans || []).map((p) => {
          const Icon = ICONS[p.tier] ?? Sparkles;
          const current = authed && planTier === p.tier;
          const featured = p.tier === "dev_ai";
          const features: string[] =
            p.tier === "free" ? [
              "Unlimited manual writing — always free",
              `${p.max_actions ?? "A few"} AI actions to try`,
              "Full toolkit: Flow, Companion, Story Check & Voice Studio",
              "No credit card required",
            ] : p.tier === "dev_ai" ? [
              `${p.max_actions ?? "—"} AI actions / month`,
              `${fmtTokens(p.max_tokens)} tokens / month`,
              "Built-in models — no API keys to manage",
              "Everything: Flow, Writing Companion, Story Check, Voice Studio & Graph-RAG",
              "Cover art, publishing & reader library",
            ] : [
              "Use your own provider keys",
              "Unlimited AI on our side — you pay your provider",
              "OpenAI · Anthropic · Gemini · OpenRouter · local",
              "All G-Ink features unlocked",
            ];
          return (
            <Card key={p.tier} className={featured ? "border-ink-gold/50" : ""}>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-2 font-display text-lg">
                  <Icon size={18} className="text-ink-gold" /> {p.name}
                </span>
                {current && <Tag color="green">current</Tag>}
                {featured && !current && <Tag color="gold">popular</Tag>}
              </div>
              <p className="text-sm text-ink-text2 min-h-[40px]">{p.blurb}</p>

              <div className="text-2xl font-display my-3 text-ink-text">
                {p.price_label || (p.requires_subscription ? "Coming soon" : "Free")}
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
                {current ? "Your plan" : p.requires_subscription ? `Choose ${p.name}` : authed ? "Start writing" : "Get started"}
              </Btn>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-ink-text3 mt-6 text-center">
        Pricing is being finalized. Subscriptions activate immediately while we wire up payments.
      </p>
    </main>
  );
}

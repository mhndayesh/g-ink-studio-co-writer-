"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drama } from "lucide-react";
import * as api from "@/lib/api";
import { useEntitlement } from "@/lib/useEntitlement";
import { Btn } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

// The tiers an owner can "become" to test the real per-tier experience.
const OPTION_VALUES: api.Tier[] = ["owner", "free", "dev_ai", "byok"];

const COPY = {
  en: {
    viewAs: "View the app as:",
    note: "Test mode is real: it changes your AI routing, limits and screens until you switch back to Owner. While viewing as Paid, your AI runs count toward that plan's limit (so you can watch it kick in).",
    labels: {
      owner: "Owner (you)",
      free: "Free",
      dev_ai: "Paid",
      byok: "BYOK",
    } as Record<string, string>,
  },
  ar: {
    viewAs: "اعرض التطبيق بصفة:",
    note: "وضع الاختبار حقيقي: يغيّر توجيه الذكاء الاصطناعي وحدوده وشاشاته حتى تعود إلى صفة المالك. وأثناء العرض بصفة مدفوع، تُحتسب تشغيلات الذكاء الاصطناعي ضمن حدّ تلك الخطة (حتى ترى الحدّ يعمل).",
    labels: {
      owner: "المالك (أنت)",
      free: "مجاني",
      dev_ai: "مدفوع",
      byok: "BYOK",
    } as Record<string, string>,
  },
} as const;

/** Owner-only: flip your effective tier to test how each user type experiences the
 *  app. Persistent — it sticks until you switch back. Renders nothing for non-owners. */
export function ActAsControl() {
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { isRealOwner, actingAs } = useEntitlement();

  const set = useMutation({
    mutationFn: (tier: api.Tier) => api.adminSetActAs(tier),
    onSuccess: () => {
      // The whole app reads the entitlement + resolved provider — re-fetch all of it.
      qc.invalidateQueries({ queryKey: ["billing-me"] });
      qc.invalidateQueries({ queryKey: ["llm-config"] });
      qc.invalidateQueries({ queryKey: ["llm-status"] });
    },
  });

  if (!isRealOwner) return null;
  const current = actingAs ?? "owner";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-ink-text2">
        <Drama size={15} className="text-ink-gold" />
        <span>{c.viewAs}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTION_VALUES.map((value) => (
          <Btn
            key={value}
            variant={current === value ? "primary" : "ghost"}
            onClick={() => set.mutate(value)}
            disabled={set.isPending}
          >
            {c.labels[value] ?? value}
          </Btn>
        ))}
      </div>
      <p className="text-xs text-ink-text3">{c.note}</p>
    </div>
  );
}

"use client";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Hash, Activity } from "lucide-react";
import * as api from "@/lib/api";
import { useEntitlement } from "@/lib/useEntitlement";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    tokenUsage: "Token usage",
    runs: (n: string) => `${n} runs`,
    sent: "Sent to the model (prompt tokens)",
    returned: "Returned by the model (completion tokens)",
    total: "Total tokens (in + out)",
    avg: (n: string) => `avg ${n}/run`,
  },
  ar: {
    tokenUsage: "استخدام الرموز",
    runs: (n: string) => `عدد التشغيلات: ${n}`,
    sent: "أُرسل إلى النموذج (رموز الإدخال)",
    returned: "أُعيد من النموذج (رموز الإخراج)",
    total: "إجمالي الرموز (إدخال + إخراج)",
    avg: (n: string) => `المتوسط ${n} لكل تشغيل`,
  },
} as const;

/**
 * Compact "tokens used" readout for the logged-in account only. Counts every AI
 * call's sent (tokens_in) + received (tokens_out) tokens, all-time, plus the
 * average per run — handy for estimating typical usage while testing. Refreshes
 * itself every few seconds so it tracks as you run AI actions.
 */
export function TokenCounter() {
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  // Owner-only readout — same backend owner flag the API enforces (not a
  // hardcoded email), and it persists while shape-shifted for testing.
  const { isRealOwner } = useEntitlement();

  const fmt = (n: number) => formatNumber(n, { notation: "compact", maximumFractionDigits: 1 });

  const { data } = useQuery({
    queryKey: ["token-stats"],
    queryFn: api.tokenStats,
    enabled: isRealOwner,
    refetchInterval: 8000,
  });

  if (!isRealOwner || !data) return null;

  return (
    <div className="px-2 py-1.5 text-[10px] text-ink-text3">
      <div className="flex items-center justify-between text-ink-text2 mb-0.5">
        <span className="inline-flex items-center gap-1 uppercase tracking-wider"><Activity size={10} /> {c.tokenUsage}</span>
        <span>{c.runs(formatNumber(data.runs))}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-0.5" title={c.sent}>
          <ArrowUp size={9} /> {fmt(data.tokens_in)}
        </span>
        <span className="inline-flex items-center gap-0.5" title={c.returned}>
          <ArrowDown size={9} /> {fmt(data.tokens_out)}
        </span>
        <span className="inline-flex items-center gap-0.5 text-ink-goldLight" title={c.total}>
          <Hash size={9} /> {fmt(data.total)}
        </span>
      </div>
      <div className="mt-0.5">
        {c.avg(fmt(Math.round(data.avg_total)))}
        <span className="text-ink-text3/80"> · {fmt(Math.round(data.avg_in))}↑ {fmt(Math.round(data.avg_out))}↓</span>
      </div>
    </div>
  );
}

"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShieldCheck, AlertOctagon, AlertTriangle, Info } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, PageHdr, Sel, Tag } from "@/components/ui/Primitives";
import { AiLockNotice } from "@/components/billing/AiLockNotice";
import { useEntitlement } from "@/lib/useEntitlement";
import { useI18n, type Locale } from "@/lib/i18n";

const SEVERITY_TAG: Record<string, any> = { high: { color: "red", icon: AlertOctagon }, medium: { color: "gold", icon: AlertTriangle }, low: { color: "muted", icon: Info } };

const PASS_VALUES = ["logic", "structure", "character", "dialogue", "tightening"] as const;

const copyEn = {
  title: "◇ Story Check",
  subtitle: "Reads the chapter against your world, cast, and history — uses Graph-RAG for subtle continuity slips.",
  chapterLabel: "Chapter to check",
  pickChapter: "— pick a chapter —",
  chapterOption: (number: string, title: string) => `Ch${number}. ${title}`,
  passLabel: "Revision pass",
  passes: {
    logic: "Logic / continuity",
    structure: "Structure",
    character: "Character",
    dialogue: "Dialogue",
    tightening: "Tightening",
  } as Record<string, string>,
  reading: "Reading…",
  runCheck: "Run check",
  runFailed: "Story Check couldn’t run.",
  tryAgain: "Try again",
  emptyState: "No issues or notes came back for this pass. Try another revision pass, or check your AI model in Settings if you expected findings.",
  severity: "Severity",
  severityHigh: "High",
  severityMedium: "Medium",
  severityLow: "Low",
  severityLabels: { high: "high", medium: "medium", low: "low" } as Record<string, string>,
  fallbackNote: "⚠ Fallback mode — connect LM Studio in Settings for real analysis.",
  findings: "Findings",
  working: "What's working",
  arrow: "→",
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    title: "◇ تدقيق القصة",
    subtitle: "يقرأ الفصل في ضوء عالمك وشخصياتك وتاريخ أحداثك — ويستخدم Graph-RAG لالتقاط هنات الاستمرارية الدقيقة.",
    chapterLabel: "الفصل المراد تدقيقه",
    pickChapter: "— اختر فصلًا —",
    chapterOption: (number: string, title: string) => `ف${number}. ${title}`,
    passLabel: "نوع المراجعة",
    passes: {
      logic: "المنطق / الاستمرارية",
      structure: "البنية",
      character: "الشخصيات",
      dialogue: "الحوار",
      tightening: "الإحكام",
    },
    reading: "جارٍ القراءة…",
    runCheck: "تشغيل التدقيق",
    runFailed: "تعذّر تشغيل تدقيق القصة.",
    tryAgain: "حاول مرة أخرى",
    emptyState: "لم تُرجع هذه المراجعة أي مشكلات أو ملاحظات. جرّب نوع مراجعة آخر، أو تحقّق من نموذج الذكاء الاصطناعي في الإعدادات إن كنت تتوقع ملاحظات.",
    severity: "درجة الخطورة",
    severityHigh: "عالية",
    severityMedium: "متوسطة",
    severityLow: "منخفضة",
    severityLabels: { high: "عالية", medium: "متوسطة", low: "منخفضة" },
    fallbackNote: "⚠ وضع احتياطي — صِل LM Studio في الإعدادات للحصول على تحليل فعلي.",
    findings: "الملاحظات",
    working: "نقاط القوة",
    arrow: "←",
  },
};

export default function CheckPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { locale, t, formatNumber } = useI18n();
  const c = COPY[locale];
  const { data: chapters } = useQuery({ queryKey: ["chapters", storyId], queryFn: () => api.listChapters(storyId) });
  const { aiAvailable } = useEntitlement();
  const [chapterId, setChapterId] = useState("");
  const [passType, setPassType] = useState("logic");

  const run = useMutation({
    mutationKey: ["llm", "story-check", passType],
    mutationFn: () => api.storyCheck(storyId, chapterId, passType),
  });

  const passLabel = (key: string) => c.passes[key] ?? key;

  return (
    <div className="max-w-4xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />

      <AiLockNotice />

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] items-end">
          <FG label={c.chapterLabel}>
            <Sel value={chapterId} onChange={e => setChapterId(e.target.value)}>
              <option value="">{c.pickChapter}</option>
              {(chapters || []).map((ch: any) => <option key={ch.id} value={ch.id}>{c.chapterOption(formatNumber(ch.number), ch.title)}</option>)}
            </Sel>
          </FG>
          <FG label={c.passLabel}>
            <Sel value={passType} onChange={e => setPassType(e.target.value)}>
              {PASS_VALUES.map(value => <option key={value} value={value}>{passLabel(value)}</option>)}
            </Sel>
          </FG>
          <Btn variant="primary" disabled={!chapterId || run.isPending || !aiAvailable} onClick={() => run.mutate()} className="mb-3">
            <ShieldCheck size={14}/> {run.isPending ? c.reading : c.runCheck}
          </Btn>
        </div>
      </Card>

      {run.isError && (
        <Card className="mb-4 border-ink-red/40">
          <p className="text-ink-red text-sm font-medium">{c.runFailed}</p>
          <p className="text-ink-text3 text-sm mt-0.5">
            {run.error instanceof Error ? run.error.message : t("common.somethingWrong")}
          </p>
          <Btn variant="ghost" className="mt-2" onClick={() => run.mutate()}>{c.tryAgain}</Btn>
        </Card>
      )}

      {run.isSuccess && !run.data?.fallback
        && (run.data?.findings || []).length === 0
        && (run.data?.strengths || []).length === 0 && (
        <Card className="mb-4">
          <p className="text-sm text-ink-text2">{c.emptyState}</p>
        </Card>
      )}

      {run.data && (
        <>
          <Card className="mb-4">
            <h3 className="font-display text-lg mb-2">{c.severity}</h3>
            <div className="flex flex-wrap gap-2">
              <Tag color="green">{passLabel(run.data.pass_type || passType)}</Tag>
              <Tag color="red">{c.severityHigh} · {formatNumber(run.data.severity_buckets?.high ?? 0)}</Tag>
              <Tag color="gold">{c.severityMedium} · {formatNumber(run.data.severity_buckets?.medium ?? 0)}</Tag>
              <Tag color="muted">{c.severityLow} · {formatNumber(run.data.severity_buckets?.low ?? 0)}</Tag>
            </div>
            {run.data.fallback && <p className="text-xs text-ink-text3 mt-2">{c.fallbackNote}</p>}
          </Card>

          {(run.data.findings || []).length > 0 && (
            <Card className="mb-4">
              <h3 className="font-display text-lg mb-3">{c.findings}</h3>
              <ul className="space-y-3">
                {run.data.findings.map((f: any, i: number) => {
                  const cfg = SEVERITY_TAG[f.severity] || SEVERITY_TAG.low;
                  const Icon = cfg.icon;
                  return (
                    <li key={i} className="border-s-2 ps-3" style={{ borderColor: f.severity === "high" ? "#b34535" : f.severity === "medium" ? "#c89830" : "#54473a" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={14} />
                        <strong>{f.title}</strong>
                        <Tag color={cfg.color as any}>{c.severityLabels[f.severity] ?? f.severity}</Tag>
                      </div>
                      <p className="text-sm text-ink-text2">{f.detail}</p>
                      {f.suggestion && <p className="text-xs text-ink-goldLight mt-1">{c.arrow} {f.suggestion}</p>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {(run.data.strengths || []).length > 0 && (
            <Card>
              <h3 className="font-display text-lg mb-3">{c.working}</h3>
              <ul className="space-y-1 text-sm">
                {run.data.strengths.map((s: string, i: number) => <li key={i}>✓ {s}</li>)}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

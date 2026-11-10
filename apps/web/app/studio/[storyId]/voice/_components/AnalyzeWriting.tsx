"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScanText, Check, X, Pencil, AlertTriangle } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, Ta, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { LAYER_TITLES } from "./layers";

const SAMPLE_BUDGET = 128_000;  // must match ANALYZE_SAMPLE_BUDGET on the backend
// Past this, warn that the sample is large enough to eat a real slice of a metered
// plan's token budget (it's one big AI call).
const HEAVY_SAMPLE = 60_000;

const COPY = {
  en: {
    heading: "Analyze existing writing",
    hide: "hide",
    open: "open",
    intro: "Pick any chapters and/or paste prose. The model proposes traits — you approve each.",
    chapters: "Chapters",
    all: "all",
    none: "none",
    chapterTitle: (n: string) => `Chapter ${n}`,
    chapterChip: (n: string) => `Ch${n}`,
    pastePlaceholder: "…or paste prose featuring this character (optional)",
    budgetApprox: (used: string, cap: string) => `~${used}k / ${cap}k chars`,
    overBudget: " — over budget; extra will be truncated",
    selectedChapters: (n: string, count: number) => (count === 1 ? `${n} chapter selected` : `${n} chapters selected`),
    heavyWarning:
      "Large sample — this is one big AI call and can use a meaningful chunk of your plan's token budget. Analyze fewer chapters if you want to keep usage low.",
    analyzing: "Analyzing…",
    analyze: "Analyze",
    fallbackNote:
      "The AI model wasn't reachable, so no traits were proposed. Check that LM Studio (or your provider) is running, then try again.",
    emptyNote:
      "No traits found in this sample. Try selecting more chapters, or prose with more of this character's dialogue and action.",
    analyzeFailed: (msg: string) => `Analyze failed: ${msg}. Check your AI provider and try again.`,
    unknownError: "unknown error",
    savedNote: (n: string, count: number) =>
      count === 1
        ? `Saved ${n} trait to the layers below.`
        : `Saved ${n} traits to the layers below.`,
    analyzedFrom: (what: string) => `Analyzed ${what}`,
    pastedText: "pasted text",
    truncatedNote: " (sample truncated to fit the 128k budget)",
    listSeparator: ", ",
    traitsIntroPre: "Mark each trait",
    approve: "Approve",
    traitsIntroMid: "or Reject, then click",
    saveWord: "Save",
    traitsIntroPost: "below to write the approved ones into the character.",
    confidence: (n: string) => `conf ${n}%`,
    edit: "Edit",
    reject: "Reject",
    saving: "Saving…",
    saveCount: (n: string, count: number) =>
      count === 1 ? `Save ${n} approved trait` : `Save ${n} approved traits`,
  },
  ar: {
    heading: "تحليل الكتابة الحالية",
    hide: "إخفاء",
    open: "فتح",
    intro: "اختر أي فصول و/أو ألصق نصًا. يقترح النموذج سمات — وأنت تعتمد كلًّا منها.",
    chapters: "الفصول",
    all: "الكل",
    none: "لا شيء",
    chapterTitle: (n: string) => `الفصل ${n}`,
    chapterChip: (n: string) => `ف${n}`,
    pastePlaceholder: "…أو ألصق نصًا تظهر فيه هذه الشخصية (اختياري)",
    budgetApprox: (used: string, cap: string) => `~${used} ألف / ${cap} ألف حرف`,
    overBudget: " — تجاوز الميزانية؛ سيُقتطع الفائض",
    selectedChapters: (n: string) => `الفصول المختارة: ${n}`,
    heavyWarning:
      "عيّنة كبيرة — هذه نداء واحد كبير للذكاء الاصطناعي وقد يستهلك جزءًا معتبرًا من ميزانية الرموز في خطتك. حلّل فصولًا أقل إن أردت إبقاء الاستخدام منخفضًا.",
    analyzing: "جارٍ التحليل…",
    analyze: "تحليل",
    fallbackNote:
      "لم يكن نموذج الذكاء الاصطناعي متاحًا، فلم تُقترح أي سمات. تحقّق من تشغيل LM Studio (أو مزوّدك)، ثم حاول مرة أخرى.",
    emptyNote:
      "لم تُعثر على سمات في هذه العيّنة. جرّب اختيار فصول أكثر، أو نصًا يحوي مزيدًا من حوار هذه الشخصية وأفعالها.",
    analyzeFailed: (msg: string) => `فشل التحليل: ${msg}. تحقّق من مزوّد الذكاء الاصطناعي وحاول مرة أخرى.`,
    unknownError: "خطأ غير معروف",
    savedNote: (n: string) => `تم حفظ السمات المعتمدة (${n}) في الطبقات أدناه.`,
    analyzedFrom: (what: string) => `حُلّل: ${what}`,
    pastedText: "النص الملصق",
    truncatedNote: " (اقتُطعت العيّنة لتلائم ميزانية 128 ألفًا)",
    listSeparator: "، ",
    traitsIntroPre: "حدّد لكل سمة:",
    approve: "اعتماد",
    traitsIntroMid: "أو رفض، ثم اضغط",
    saveWord: "حفظ",
    traitsIntroPost: "أدناه لكتابة السمات المعتمدة في الشخصية.",
    confidence: (n: string) => `الثقة ${n}%`,
    edit: "تعديل",
    reject: "رفض",
    saving: "جارٍ الحفظ…",
    saveCount: (n: string) => `حفظ السمات المعتمدة (${n})`,
  },
} as const;

// Method 1 — Analyze existing writing. Pick any number of chapters and/or paste
// prose; the model proposes traits, each with a confidence score and source
// excerpts. Nothing is committed until the author Approves/Edits per trait.
export function AnalyzeWriting({ storyId, characterId }: { storyId: string; characterId: string }) {
  const qc = useQueryClient();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<number, any>>({});   // index → edited value
  const [decided, setDecided] = useState<Record<number, "approve" | "reject">>({});
  const [lastRun, setLastRun] = useState<{ used: any[]; truncated: boolean } | null>(null);

  const { data: chapters } = useQuery({
    queryKey: ["chapters", storyId],
    queryFn: () => api.listChapters(storyId),
    enabled: open,
  });

  // Rough budget readout: selected chapters' lengths + pasted text vs the 32k cap.
  const used = useMemo(() => {
    const chLen = (chapters || [])
      .filter((ch: any) => picked.includes(ch.id))
      .reduce((n: number, ch: any) => n + (ch.content?.length || 0) + 40, 0);
    return chLen + text.length;
  }, [chapters, picked, text]);
  const overBudget = used > SAMPLE_BUDGET;
  const heavy = used > HEAVY_SAMPLE;
  const hasInput = picked.length > 0 || text.trim().length > 0;

  const [note, setNote] = useState<string | null>(null);

  const analyze = useMutation({
    mutationKey: ["llm", "voice.analyze"],
    mutationFn: () => api.analyzeWriting(storyId, characterId, { text, chapter_ids: picked }),
    onSuccess: (r) => {
      setProposals(r.traits || []); setEdits({}); setDecided({});
      setLastRun({ used: r.used_chapters || [], truncated: !!r.truncated });
      if ((r.traits || []).length === 0) {
        setNote(r.fallback ? c.fallbackNote : c.emptyNote);
      } else {
        setNote(null);
      }
    },
    onError: (e: any) => setNote(c.analyzeFailed(e?.message || c.unknownError)),
  });

  const approve = useMutation({
    mutationFn: () => {
      const decisions = proposals
        .map((p, i) => ({ ...p, value: edits[i] ?? p.value, decision: decided[i] || "reject" }))
        .filter(d => d.decision === "approve")
        .map(d => ({ layer: d.layer, field: d.field, value: d.value, decision: "approve" }));
      return api.approveTraits(storyId, characterId, decisions);
    },
    onSuccess: (_r, _v) => {
      const n = Object.values(decided).filter(d => d === "approve").length;
      qc.invalidateQueries({ queryKey: ["identity", storyId, characterId] });
      setProposals([]); setText(""); setPicked([]); setLastRun(null);
      setNote(c.savedNote(formatNumber(n), n));
    },
  });

  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <Card>
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        <h3 className="font-display text-lg flex items-center gap-2"><ScanText size={16}/> {c.heading}</h3>
        <Tag color="muted">{open ? c.hide : c.open}</Tag>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink-text3">{c.intro}</p>

          {/* Chapter picker */}
          {(chapters || []).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="label">{c.chapters}</p>
                <div className="flex items-center gap-2">
                  <button className="text-xs text-ink-text3 hover:text-ink-text" onClick={() => setPicked((chapters || []).map((ch: any) => ch.id))}>{c.all}</button>
                  <button className="text-xs text-ink-text3 hover:text-ink-text" onClick={() => setPicked([])}>{c.none}</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                {(chapters || []).map((ch: any) => {
                  const on = picked.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggle(ch.id)}
                      title={ch.title || c.chapterTitle(formatNumber(ch.number))}
                      className={`px-2.5 py-1 rounded text-xs border ${on ? "border-ink-gold/40 bg-ink-gold/10 text-ink-goldLight" : "border-ink-border text-ink-text2 hover:text-ink-text"}`}
                    >
                      {c.chapterChip(formatNumber(ch.number))}{ch.title ? ` · ${ch.title.slice(0, 18)}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Ta rows={4} value={text} onChange={e => setText(e.target.value)} placeholder={c.pastePlaceholder} />

          {/* Budget readout */}
          <div className="flex items-center justify-between text-xs">
            <span className={overBudget ? "text-ink-red" : "text-ink-text3"}>
              {c.budgetApprox(
                formatNumber(used / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                formatNumber(SAMPLE_BUDGET / 1000),
              )}
              {overBudget && c.overBudget}
            </span>
            {picked.length > 0 && <span className="text-ink-text3">{c.selectedChapters(formatNumber(picked.length), picked.length)}</span>}
          </div>
          <div className="h-1 rounded bg-ink-surface3 overflow-hidden">
            <div className={`h-full ${overBudget ? "bg-ink-red" : heavy ? "bg-ink-rose" : "bg-ink-gold"}`} style={{ width: `${Math.min(100, (used / SAMPLE_BUDGET) * 100)}%` }} />
          </div>

          {heavy && (
            <p className="text-xs text-ink-rose flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>{c.heavyWarning}</span>
            </p>
          )}

          <Btn variant="primary" disabled={!hasInput || analyze.isPending} onClick={() => { setNote(null); analyze.mutate(); }}>
            <ScanText size={14}/> {analyze.isPending ? c.analyzing : c.analyze}
          </Btn>

          {note && <p className="text-xs text-ink-text2">{note}</p>}

          {lastRun && (lastRun.used.length > 0 || lastRun.truncated) && (
            <p className="text-xs text-ink-text3">
              {c.analyzedFrom(
                lastRun.used.length > 0
                  ? lastRun.used.map((ch: any) => c.chapterChip(formatNumber(ch.number))).join(c.listSeparator)
                  : c.pastedText,
              )}
              {lastRun.truncated && c.truncatedNote}
            </p>
          )}

          {proposals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-ink-text3">
                {c.traitsIntroPre} <strong className="text-ink-text2">{c.approve}</strong> {c.traitsIntroMid}{" "}
                <strong className="text-ink-text2">{c.saveWord}</strong> {c.traitsIntroPost}
              </p>
              {proposals.map((p, i) => (
                <div key={i} className={`p-2 rounded border text-sm ${decided[i] === "approve" ? "border-ink-green/40 bg-ink-green/5" : decided[i] === "reject" ? "border-ink-border opacity-40" : "border-ink-border"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Tag color="muted">{LAYER_TITLES[locale][p.layer] ?? p.layer}</Tag>
                    <Tag color={p.confidence >= 0.7 ? "green" : p.confidence >= 0.4 ? "gold" : "rose"}>{c.confidence(formatNumber(Math.round((p.confidence || 0) * 100)))}</Tag>
                  </div>
                  {p.question && <p className="text-xs text-ink-text2 mb-1">{p.question}</p>}
                  <Ta rows={2} value={edits[i] ?? p.value ?? ""} onChange={e => setEdits(s => ({ ...s, [i]: e.target.value }))} />
                  {(p.excerpts || []).length > 0 && (
                    <p className="text-xs text-ink-text3 mt-1 italic">“{(p.excerpts || []).join("” / “")}”</p>
                  )}
                  <div className="flex gap-1 mt-2">
                    <Btn variant={decided[i] === "approve" ? "primary" : "ghost"} onClick={() => setDecided(s => ({ ...s, [i]: "approve" }))}><Check size={13}/> {c.approve}</Btn>
                    <Btn variant="ghost" onClick={() => setEdits(s => ({ ...s, [i]: p.value }))}><Pencil size={13}/> {c.edit}</Btn>
                    <Btn variant={decided[i] === "reject" ? "primary" : "ghost"} onClick={() => setDecided(s => ({ ...s, [i]: "reject" }))}><X size={13}/> {c.reject}</Btn>
                  </div>
                </div>
              ))}
              {(() => {
                const n = Object.values(decided).filter(d => d === "approve").length;
                return (
                  <Btn variant="primary" disabled={approve.isPending || n === 0} onClick={() => approve.mutate()}>
                    <Check size={14}/> {approve.isPending ? c.saving : c.saveCount(formatNumber(n), n)}
                  </Btn>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

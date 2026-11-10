"use client";
import { useMutationState } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Friendly labels for each AI mutation, keyed by mutationKey[1].
// Any AI mutation should be tagged: mutationKey: ["llm", "<name>"]
const COPY = {
  en: {
    labels: {
      "flow.polish": "Shaping your scene…",
      "flow.enhance": "Checking the language…",
      "flow.extract": "Reading the scene…",
      "flow.skip-polish": "Filing your scene…",
      "flow.approve": "Filing characters, places, threads…",
      "flow.companion": "Drafting the scene…",
      "story-check": "Reading the chapter against your world…",
      "llm.test": "Talking to the LLM…",
      "rag.preview": "Retrieving graph context…",
      "rag.reindex": "Re-indexing story vectors…",
      "graph.reproject": "Re-projecting the graph…",
      "voice.analyze": "Reading the sample for voice traits…",
      "voice.interview": "Building the character profile…",
      "voice.place": "Sensing the place…",
      "voice.observe": "Listening for off-key lines…",
      "voice.rewrite": "Rewriting in character…",
      "voice.evolve": "Noticing what changed…",
      "voice.compare": "Putting voices side by side…",
    } as Record<string, string>,
    hints: {
      "flow.polish": "The model is rewriting your draft as polished prose.",
      "flow.enhance": "Detecting the language and improving grammar, word choice, and flow — story unchanged.",
      "flow.extract": "The model is reading the scene and listing characters, places, themes, events.",
      "flow.skip-polish": "The model is listing characters, places, themes, events from your text.",
      "flow.approve": "Adding new entities to your story and snapshotting the version.",
      "flow.companion": "The Writing Companion is drafting using the full story context.",
      "story-check": "Cross-checking against your world bible, cast, and prior chapters.",
      "voice.analyze": "Extracting personality, behavior and speech traits — each with a confidence score for you to approve.",
      "voice.interview": "Synthesizing a readable profile and structured layers from your answers.",
      "voice.place": "Turning your answers into a sensory, atmospheric place profile.",
      "voice.observe": "Checking each line against the character's identity, masks and state.",
      "voice.rewrite": "Rewriting the dialogue to match voice, masks and current state.",
      "voice.evolve": "Spotting what this scene reveals or changes about the cast.",
      "voice.compare": "Generating each character's response to the same situation.",
    } as Record<string, string>,
    working: "Working…",
    holdOn: "Hold on a moment.",
    queued: (n: string, count: number) => (count === 1 ? `+ ${n} more task queued` : `+ ${n} more tasks queued`),
  },
  ar: {
    labels: {
      "flow.polish": "جارٍ صقل مشهدك…",
      "flow.enhance": "جارٍ فحص اللغة…",
      "flow.extract": "جارٍ قراءة المشهد…",
      "flow.skip-polish": "جارٍ حفظ مشهدك…",
      "flow.approve": "جارٍ حفظ الشخصيات والأماكن والخيوط…",
      "flow.companion": "جارٍ صياغة المشهد…",
      "story-check": "جارٍ مقارنة الفصل بعالمك…",
      "llm.test": "جارٍ التواصل مع النموذج…",
      "rag.preview": "جارٍ استرجاع سياق الرسم البياني…",
      "rag.reindex": "جارٍ إعادة فهرسة متجهات القصة…",
      "graph.reproject": "جارٍ إعادة إسقاط الرسم البياني…",
      "voice.analyze": "جارٍ قراءة العيّنة لسمات الصوت…",
      "voice.interview": "جارٍ بناء ملف الشخصية…",
      "voice.place": "جارٍ استشعار المكان…",
      "voice.observe": "جارٍ الإنصات إلى الأسطر الناشزة…",
      "voice.rewrite": "جارٍ إعادة الصياغة بصوت الشخصية…",
      "voice.evolve": "جارٍ رصد ما تغيّر…",
      "voice.compare": "جارٍ وضع الأصوات جنبًا إلى جنب…",
    } as Record<string, string>,
    hints: {
      "flow.polish": "يعيد النموذج كتابة مسوّدتك نثرًا مصقولًا.",
      "flow.enhance": "كشف اللغة وتحسين القواعد واختيار الكلمات والانسياب — من دون تغيير القصة.",
      "flow.extract": "يقرأ النموذج المشهد ويسرد الشخصيات والأماكن والثيمات والأحداث.",
      "flow.skip-polish": "يسرد النموذج الشخصيات والأماكن والثيمات والأحداث من نصّك.",
      "flow.approve": "إضافة كيانات جديدة إلى قصتك وأخذ نسخة من الإصدار.",
      "flow.companion": "يكتب رفيق الكتابة بالاستعانة بسياق القصة الكامل.",
      "story-check": "مقابلة الفصل بدليل عالمك وطاقمك والفصول السابقة.",
      "voice.analyze": "استخراج سمات الشخصية والسلوك والكلام — لكل منها درجة ثقة لتعتمدها.",
      "voice.interview": "تركيب ملف مقروء وطبقات منظّمة من إجاباتك.",
      "voice.place": "تحويل إجاباتك إلى ملف مكان حسّي مفعم بالأجواء.",
      "voice.observe": "فحص كل سطر مقابل هوية الشخصية وأقنعتها وحالتها.",
      "voice.rewrite": "إعادة صياغة الحوار ليطابق الصوت والأقنعة والحالة الراهنة.",
      "voice.evolve": "رصد ما يكشفه هذا المشهد أو يغيّره في طاقم الشخصيات.",
      "voice.compare": "توليد ردّ كل شخصية على الموقف نفسه.",
    } as Record<string, string>,
    working: "جارٍ العمل…",
    holdOn: "لحظة من فضلك.",
    queued: (n: string) => `+ ${n} مهام أخرى في الانتظار`,
  },
} as const;

export function BusyOverlay() {
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  // Pull every in-flight mutation tagged with ["llm", …] and surface the topmost.
  const active = useMutationState({
    filters: {
      status: "pending",
      predicate: (m) => Array.isArray(m.options.mutationKey) && m.options.mutationKey[0] === "llm",
    },
    select: (m) => (m.options.mutationKey?.[1] as string | undefined) ?? "unknown",
  });

  if (active.length === 0) return null;

  const key = active[active.length - 1];
  const label = c.labels[key] ?? c.working;
  const hint = c.hints[key] ?? c.holdOn;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/55 backdrop-blur-[2px] busy-fade-in"
      onMouseDownCapture={(e) => e.preventDefault()}
      onClickCapture={(e) => e.preventDefault()}
      onKeyDownCapture={(e) => e.preventDefault()}
    >
      <div className="card-ink px-6 py-5 max-w-md w-[90%] flex items-start gap-4">
        <div className="relative shrink-0">
          <Sparkles className="text-ink-goldLight" size={22} />
          <Loader2 className="absolute inset-0 m-auto text-ink-gold animate-spin" size={32} />
        </div>
        <div>
          <p className="font-display text-lg leading-tight">{label}</p>
          <p className="text-sm text-ink-text2 mt-1">{hint}</p>
          {active.length > 1 && (
            <p className="text-xs text-ink-text3 mt-2">{c.queued(formatNumber(active.length - 1), active.length - 1)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

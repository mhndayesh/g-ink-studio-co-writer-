"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, Sparkles } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Sel, Ta, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { LAYER_TITLES } from "./layers";

const TIERS = [
  { key: "quick", label: "Quick — 10 (side cast)" },
  { key: "medium", label: "Medium — 20 (recurring cast)" },
  { key: "deep", label: "Deep — 35 (leads & antagonists)" },
];

const LAYER_ORDER = ["core", "behavioral", "voice", "relationship", "current"];

const COPY = {
  en: {
    heading: "Guided interview",
    hide: "hide",
    open: "open",
    depth: "Depth",
    choose: "— choose —",
    loading: "Loading questions…",
    building: "Building…",
    generate: "Generate profile",
    tiers: {
      quick: "Quick — 10 (side cast)",
      medium: "Medium — 20 (recurring cast)",
      deep: "Deep — 35 (leads & antagonists)",
    } as Record<string, string>,
  },
  ar: {
    heading: "المقابلة الموجّهة",
    hide: "إخفاء",
    open: "فتح",
    depth: "العمق",
    choose: "— اختر —",
    loading: "جارٍ تحميل الأسئلة…",
    building: "جارٍ البناء…",
    generate: "توليد الملف",
    tiers: {
      quick: "سريع — 10 (شخصيات ثانوية)",
      medium: "متوسط — 20 (شخصيات متكررة)",
      deep: "عميق — 35 (الأبطال والخصوم)",
    } as Record<string, string>,
  },
} as const;

// Arabic display text for the API question bank. Keys are the canonical question
// ids from the backend; option VALUES stay canonical English so branching and the
// submitted payload are unchanged — only what the author SEES is translated.
const AR_QUESTIONS: Record<string, { text: string; hint?: string; options?: Record<string, string> }> = {
  // Core
  want: { text: "ما الذي تريده هذه الشخصية بشدة حتى تتحرّك من أجله الآن؟", hint: "كن محدّدًا — ولماذا الآن، لا العام الماضي؟" },
  need: { text: "ما الذي تحتاجه فعلًا لكنها تقاوم الاعتراف به؟", hint: "النقص الداخلي الذي تدور حوله قوس الشخصية — وهو عادةً ليس الرغبة نفسها." },
  lie: {
    text: "ما الاعتقاد الزائف عن نفسها أو عن العالم الذي تنظّم حياتها حوله؟",
    hint: "مثل: «أنا آمن فقط إذا تحكّمت»، «أنا ذو قيمة فقط إذا احتاجني أحد».",
  },
  wound: {
    text: "ما الحدث أو الرسالة المبكرة التي جعلت ذلك الاعتقاد يبدو صادقًا — الجملة التي لو قيلت الآن لانفجرت؟",
    hint: "الشبح. وإن لم يكن ثمة حدث واحد، فالنمط المتكرر.",
  },
  shame: { text: "ما أكثر ما تخشى أن يكتشفه أحد أو يؤكّده عنها؟", hint: "أي حكم ذاتي يستلزمه ذلك؟" },
  value_hierarchy: { text: "ما الذي تضحّي من أجله بالراحة أو المكانة أو الحب؟", hint: "إن تنافس عدة أشياء، فألزمها بترتيب — هذا الترتيب هو الشخصية." },
  moral_line: { text: "ما الخط الذي لن تتجاوزه — وما الذي قد يدفعها إلى تجاوزه؟", hint: "إن كان الجواب «لا شيء»، فاختبر اليأس أو خطر شخص تحبّه." },
  self_gap: { text: "كيف تريد أن تُرى، مقابل كيف ترى نفسها في السرّ؟", hint: "الفجوة بين القناع والظل. التناقض يُقرأ واقعيةً." },
  // Behavioral
  stress_response: {
    text: "عند تهديد حقيقي، ما حركتها الأولى؟",
    options: {
      "fight / confront": "المواجهة / الاشتباك",
      "flee / deflect": "الفرار / التنصّل",
      "freeze / shut down": "التجمّد / الانغلاق",
      "fawn / appease": "التزلّف / الاسترضاء",
      "it depends": "يعتمد على الموقف",
    },
  },
  stress_backup: { text: "وإذا فشل ذلك الردّ الأول، ما البديل؟", hint: "البديل غالبًا يكشف أكثر من الافتراضي." },
  stress_split: { text: "قسّمها: كيف تتفاعل مع تهديد اجتماعي أو عاطفي مقابل تهديد جسدي؟" },
  vulnerability: {
    text: "عندما يدفعها شخص تهتم به إلى الصدق، ماذا تفعل؟",
    hint: "دفاعها في التعلّق — تلاحق، أم تتصامم، أم تتنصّل، أم تستجيب؟",
  },
  criticism: { text: "كيف تتفاعل مع النقد من شخص تحترمه؟", hint: "إن اختلف سلوكها علنًا وسرًّا، فسجّل الاثنين." },
  deception: { text: "عندما تكذب، ما الذي يتغيّر عن سلوكها المعتاد؟", hint: "انحراف عن خطّها الأساسي هي — لا «علامة» كذبة عامة." },
  decision_tempo: {
    text: "تحت الضغط، كيف تقرّر؟",
    options: {
      "fast / decisive": "سريع / حاسم",
      "slow / deliberate": "بطيء / متأنٍّ",
      "defer to others": "يترك القرار للآخرين",
      "freeze / avoid deciding": "يتجمّد / يتجنّب القرار",
    },
  },
  anger_tell: { text: "عندما يعلو الغضب، ما الذي يظهر جسديًا قبل أي كلام؟", hint: "الإشارة السابقة للكلام. وإن كانت تخفيه، فما النسخة المضبوطة؟" },
  recovery: { text: "في الساعة الأولى بعد فشل حقيقي، ماذا تفعل؟", hint: "طقس مرونتها — أو من/ما يعيد تشغيلها." },
  // Voice
  cadence: {
    text: "هل تتحدّث في شذرات مقتضبة، أم جمل ثابتة، أم أفكار مبنيّة بعناية؟",
    options: {
      "clipped fragments": "شذرات مقتضبة",
      "short and plain": "قصيرة وبسيطة",
      "steady / balanced": "ثابتة / متوازنة",
      "long, subordinate cascades": "طويلة، متدفّقة بالجمل التابعة",
    },
    hint: "إن تغيّر الإيقاع تحت الضغط، فاذكر الخطّ الأساسي هنا — والضغط في سؤال الانفعال.",
  },
  directness: {
    text: "عندما تريد شيئًا، هل تكون مباشرة، أم مراوغة، أم مازحة، أم آمرة؟",
    options: {
      "blunt / direct": "صريحة / مباشرة",
      diplomatic: "دبلوماسية",
      evasive: "مراوغة",
      "joking / deflecting": "مازحة / متنصّلة",
      commanding: "آمرة",
    },
  },
  lexicon: { text: "ما الكلمات والموضوعات والمستويات اللغوية التي تقصدها — وأيها تتجنّب؟", hint: "اذكر عبارة مفضّلة وكلمة لا تستخدمها أبدًا، إن وُجدت." },
  emotion_shift: {
    text: "كيف يغيّر الخوف أو الغضب كلامها — الإيقاع، وعلوّ الصوت، والطول، أو الصمت؟",
    hint: "إن كان الجواب «لا يتغيّر»، فاسأل: أتصمت أكثر أم تزداد انضباطًا؟",
  },
  register: {
    text: "في حالتها الأساسية، ما مدى رسميّتها أو عاميّتها أو بذاءتها؟",
    options: {
      formal: "رسمي",
      "plain / neutral": "بسيط / محايد",
      "colloquial / slangy": "عامّي / دارج",
      "profane / raw": "بذيء / فجّ",
      "technical / precise": "تقني / دقيق",
    },
    hint: "إن كان المستوى يتوقّف على الجمهور، فتلك قناع — سجّله في أسئلة العلاقات.",
  },
  silence: {
    text: "هل تملأ الصمت، أم تتحمّله، أم تستخدمه سلاحًا؟",
    options: { "fill it": "تملؤه", "tolerate it": "تتحمّله", "weaponize it": "تستخدمه سلاحًا" },
  },
  humor: {
    text: "فيمَ تستخدم فكاهتها — للتقارب، أم للتنصّل، أم للهيمنة، أم لحماية الذات، أم تتجنّبها؟",
    options: {
      "to bond": "للتقارب",
      "to deflect": "للتنصّل",
      "to dominate": "للهيمنة",
      "to self-protect": "لحماية الذات",
      "they avoid humor": "تتجنّب الفكاهة",
    },
  },
  // Relationship masks
  safe_person: { text: "من يحصل على النسخة الأقل تصفيةً منها — وما المختلف في ذلك الصوت؟", hint: "الخطّ الأساسي بلا قناع. وإن كان الجواب «لا أحد»، فالسياق الأقل تصفية." },
  authority_mask: { text: "كيف تتحدّث إلى سلطة لا تحبّها لكنها تحتاج شيئًا منها؟", hint: "ما الذي تكبته للحصول عليه؟" },
  aspirational_mask: { text: "كيف تتحدّث إلى من تريد إبهاره أو حمايته؟", hint: "ما الذي تحذفه من صوتها المعتاد؟" },
  code_switch: { text: "مع من يتغيّر كلامها أكثر — وما الذي يبقى ثابتًا مهما كان؟", hint: "الثابت هو حقيقتها." },
  status_down: { text: "كيف تتحدّث إلى من هو أدنى منها مكانةً بوضوح؟", hint: "هذه علامة أخلاقية. أعطِ مثالًا محدّدًا إن أمكن." },
  adversary_mask: { text: "أمام خصم، كيف تحاول أن تجرح من دون أن تنكشف؟", hint: "سلاحها المفضّل — أدب بارد، أم سخرية، أم صمت، أم حقيقة تحتفظ بها؟" },
  regression: { text: "من يعيدها إلى نسخة أقدم وأصغر من نفسها؟", hint: "محفّز الارتداد — غالبًا العائلة أو حبّ أول أو منافس أول." },
  intimacy_ceiling: { text: "ما الذي تخفيه حتى عن أقرب الناس إليها؟", hint: "حدّ الثقة. وإن كان الجواب «لا شيء»، فاختبره تحت الضغط." },
  // Current state
  concealed_affect: { text: "الآن، ما الشعور الذي تكافح أشدّ الكفاح لإخفائه؟", hint: "الانفعال المكبوت النشط الأكثر تأثيرًا في حوارها." },
  hidden_agenda: { text: "في مشهدها الحالي، ما الذي تخفيه أو تسعى إليه سرًّا؟" },
  scene_objective: { text: "ما النتيجة الملموسة التي تحتاجها قبل أن ينتهي المشهد الحالي؟", hint: "ما الذي يُعدّ نجاحًا بالنسبة لها؟" },
  body_load: { text: "ما الحالة الجسدية الآن التي تؤثر أكثر في كلامها أو خياراتها؟", hint: "ألم، أم إنهاك، أم جوع، أم سُكر، أم إصابة — ومن يلاحظ." },
  state_duration: {
    text: "هل هذه الحالة طارئة لمشهد واحد، أم مرحلة تمتد فصلًا، أم تحوّل دائم في القوس؟",
    options: { "one scene": "مشهد واحد", "a chapter": "فصل", "an arc shift": "تحوّل في القوس" },
    hint: "يحدّد هل تنتهي أم تُرقّى إلى قانون ثابت.",
  },
};

// Method 2 — Guided interview. Walks a researched question bank with branching:
// each question may declare branches keyed by the chosen answer, revealing follow-ups.
export function Interview({ storyId, characterId }: { storyId: string; characterId: string }) {
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState("quick");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const { data: bank } = useQuery({
    queryKey: ["interview", storyId, tier],
    queryFn: () => api.getInterview(storyId, tier),
    enabled: open,
  });

  // Resolve which questions are visible: a base question is always shown; a branch
  // question is shown only when its trigger answer is selected (client-side walk).
  const visible = useMemo(() => {
    const questions: any[] = bank?.questions || [];
    const byId = new Map(questions.map(q => [q.id, q]));
    const shown: any[] = [];
    const pushChain = (q: any) => {
      shown.push(q);
      const ans = answers[q.id];
      const branchIds: string[] = (q.branches && ans && q.branches[ans]) || [];
      for (const bid of branchIds) { const bq = byId.get(bid); if (bq) pushChain(bq); }
    };
    for (const q of questions) { if (!q.is_branch) pushChain(q); }
    return shown;
  }, [bank, answers]);

  const submit = useMutation({
    mutationKey: ["llm", "voice.interview"],
    mutationFn: () => api.submitInterview(storyId, characterId, answers, tier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["identity", storyId, characterId] });
      setAnswers({}); setOpen(false);
    },
  });

  return (
    <Card>
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        <h3 className="font-display text-lg flex items-center gap-2"><MessagesSquare size={16}/> {c.heading}</h3>
        <Tag color="muted">{open ? c.hide : c.open}</Tag>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <FG label={c.depth}><Sel value={tier} onChange={e => { setTier(e.target.value); setAnswers({}); }}>{TIERS.map(t => <option key={t.key} value={t.key}>{c.tiers[t.key] ?? t.label}</option>)}</Sel></FG>
          <div className="space-y-4 max-h-[460px] overflow-y-auto scrollbar-thin pe-1">
            {LAYER_ORDER.map(layer => {
              const group = visible.filter(q => q.layer === layer);
              if (group.length === 0) return null;
              return (
                <div key={layer}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-text3 mb-1">{LAYER_TITLES[locale][layer] ?? layer}</p>
                  <div className="space-y-2">
                    {group.map(q => {
                      const ar = locale === "ar" ? AR_QUESTIONS[q.id] : undefined;
                      const options: string[] = Array.isArray(q.options) ? q.options : [];
                      return (
                        <FG key={q.id} label={ar?.text ?? q.text} hint={ar?.hint ?? q.hint}>
                          {options.length > 0 ? (
                            <Sel value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}>
                              <option value="">{c.choose}</option>
                              {options.map((o: string) => <option key={o} value={o}>{ar?.options?.[o] ?? o}</option>)}
                            </Sel>
                          ) : (
                            <Ta rows={2} value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
                          )}
                        </FG>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {visible.length === 0 && <p className="text-sm text-ink-text3">{c.loading}</p>}
          </div>
          <Btn variant="primary" disabled={submit.isPending || Object.keys(answers).length === 0} onClick={() => submit.mutate()}>
            <Sparkles size={14}/> {submit.isPending ? c.building : c.generate}
          </Btn>
        </div>
      )}
    </Card>
  );
}

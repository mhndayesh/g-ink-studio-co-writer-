"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Check, MessageSquarePlus, X, BookOpen, Languages, Drama } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, Sel, Ta, Tag } from "@/components/ui/Primitives";
import { useDebouncedSave } from "@/lib/debounce";
import { AiLockNotice } from "@/components/billing/AiLockNotice";
import { useEntitlement } from "@/lib/useEntitlement";
import { useI18n, type Locale } from "@/lib/i18n";

type Phase = "writing" | "polishing" | "reviewing" | "extracting" | "enhancing" | "done";

const copyEn = {
  titleFirst: "❦ Flow Writing",
  titleGap: (number: string) => `❦ Flow Writing — Chapter ${number} (fill gap)`,
  titleRedo: (number: string) => `❦ Flow Writing — Redo Chapter ${number}`,
  titleNext: (number: string) => `❦ Flow Writing — Chapter ${number}`,
  subGap: (number: string) => `Chapter ${number} is missing — write the scene that goes here.`,
  subRedo: (title: string) => `Overwriting "${title}". Any new characters/places will still be added; existing chapter ID stays the same.`,
  subFirst: "Pour out the raw idea. The AI shapes it into a scene and quietly files the rest.",
  subNext: (count: string) => `Continuing the story. The AI already knows your cast (${count}) and what happened so far.`,
  optNew: (number: string) => `+ New Chapter ${number}`,
  ogFillGap: "Fill a gap",
  optGap: (number: string) => `↳ Chapter ${number} (missing)`,
  ogRedo: "Redo existing (overwrite)",
  optRedo: (number: string, title: string) => `↻ Ch${number}: ${title}`,
  emptyPolishAlert: "The model returned an empty response. This usually happens with reasoning models (Qwen3, DeepSeek-R1) that spend their token budget on internal <think> reasoning. Try a shorter raw draft, or switch to a non-thinking model in Settings.",
  gapDetectedLabel: "Gap detected:",
  gapDetectedBody1: (numbers: string, isPlural: boolean) =>
    `Chapter${isPlural ? "s" : ""} ${numbers} ${isPlural ? "are" : "is"} missing. Writing now will fill Chapter `,
  gapDetectedBody2: ". (Change the target on the right if you'd rather skip the gap.)",
  listSeparator: ", ",
  comesAfter: "Comes after",
  prevChapter: (number: string, title: string) => `Ch${number}. ${title}`,
  nextSceneHint: "Just write what happens next. New characters/places/threads will be added; existing ones will be recognized.",
  labelGap: (number: string) => `Free write — what happens in Chapter ${number} (filling the gap)`,
  labelRedo: (number: string) => `Free write — re-doing Chapter ${number}`,
  labelFirst: "Free write",
  labelNext: (number: string) => `Free write — what happens in Chapter ${number}`,
  phFirst: "Write freely — fragments, typos, shorthand are all fine.",
  phNext: "Pick up where you left off…",
  sceneTitle: "Tell the AI who and where this scene is. Their full voice profile, masks and current state get pinned so they sound exactly like themselves.",
  sceneSetup: "Scene setup (optional)",
  pinned: (count: string) => `${count} pinned`,
  sceneWho: "Who's in this scene",
  sceneWhoHint: "Their full voice, masks & current state get pinned in context.",
  noCharacters: "No characters yet.",
  sceneWhere: "Where",
  sceneWhereHint: "Pins the place identity.",
  optionalOption: "— optional —",
  useAsIs: "Use my writing as-is →",
  working: "Working…",
  useAsIsTitle: "Keep your words as-is. The AI files characters, places, threads, scene cards, and revelations. If the language enhancer is on, it checks the language first.",
  enhancer: "Language enhancer",
  enhancerTitle: "Detect the language and suggest language-only improvements (grammar, word choice, flow) without changing the story. You decide whether to apply them.",
  shaping: "Shaping…",
  shapeBtn: "Shape this into a scene →",
  detected: (language: string) => `· detected: ${language}`,
  checking: "Checking your writing…",
  ignoreKeep: "Ignore & keep my original →",
  filing: "Filing…",
  applyContinue: "Apply & continue →",
  polishedProse: "Polished prose",
  discard: "Discard",
  revisionNotes: "Revision notes (optional)",
  notesPlaceholder: "e.g. make her angrier; the brother is older",
  revising: "Revising…",
  addNotesRevise: "Add notes & revise",
  readingScene: "Reading the scene…",
  approveWhat: "Approve — what's in it?",
  yourSceneAsIs: "Your scene (kept as-is)",
  polishedScene: "Polished scene",
  whatFound: "What the AI found",
  addedToExisting: "· will be added to your existing cast, world, and threads",
  extractionFailedTitle: "⚠ Extraction failed — LM Studio returned an error.",
  extractionFailedBody: "The model rejected the request. Most likely cause: the scene + story context exceeded the model's context window. Check LM Studio's console for the specific error, then switch to a model with a larger context window and re-run.",
  reRunning: "Re-running…",
  reRun: "Re-run extraction →",
  willFileNote: "New characters, themes, locations, threads, scene cards, and revelations are filed automatically when you approve.",
  chapterTitleLabel: "Chapter title",
  summaryLabel: "Summary",
  saveAs: "Save as",
  saveHintNew: (number: string) => `Will be added as Chapter ${number}.`,
  saveHintGap: (number: string) => `Will fill the gap at Chapter ${number}.`,
  saveHintRedo: "Will overwrite the chosen chapter (additive: any new characters/places/etc still get added).",
  ogFillGapLower: "Fill gap",
  optGapLower: (number: string) => `Chapter ${number} (missing)`,
  ogRedoLower: "Redo an existing chapter (overwrite)",
  charactersInScene: "Characters in this scene",
  charactersNote: "— new ones are added to your Cast automatically.",
  newTag: "new",
  existingTag: "existing",
  relationships: "Relationships",
  themes: "Themes",
  locations: "Locations",
  factions: "Factions",
  plotThreads: "Plot threads",
  worldRules: "World rules (added to world bible)",
  worldLore: "World lore (added to world bible)",
  sceneCards: "Scene cards",
  sceneTag: (ordinal: string) => `Scene ${ordinal}`,
  untitledScene: "Untitled scene",
  pov: (pov: string) => `POV: ${pov}`,
  goal: "Goal",
  conflict: "Conflict",
  outcome: "Outcome",
  keyEvents: "Key events",
  approveSaveNew: (number: string) => `Approve & save as Chapter ${number}`,
  approveFill: (number: string) => `Approve & fill Chapter ${number}`,
  approveOverwrite: "Approve & overwrite chosen chapter",
  threadStatus: { paid_off: "paid off", abandoned: "abandoned", open: "open", active: "active", resolved: "resolved", dormant: "dormant" } as Record<string, string>,
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    titleFirst: "❦ الكتابة الانسيابية",
    titleGap: (number: string) => `❦ الكتابة الانسيابية — الفصل ${number} (ملء فجوة)`,
    titleRedo: (number: string) => `❦ الكتابة الانسيابية — إعادة الفصل ${number}`,
    titleNext: (number: string) => `❦ الكتابة الانسيابية — الفصل ${number}`,
    subGap: (number: string) => `الفصل ${number} مفقود — اكتب المشهد الذي ينتمي إلى هذا الموضع.`,
    subRedo: (title: string) => `سيُستبدل «${title}». ستُضاف الشخصيات والأماكن الجديدة رغم ذلك؛ ويبقى معرّف الفصل كما هو.`,
    subFirst: "أفرِغ الفكرة الخام. يصوغها الذكاء الاصطناعي مشهدًا ويؤرشف الباقي بهدوء.",
    subNext: (count: string) => `متابعة القصة. الذكاء الاصطناعي يعرف شخصياتك (${count}) وما جرى حتى الآن.`,
    optNew: (number: string) => `+ فصل جديد (${number})`,
    ogFillGap: "املأ فجوة",
    optGap: (number: string) => `↳ الفصل ${number} (مفقود)`,
    ogRedo: "إعادة فصل موجود (استبدال)",
    optRedo: (number: string, title: string) => `↻ ف${number}: ${title}`,
    emptyPolishAlert: "أعاد النموذج استجابة فارغة. يحدث هذا عادةً مع نماذج الاستدلال (Qwen3 وDeepSeek-R1) التي تستهلك ميزانية الرموز في تفكير داخلي. جرّب مسودة خام أقصر، أو انتقل إلى نموذج غير استدلالي من الإعدادات.",
    gapDetectedLabel: "فجوة مكتشفة:",
    gapDetectedBody1: (numbers: string, isPlural: boolean) =>
      `${isPlural ? "الفصول المفقودة" : "الفصل المفقود"}: ${numbers}. الكتابة الآن ستملأ الفصل `,
    gapDetectedBody2: ". (غيّر الهدف من القائمة إن أردت تجاوز الفجوة.)",
    listSeparator: "، ",
    comesAfter: "يأتي بعد",
    prevChapter: (number: string, title: string) => `الفصل ${number}. ${title}`,
    nextSceneHint: "اكتب ما يحدث تاليًا فقط. ستُضاف الشخصيات والأماكن والخيوط الجديدة، وسيُتعرَّف على الموجود منها.",
    labelGap: (number: string) => `كتابة حرة — ما يحدث في الفصل ${number} (ملء الفجوة)`,
    labelRedo: (number: string) => `كتابة حرة — إعادة الفصل ${number}`,
    labelFirst: "كتابة حرة",
    labelNext: (number: string) => `كتابة حرة — ما يحدث في الفصل ${number}`,
    phFirst: "اكتب بحرية — الشذرات والأخطاء المطبعية والاختصارات كلها مقبولة.",
    phNext: "تابع من حيث توقفت…",
    sceneTitle: "أخبِر الذكاء الاصطناعي بمن في هذا المشهد وأين. تُثبَّت بصمة الصوت الكاملة والأقنعة والحالة الراهنة لكل شخصية لتتحدث كما هي تمامًا.",
    sceneSetup: "إعداد المشهد (اختياري)",
    pinned: (count: string) => `المثبّت: ${count}`,
    sceneWho: "من في هذا المشهد",
    sceneWhoHint: "تُثبَّت أصواتهم الكاملة وأقنعتهم وحالتهم الراهنة في السياق.",
    noCharacters: "لا توجد شخصيات بعد.",
    sceneWhere: "المكان",
    sceneWhereHint: "يثبّت هوية المكان.",
    optionalOption: "— اختياري —",
    useAsIs: "استخدم نصّي كما هو ←",
    working: "جارٍ العمل…",
    useAsIsTitle: "أبقِ كلماتك كما هي. يؤرشف الذكاء الاصطناعي الشخصيات والأماكن والخيوط وبطاقات المشاهد والكشوف. وإذا كان محسّن اللغة مفعّلًا، فسيفحص اللغة أولًا.",
    enhancer: "محسّن اللغة",
    enhancerTitle: "يكتشف اللغة ويقترح تحسينات لغوية فقط (القواعد واختيار الكلمات والانسيابية) دون تغيير القصة. وأنت تقرر تطبيقها.",
    shaping: "جارٍ الصياغة…",
    shapeBtn: "حوّل هذا إلى مشهد ←",
    detected: (language: string) => `· اللغة المكتشفة: ${language}`,
    checking: "جارٍ فحص كتابتك…",
    ignoreKeep: "تجاهل واحتفظ بنصّي الأصلي ←",
    filing: "جارٍ الأرشفة…",
    applyContinue: "طبّق وتابع ←",
    polishedProse: "النص المصقول",
    discard: "تجاهل",
    revisionNotes: "ملاحظات المراجعة (اختياري)",
    notesPlaceholder: "مثال: اجعلها أكثر غضبًا؛ الأخ أكبر سنًّا",
    revising: "جارٍ المراجعة…",
    addNotesRevise: "أضف ملاحظات وراجع",
    readingScene: "جارٍ قراءة المشهد…",
    approveWhat: "اعتماد — ماذا في المشهد؟",
    yourSceneAsIs: "مشهدك (كما هو)",
    polishedScene: "المشهد المصقول",
    whatFound: "ما رصده الذكاء الاصطناعي",
    addedToExisting: "· ستُضاف إلى شخصياتك وعالمك وخيوطك الحالية",
    extractionFailedTitle: "⚠ فشل الاستخلاص — أعاد LM Studio خطأً.",
    extractionFailedBody: "رفض النموذج الطلب. السبب الأرجح: تجاوز المشهد وسياق القصة نافذة السياق لدى النموذج. تحقّق من رسالة الخطأ في وحدة تحكم LM Studio، ثم انتقل إلى نموذج بنافذة سياق أكبر وأعد التشغيل.",
    reRunning: "جارٍ إعادة التنفيذ…",
    reRun: "أعد الاستخلاص ←",
    willFileNote: "تُؤرشف الشخصيات والموضوعات والأماكن والخيوط وبطاقات المشاهد والكشوف تلقائيًا عند الاعتماد.",
    chapterTitleLabel: "عنوان الفصل",
    summaryLabel: "الملخص",
    saveAs: "الحفظ باسم",
    saveHintNew: (number: string) => `سيُضاف كالفصل ${number}.`,
    saveHintGap: (number: string) => `سيملأ الفجوة عند الفصل ${number}.`,
    saveHintRedo: "سيُستبدل الفصل المختار (مع الإبقاء على الإضافة: ستُضاف الشخصيات والأماكن الجديدة أيضًا).",
    ogFillGapLower: "املأ فجوة",
    optGapLower: (number: string) => `الفصل ${number} (مفقود)`,
    ogRedoLower: "إعادة فصل موجود (استبدال)",
    charactersInScene: "الشخصيات في هذا المشهد",
    charactersNote: "— تُضاف الشخصيات الجديدة إلى قائمة شخصياتك تلقائيًا.",
    newTag: "جديدة",
    existingTag: "موجودة",
    relationships: "العلاقات",
    themes: "الموضوعات",
    locations: "الأماكن",
    factions: "الفصائل",
    plotThreads: "خيوط الحبكة",
    worldRules: "قواعد العالم (تُضاف إلى دليل العالم)",
    worldLore: "تاريخ العالم (يُضاف إلى دليل العالم)",
    sceneCards: "بطاقات المشاهد",
    sceneTag: (ordinal: string) => `المشهد ${ordinal}`,
    untitledScene: "مشهد بلا عنوان",
    pov: (pov: string) => `وجهة النظر: ${pov}`,
    goal: "الهدف",
    conflict: "الصراع",
    outcome: "النتيجة",
    keyEvents: "الأحداث الرئيسية",
    approveSaveNew: (number: string) => `اعتمد واحفظ كالفصل ${number}`,
    approveFill: (number: string) => `اعتمد واملأ الفصل ${number}`,
    approveOverwrite: "اعتمد واستبدل الفصل المختار",
    threadStatus: { paid_off: "مُستوفى", abandoned: "مهجور", open: "مفتوح", active: "نشط", resolved: "مكتمل", dormant: "خامل" },
  },
};

export default function FlowPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { aiAvailable } = useEntitlement();
  const { locale, t, formatNumber } = useI18n();
  const c = COPY[locale];

  const [raw, setRaw] = useState("");
  const [polished, setPolished] = useState("");
  const [notes, setNotes] = useState("");
  const [extracted, setExtracted] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>("writing");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");
  const [enhancerOn, setEnhancerOn] = useState(false);
  const [enhancement, setEnhancement] = useState<{ language: string; enhanced: string; notes: string } | null>(null);

  // Scene setup (optional): who/where this scene is. Pins their full identity in
  // the AI context so in-scene characters always sound exactly like themselves.
  const [sceneCharIds, setSceneCharIds] = useState<string[]>([]);
  const [sceneLocId, setSceneLocId] = useState<string>("");
  const [sceneSetupOpen, setSceneSetupOpen] = useState(false);

  const { data: draft } = useQuery({ queryKey: ["flow-draft", storyId], queryFn: () => api.flowGetDraft(storyId) });
  const { data: existingChapters } = useQuery({ queryKey: ["chapters", storyId], queryFn: () => api.listChapters(storyId) });
  const { data: existingCharacters } = useQuery({ queryKey: ["characters", storyId], queryFn: () => api.listCharacters(storyId) });
  const { data: existingLocations } = useQuery({ queryKey: ["locations", storyId], queryFn: () => api.listLocations(storyId) });

  // Use max(chapter.number) + 1 so the hint matches what the backend will
  // actually assign on approve — even after deletes leave gaps.
  const lastChapter = useMemo(() => {
    if (!existingChapters || existingChapters.length === 0) return null;
    return [...existingChapters].sort((a, b) => b.number - a.number)[0];
  }, [existingChapters]);
  const nextChapterNumber = lastChapter ? lastChapter.number + 1 : 1;

  // Detect gaps in chapter numbering (e.g. Ch1, Ch3 exist → gap at Ch2).
  const numberGaps = useMemo<number[]>(() => {
    if (!existingChapters || existingChapters.length === 0) return [];
    const present = new Set(existingChapters.map((ch: any) => ch.number));
    const gaps: number[] = [];
    for (let i = 1; i <= (lastChapter?.number || 0); i++) {
      if (!present.has(i)) gaps.push(i);
    }
    return gaps;
  }, [existingChapters, lastChapter]);

  // Where to save on Approve: "new" = append, or a chapter id = overwrite, or "gap:N" = fill gap N
  // Default: if there are gaps (the writer deleted a middle chapter), aim at the
  // lowest gap first — so writing fills the hole instead of jumping to the end.
  const [target, setTarget] = useState<string>("new");
  const [targetTouched, setTargetTouched] = useState(false);
  useEffect(() => {
    if (targetTouched) return;
    setTarget(numberGaps.length > 0 ? `gap:${numberGaps[0]}` : "new");
  }, [storyId, numberGaps, targetTouched]);

  // The "active number" we're writing into right now (drives the header + story-so-far card).
  const activeChapterNumber = target.startsWith("gap:")
    ? Number(target.slice(4))
    : target !== "new"
      ? (existingChapters?.find((ch: any) => ch.id === target)?.number || nextChapterNumber)
      : nextChapterNumber;

  // For "story so far" we want the chapter that comes BEFORE the active one in order.
  const previousChapter = useMemo(() => {
    if (!existingChapters) return null;
    const before = existingChapters.filter((ch: any) => ch.number < activeChapterNumber);
    if (before.length === 0) return null;
    return [...before].sort((a:any,b:any) => b.number - a.number)[0];
  }, [existingChapters, activeChapterNumber]);

  useEffect(() => {
    if (!draft) return;
    if (raw === "" && polished === "") {
      setRaw(draft.raw || "");
      setPolished(draft.polished || "");
      setNotes(draft.notes || "");
      // Only restore extracted if it has real content — an empty FlowExtractResponse
      // (all keys present, all arrays empty) is truthy in JS and would show the
      // approve section with nothing in it, letting the user commit empty entities.
      const ext = draft.extracted;
      if (ext && (ext.title_suggestion || (ext.characters?.length ?? 0) > 0)) setExtracted(ext);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Autosave the in-progress draft every ~900ms
  useDebouncedSave({ raw, polished, notes, extracted }, 900, (v) => {
    if (!v.raw && !v.polished) return;
    api.flowSaveDraft(storyId, v).catch(() => {});
  });

  const polish = useMutation({
    mutationKey: ["llm", "flow.polish"],
    mutationFn: () => api.flowPolish(storyId, raw, notes, { scene_character_ids: sceneCharIds, scene_location_id: sceneLocId || null }),
    onMutate: () => setPhase("polishing"),
    onSuccess: (r) => {
      if (!r.polished || !r.polished.trim()) {
        alert(c.emptyPolishAlert);
        setPhase("writing");
        return;
      }
      setPolished(r.polished); setPhase("reviewing");
    },
    onError: () => setPhase("writing"),
  });

  const extract = useMutation({
    mutationKey: ["llm", "flow.extract"],
    mutationFn: () => api.flowExtract(storyId, polished),
    onMutate: () => setPhase("extracting"),
    onSuccess: (r) => {
      setExtracted(r);
      setChapterTitle(r.title_suggestion || "");
      setChapterSummary(r.summary || "");
      setPhase("done");
    },
    onError: () => setPhase("reviewing"),
  });

  const enhance = useMutation({
    mutationKey: ["llm", "flow.enhance"],
    mutationFn: () => api.flowEnhance(storyId, raw),
    onMutate: () => setPhase("enhancing"),
    onSuccess: (r) => { setEnhancement(r); },
    onError: () => setPhase("writing"),
  });

  // Skip AI polish entirely: use the raw text as-is and jump straight to extract.
  // If the language enhancer is on, run enhancement first.
  const skipPolish = useMutation({
    mutationKey: ["llm", "flow.skip-polish"],
    mutationFn: (text: string) => api.flowExtract(storyId, text),
    onMutate: (text) => { setPolished(text); setPhase("extracting"); },
    onSuccess: (r) => {
      setExtracted(r);
      setChapterTitle(r.title_suggestion || "");
      setChapterSummary(r.summary || "");
      setPhase("done");
    },
    onError: () => setPhase("writing"),
  });

  function handleUseAsIs() {
    if (enhancerOn) {
      setEnhancement(null);
      enhance.mutate();
    } else {
      skipPolish.mutate(raw);
    }
  }

  const approve = useMutation({
    mutationKey: ["llm", "flow.approve"],
    mutationFn: () => {
      const body: any = {
        raw, polished, extracted,
        include_character_names: [],  // empty = auto-add everything new
        chapter_title: chapterTitle, chapter_summary: chapterSummary,
      };
      if (target.startsWith("gap:")) body.target_chapter_number = Number(target.slice(4));
      else if (target !== "new") body.target_chapter_id = target;
      return api.flowApprove(storyId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chapters", storyId] });
      qc.invalidateQueries({ queryKey: ["characters", storyId] });
      qc.invalidateQueries({ queryKey: ["locations", storyId] });
      qc.invalidateQueries({ queryKey: ["world", storyId] });
      qc.invalidateQueries({ queryKey: ["factions", storyId] });
      qc.invalidateQueries({ queryKey: ["threads", storyId] });
      qc.invalidateQueries({ queryKey: ["scenes", storyId] });
      qc.invalidateQueries({ queryKey: ["timeline", storyId] });
      qc.invalidateQueries({ queryKey: ["weave", storyId] });
      qc.invalidateQueries({ queryKey: ["revelations", storyId] });
      qc.invalidateQueries({ queryKey: ["voice", storyId] });
      qc.invalidateQueries({ queryKey: ["graph", storyId] });
      // Reset for the next scene; let the gap-detector pick the new default target
      setRaw(""); setPolished(""); setNotes(""); setExtracted(null);
      setChapterTitle(""); setChapterSummary("");
      setTargetTouched(false);
      setPhase("writing");
    },
  });

  function reset() {
    setRaw(""); setPolished(""); setExtracted(null); setNotes(""); setPhase("writing");
    setChapterTitle(""); setChapterSummary(""); setEnhancement(null);
    polish.reset(); extract.reset(); skipPolish.reset(); enhance.reset();
    // Also clear the server-side draft so the next Flow Writing visit starts blank.
    api.flowClearDraft(storyId).catch(() => {});
    qc.invalidateQueries({ queryKey: ["flow-draft", storyId] });
  }

  const isFillingGap = target.startsWith("gap:");
  const isRedoing = target !== "new" && !isFillingGap;
  const redoingChapter = isRedoing ? existingChapters?.find((ch: any) => ch.id === target) : null;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHdr
        title={
          activeChapterNumber === 1 && target === "new"
            ? c.titleFirst
            : isFillingGap
              ? c.titleGap(formatNumber(activeChapterNumber))
              : isRedoing
                ? c.titleRedo(formatNumber(activeChapterNumber))
                : c.titleNext(formatNumber(activeChapterNumber))
        }
        subtitle={
          isFillingGap
            ? c.subGap(formatNumber(activeChapterNumber))
            : isRedoing
              ? c.subRedo(redoingChapter?.title || "")
              : activeChapterNumber === 1
                ? c.subFirst
                : c.subNext(formatNumber(existingCharacters?.length || 0))
        }
        right={
          (existingChapters && existingChapters.length > 0) ? (
            <select
              className="input max-w-xs"
              value={target}
              onChange={(e) => { setTarget(e.target.value); setTargetTouched(true); }}
            >
              <option value="new">{c.optNew(formatNumber(nextChapterNumber))}</option>
              {numberGaps.length > 0 && (
                <optgroup label={c.ogFillGap}>
                  {numberGaps.map(n => <option key={`gap:${n}`} value={`gap:${n}`}>{c.optGap(formatNumber(n))}</option>)}
                </optgroup>
              )}
              <optgroup label={c.ogRedo}>
                {[...existingChapters].sort((a:any,b:any)=>a.number-b.number).map((ch: any) => (
                  <option key={ch.id} value={ch.id}>{c.optRedo(formatNumber(ch.number), ch.title || t("common.untitled"))}</option>
                ))}
              </optgroup>
            </select>
          ) : undefined
        }
      />

      <AiLockNotice />

      {(phase === "writing" || phase === "polishing") && (
        <>
          {numberGaps.length > 0 && !targetTouched && (
            <Card className="mb-4 border-ink-gold/40 bg-ink-gold/5">
              <p className="text-sm">
                <strong className="text-ink-goldLight">{c.gapDetectedLabel}</strong>{" "}
                {c.gapDetectedBody1(
                  numberGaps.map(n => formatNumber(n)).join(c.listSeparator),
                  numberGaps.length > 1,
                )}
                <strong>{formatNumber(numberGaps[0])}</strong>
                {c.gapDetectedBody2}
              </p>
            </Card>
          )}
          {previousChapter && (
            <Card className="mb-4 border-ink-gold/30">
              <div className="flex items-center gap-2 text-xs text-ink-text2 uppercase tracking-wider mb-2"><BookOpen size={12}/> {c.comesAfter}</div>
              <p className="text-sm"><strong>{c.prevChapter(formatNumber(previousChapter.number), previousChapter.title)}</strong>{previousChapter.summary && <span className="text-ink-text2"> — {previousChapter.summary}</span>}</p>
              <p className="text-xs text-ink-text3 mt-2">{c.nextSceneHint}</p>
            </Card>
          )}
          <Card>
            <FG label={isFillingGap
              ? c.labelGap(formatNumber(activeChapterNumber))
              : isRedoing
                ? c.labelRedo(formatNumber(activeChapterNumber))
                : activeChapterNumber === 1
                  ? c.labelFirst
                  : c.labelNext(formatNumber(activeChapterNumber))}>
              <Ta rows={12} value={raw} onChange={e => setRaw(e.target.value)}
                  placeholder={activeChapterNumber === 1 && target === "new"
                    ? c.phFirst
                    : c.phNext}
                  className="text-base leading-relaxed" />
            </FG>

            {/* Scene setup (optional) — pins the in-scene cast's full voice/identity. */}
            <div className="mt-3 border-t border-ink-border pt-3">
              <button
                type="button"
                onClick={() => setSceneSetupOpen(o => !o)}
                className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-text2 hover:text-ink-text"
                title={c.sceneTitle}
              >
                <Drama size={12} className={sceneCharIds.length || sceneLocId ? "text-ink-gold" : "text-ink-text3"} />
                {c.sceneSetup}
                {(sceneCharIds.length > 0 || sceneLocId) && (
                  <Tag color="gold">{c.pinned(formatNumber(sceneCharIds.length + (sceneLocId ? 1 : 0)))}</Tag>
                )}
                <span className="text-ink-text3">{sceneSetupOpen ? "▾" : "▸"}</span>
              </button>
              {sceneSetupOpen && (
                <div className="mt-2 grid gap-3 md:grid-cols-[1fr_220px]">
                  <FG label={c.sceneWho} hint={c.sceneWhoHint}>
                    <div className="flex flex-wrap gap-1.5">
                      {(existingCharacters || []).map((ch: any) => {
                        const on = sceneCharIds.includes(ch.id);
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => setSceneCharIds(ids => on ? ids.filter(x => x !== ch.id) : [...ids, ch.id])}
                            className={`px-2.5 py-1 rounded text-xs border ${on ? "border-ink-gold/40 bg-ink-gold/10 text-ink-goldLight" : "border-ink-border text-ink-text2 hover:text-ink-text"}`}
                          >
                            {ch.name}
                          </button>
                        );
                      })}
                      {(existingCharacters || []).length === 0 && <span className="text-xs text-ink-text3">{c.noCharacters}</span>}
                    </div>
                  </FG>
                  <FG label={c.sceneWhere} hint={c.sceneWhereHint}>
                    <Sel value={sceneLocId} onChange={e => setSceneLocId(e.target.value)}>
                      <option value="">{c.optionalOption}</option>
                      {(existingLocations || []).map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </Sel>
                  </FG>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 mt-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Btn
                  variant="ghost"
                  disabled={!raw.trim() || polish.isPending || skipPolish.isPending || enhance.isPending || !aiAvailable}
                  onClick={handleUseAsIs}
                  title={c.useAsIsTitle}
                >
                  {(skipPolish.isPending || enhance.isPending) ? c.working : c.useAsIs}
                </Btn>
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-ink-text2" title={c.enhancerTitle}>
                  <Languages size={13} className={enhancerOn ? "text-ink-gold" : "text-ink-text3"} />
                  <span className={enhancerOn ? "text-ink-goldLight" : ""}>{c.enhancer}</span>
                  <div
                    onClick={() => setEnhancerOn(v => !v)}
                    className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${enhancerOn ? "bg-ink-gold" : "bg-ink-surface3 border border-ink-border"}`}
                  >
                    <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: enhancerOn ? 16 : 2 }} />
                  </div>
                </label>
              </div>
              <Btn
                variant="primary"
                disabled={!raw.trim() || polish.isPending || skipPolish.isPending || enhance.isPending}
                onClick={() => polish.mutate()}
              >
                <Sparkles size={14}/> {polish.isPending ? c.shaping : c.shapeBtn}
              </Btn>
            </div>
          </Card>
        </>
      )}

      {phase === "enhancing" && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg flex items-center gap-2">
              <Languages size={16} className="text-ink-gold" /> {c.enhancer}
              {enhancement?.language && <span className="text-sm font-normal text-ink-text2">{c.detected(enhancement.language)}</span>}
            </h2>
            <Btn variant="ghost" onClick={() => { setPhase("writing"); setEnhancement(null); }}><X size={14} className="rtl-flip"/> {t("common.back")}</Btn>
          </div>

          {!enhancement ? (
            <p className="text-sm text-ink-text2">{c.checking}</p>
          ) : (
            <>
              {enhancement.notes && (
                <p className="text-xs text-ink-text2 mb-3 italic">{enhancement.notes}</p>
              )}
              <div className="rounded border border-ink-border bg-ink-surface2/60 p-3 mb-4 max-h-72 overflow-y-auto scrollbar-thin">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-ink-text">{enhancement.enhanced}</pre>
              </div>
              <div className="flex gap-2 justify-end">
                <Btn
                  variant="ghost"
                  disabled={skipPolish.isPending}
                  onClick={() => skipPolish.mutate(raw)}
                >
                  {c.ignoreKeep}
                </Btn>
                <Btn
                  variant="primary"
                  disabled={skipPolish.isPending}
                  onClick={() => { setRaw(enhancement.enhanced); skipPolish.mutate(enhancement.enhanced); }}
                >
                  <Check size={14}/> {skipPolish.isPending ? c.filing : c.applyContinue}
                </Btn>
              </div>
            </>
          )}
        </Card>
      )}

      {(phase === "reviewing" || phase === "extracting") && (
        <>
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg">{c.polishedProse}</h2>
              <Btn variant="ghost" onClick={reset}><X size={14}/> {c.discard}</Btn>
            </div>
            <Ta rows={14} value={polished} onChange={e => setPolished(e.target.value)} className="leading-relaxed" />
            <FG label={c.revisionNotes}>
              <Inp value={notes} onChange={e => setNotes(e.target.value)} placeholder={c.notesPlaceholder} />
            </FG>
            <div className="flex gap-2 justify-end mt-2">
              <Btn onClick={() => polish.mutate()} disabled={polish.isPending || !aiAvailable}>
                <MessageSquarePlus size={14}/> {polish.isPending ? c.revising : c.addNotesRevise}
              </Btn>
              <Btn variant="primary" disabled={!polished.trim() || extract.isPending || !aiAvailable} onClick={() => extract.mutate()}>
                <Sparkles size={14}/> {extract.isPending ? c.readingScene : c.approveWhat}
              </Btn>
            </div>
          </Card>
        </>
      )}

      {phase === "done" && extracted && (
        <>
          <Card className="mb-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs uppercase tracking-wider text-ink-text2">
                {polished === raw ? c.yourSceneAsIs : c.polishedScene}
              </p>
              <Btn variant="ghost" onClick={() => setPhase(polished === raw ? "writing" : "reviewing")}>
                <X size={12}/> {t("common.edit")}
              </Btn>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-sm text-ink-text max-h-60 overflow-y-auto scrollbar-thin border-s-2 border-ink-border ps-3">{polished}</pre>
          </Card>
          <Card className="mb-4">
            <h2 className="font-display text-lg mb-2">
              {c.whatFound}
              {nextChapterNumber > 1 && <span className="text-sm text-ink-text2 font-normal ms-2">{c.addedToExisting}</span>}
            </h2>
            {extracted.fallback && (
              <div className="mb-3 p-3 border border-ink-red/40 bg-ink-red/10 rounded text-sm text-ink-red space-y-2">
                <p className="font-semibold">{c.extractionFailedTitle}</p>
                <p className="text-xs opacity-90">{c.extractionFailedBody}</p>
                <button
                  className="text-xs underline opacity-80 hover:opacity-100"
                  onClick={() => extract.mutate()}
                  disabled={extract.isPending}
                >
                  {extract.isPending ? c.reRunning : c.reRun}
                </button>
              </div>
            )}
            <p className="text-sm text-ink-text2 mb-4">{c.willFileNote}</p>

            <div className="grid gap-4 md:grid-cols-2">
              <FG label={c.chapterTitleLabel}><Inp value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} /></FG>
              <FG label={c.summaryLabel}><Inp value={chapterSummary} onChange={e => setChapterSummary(e.target.value)} /></FG>
            </div>
            <FG label={c.saveAs} hint={
              target === "new"
                ? c.saveHintNew(formatNumber(nextChapterNumber))
                : target.startsWith("gap:")
                  ? c.saveHintGap(formatNumber(Number(target.slice(4))))
                  : c.saveHintRedo
            }>
              <select className="input" value={target} onChange={e => { setTarget(e.target.value); setTargetTouched(true); }}>
                <option value="new">{c.optNew(formatNumber(nextChapterNumber))}</option>
                {numberGaps.length > 0 && (
                  <optgroup label={c.ogFillGapLower}>
                    {numberGaps.map(n => <option key={`gap:${n}`} value={`gap:${n}`}>{c.optGapLower(formatNumber(n))}</option>)}
                  </optgroup>
                )}
                {(existingChapters || []).length > 0 && (
                  <optgroup label={c.ogRedoLower}>
                    {[...(existingChapters || [])].sort((a:any,b:any)=>a.number-b.number).map((ch: any) => (
                      <option key={ch.id} value={ch.id}>{c.optRedo(formatNumber(ch.number), ch.title || t("common.untitled"))}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </FG>

            {(extracted.characters || []).length > 0 && (
              <div className="mb-4">
                <h3 className="label">{c.charactersInScene} <span className="text-ink-text3 normal-case tracking-normal">{c.charactersNote}</span></h3>
                <div className="flex flex-wrap gap-2">
                  {extracted.characters.map((char: any) => (
                    <div key={char.name} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border ${char.is_new ? "border-ink-gold/40 bg-ink-gold/10" : "border-ink-border bg-ink-surface2"}`}>
                      <span>{char.name}</span>
                      {char.role && <span className="text-xs text-ink-text2">· {char.role}</span>}
                      <Tag color={char.is_new ? "gold" : "muted"}>{char.is_new ? c.newTag : c.existingTag}</Tag>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(extracted.relationships || []).length > 0 && (
              <div className="mb-3">
                <h3 className="label">{c.relationships}</h3>
                <ul className="space-y-1 text-sm">
                  {extracted.relationships.map((r: any, i: number) => (
                    <li key={i}>• <strong>{r.source}</strong> <Tag color="gold">{r.type}</Tag> <strong>{r.target}</strong>{r.description && <span className="text-ink-text2"> — {r.description}</span>}</li>
                  ))}
                </ul>
              </div>
            )}
            {(extracted.themes || []).length > 0 && (
              <div className="mb-3">
                <h3 className="label">{c.themes}</h3>
                <div className="flex flex-wrap gap-2">{extracted.themes.map((theme: string) => <Tag key={theme} color="green">{theme}</Tag>)}</div>
              </div>
            )}
            {(extracted.locations || []).length > 0 && (
              <div className="mb-3">
                <h3 className="label">{c.locations}</h3>
                <div className="flex flex-wrap gap-2">{extracted.locations.map((loc: any) => <Tag key={loc.name} color="rose">{loc.name}</Tag>)}</div>
              </div>
            )}
            {(extracted.factions || []).length > 0 && (
              <div className="mb-3">
                <h3 className="label">{c.factions}</h3>
                <div className="flex flex-wrap gap-2">{extracted.factions.map((faction: any) => <Tag key={faction.name} color="muted">{faction.name}</Tag>)}</div>
              </div>
            )}
            {(extracted.threads || []).length > 0 && (
              <div className="mb-3">
                <h3 className="label">{c.plotThreads}</h3>
                <ul className="space-y-1 text-sm">
                  {extracted.threads.map((thread: any, i: number) => (<li key={i}>• <strong>{thread.name}</strong> <Tag color={thread.status === "paid_off" ? "green" : thread.status === "abandoned" ? "muted" : "gold"}>{c.threadStatus[thread.status] ?? thread.status}</Tag>{thread.description && <span className="text-ink-text2"> — {thread.description}</span>}</li>))}
                </ul>
              </div>
            )}
            {(extracted.world_rules || []).length > 0 && (
              <div className="mb-3">
                <h3 className="label">{c.worldRules}</h3>
                <ul className="space-y-1 text-sm">
                  {extracted.world_rules.map((rule: string, i: number) => <li key={i}>• {rule}</li>)}
                </ul>
              </div>
            )}
            {extracted.world_lore && (
              <div className="mb-3">
                <h3 className="label">{c.worldLore}</h3>
                <p className="text-sm text-ink-text2">{extracted.world_lore}</p>
              </div>
            )}
            {(extracted.scenes || []).length > 0 && (
              <div className="mb-3">
                <h3 className="label">{c.sceneCards}</h3>
                <div className="space-y-2">
                  {extracted.scenes.map((s: any, i: number) => (
                    <div key={i} className="rounded border border-ink-border bg-ink-surface2/60 p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Tag color="muted">{c.sceneTag(formatNumber(s.ordinal || i + 1))}</Tag>
                        <strong>{s.title || s.beat || c.untitledScene}</strong>
                        {s.pov && <Tag color="gold">{c.pov(s.pov)}</Tag>}
                        {s.location && <Tag color="rose">{s.location}</Tag>}
                      </div>
                      {s.summary && <p className="text-sm text-ink-text2">{s.summary}</p>}
                      {(s.goal || s.conflict || s.outcome) && (
                        <p className="text-xs text-ink-text3 mt-1">
                          {[s.goal && `${c.goal}: ${s.goal}`, s.conflict && `${c.conflict}: ${s.conflict}`, s.outcome && `${c.outcome}: ${s.outcome}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {s.sensory_palette && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(s.sensory_palette).map(([sense, value]) => <Tag key={sense} color="muted">{sense} {String(value)}</Tag>)}
                        </div>
                      )}
                      {(s.revelations || []).length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-ink-text2">
                          {s.revelations.map((r: any, ri: number) => <li key={ri}>• {r.description}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(extracted.events || []).length > 0 && (
              <div className="mb-3">
                <h3 className="label">{c.keyEvents}</h3>
                <ul className="space-y-1 text-sm">
                  {extracted.events.map((e: any, i: number) => (<li key={i}>• <span className="text-ink-text3 uppercase tracking-wider text-[10px] me-1">{e.kind}</span> {e.description}</li>))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 justify-end mt-4">
              <Btn variant="ghost" onClick={reset}>{c.discard}</Btn>
              <Btn variant="primary" disabled={approve.isPending || (!extracted?.title_suggestion && !(extracted?.characters?.length))} onClick={() => approve.mutate()}>
                <Check size={14}/> {approve.isPending
                  ? c.filing
                  : target === "new"
                    ? c.approveSaveNew(formatNumber(nextChapterNumber))
                    : target.startsWith("gap:")
                      ? c.approveFill(formatNumber(Number(target.slice(4))))
                      : c.approveOverwrite}
              </Btn>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

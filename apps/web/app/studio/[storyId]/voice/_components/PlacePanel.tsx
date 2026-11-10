"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Sparkles, Wand2 } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, Ta, Tag } from "@/components/ui/Primitives";
import { useDebouncedSave } from "@/lib/debounce";
import { useI18n } from "@/lib/i18n";

const SENSES = ["sound", "smell", "lighting", "temperature", "textures"];
const VARIATIONS = ["time", "weather", "phase"];

const COPY = {
  en: {
    locations: "Locations",
    noLocations: "No locations yet. Add them in the Locations tab.",
    pickLocation: "Pick a location.",
    loading: "Loading…",
    buildHeading: "Build from a few questions",
    hide: "hide",
    open: "open",
    building: "Building…",
    generate: "Generate place profile",
    placeIdentity: "Place identity",
    purpose: "Purpose",
    atmosphere: "Emotional atmosphere",
    sensoryPalette: "Sensory palette",
    spatialLayout: "Spatial layout (affects action)",
    controlsSpace: "Who controls the space",
    socialRules: "Social rules",
    normalBehavior: "How people normally behave",
    variations: "Variations",
    variationBy: (v: string) => `By ${v}`,
    symbolicMotif: "Symbolic motif",
    autosaves: "Autosaves as you type.",
    senses: {
      sound: "sound",
      smell: "smell",
      lighting: "lighting",
      temperature: "temperature",
      textures: "textures",
    } as Record<string, string>,
    variationLabels: { time: "time", weather: "weather", phase: "phase" } as Record<string, string>,
  },
  ar: {
    locations: "الأماكن",
    noLocations: "لا توجد أماكن بعد. أضِفها من تبويب الأماكن.",
    pickLocation: "اختر مكانًا.",
    loading: "جارٍ التحميل…",
    buildHeading: "ابنِ من بضعة أسئلة",
    hide: "إخفاء",
    open: "فتح",
    building: "جارٍ البناء…",
    generate: "توليد ملف المكان",
    placeIdentity: "هوية المكان",
    purpose: "الغاية",
    atmosphere: "الأجواء العاطفية",
    sensoryPalette: "لوحة الحواس",
    spatialLayout: "التوزيع المكاني (يؤثر في الأفعال)",
    controlsSpace: "من يتحكّم في المكان",
    socialRules: "القواعد الاجتماعية",
    normalBehavior: "السلوك المعتاد للناس",
    variations: "التغيّرات",
    variationBy: (v: string) => `بحسب ${v}`,
    symbolicMotif: "الموتيف الرمزي",
    autosaves: "يُحفظ تلقائيًا أثناء الكتابة.",
    senses: {
      sound: "الصوت",
      smell: "الرائحة",
      lighting: "الإضاءة",
      temperature: "الحرارة",
      textures: "الملمس",
    } as Record<string, string>,
    variationLabels: { time: "الوقت", weather: "الطقس", phase: "مرحلة القصة" } as Record<string, string>,
  },
} as const;

// Arabic display text for the API place question bank, keyed by canonical id.
const AR_PLACE_QUESTIONS: Record<string, string> = {
  purpose: "فيمَ هذا المكان — وما الذي يحدث فيه؟",
  atmosphere: "ما الأجواء العاطفية حين تدخله؟",
  sound: "كيف يبدو صوته؟",
  smell: "كيف تبدو رائحته؟",
  lighting: "كيف تبدو الإضاءة؟",
  anchors: "ما مرتكز أو مرتكزان بصريان لا يُنسيان؟",
  layout: "كيف يشكّل التوزيع المكاني ما يستطيع الناس فعله هنا؟",
  control: "من يتحكّم في هذا المكان، وما قواعده غير المكتوبة؟",
  variation: "كيف يتغيّر بحسب الوقت أو الطقس أو مرحلة القصة؟",
  motif: "هل ثمة موتيف رمزي متكرر مرتبط بهذا المكان؟",
};

export function PlacePanel({ storyId }: { storyId: string }) {
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data: locations } = useQuery({ queryKey: ["locations", storyId], queryFn: () => api.listLocations(storyId) });
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { if (!activeId && locations && locations.length > 0) setActiveId(locations[0].id); }, [locations, activeId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-6 max-w-5xl">
      <aside>
        <p className="label mb-2">{c.locations}</p>
        <ul className="space-y-1">
          {(locations || []).map((l: any) => (
            <li key={l.id}>
              <button onClick={() => setActiveId(l.id)} className={`w-full text-start px-3 py-2 rounded text-sm ${activeId === l.id ? "bg-ink-gold/10 text-ink-goldLight border border-ink-gold/30" : "text-ink-text2 hover:text-ink-text hover:bg-ink-surface2"}`}>
                {l.name}
              </button>
            </li>
          ))}
          {(!locations || locations.length === 0) && <li className="text-sm text-ink-text3">{c.noLocations}</li>}
        </ul>
      </aside>
      <section>{activeId ? <PlaceEditor storyId={storyId} locationId={activeId} /> : <p className="text-ink-text2">{c.pickLocation}</p>}</section>
    </div>
  );
}

function PlaceEditor({ storyId, locationId }: { storyId: string; locationId: string }) {
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data: place } = useQuery({ queryKey: ["place", storyId, locationId], queryFn: () => api.getPlaceIdentity(storyId, locationId) });
  const [draft, setDraft] = useState<any>(null);
  useEffect(() => { setDraft(place ? { ...place } : null); }, [place?.id]);

  const save = useMutation({
    mutationFn: (patch: any) => api.patchPlaceIdentity(storyId, locationId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["place", storyId, locationId] }),
  });
  useDebouncedSave(draft, 900, (d) => {
    if (!d) return;
    const { id, location_id, story_id, ...patch } = d;
    save.mutate(patch);
  });

  if (!draft) return <p className="text-ink-text2">{c.loading}</p>;
  return (
    <div className="space-y-4">
      <PlaceBuild storyId={storyId} locationId={locationId} />
      <PlaceFields draft={draft} setDraft={setDraft} />
    </div>
  );
}

function PlaceBuild({ storyId, locationId }: { storyId: string; locationId: string }) {
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { data: bank } = useQuery({ queryKey: ["place-questions", storyId], queryFn: () => api.getPlaceQuestions(storyId), enabled: open });
  const build = useMutation({
    mutationKey: ["llm", "voice.place"],
    mutationFn: () => api.buildPlace(storyId, locationId, answers),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["place", storyId, locationId] }); setAnswers({}); setOpen(false); },
  });
  return (
    <Card>
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        <h3 className="font-display text-lg flex items-center gap-2"><Wand2 size={16}/> {c.buildHeading}</h3>
        <Tag color="muted">{open ? c.hide : c.open}</Tag>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {(bank?.questions || []).map((q: any) => (
            <FG key={q.id} label={(locale === "ar" ? AR_PLACE_QUESTIONS[q.id] : undefined) ?? q.text}><Inp value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} /></FG>
          ))}
          <Btn variant="primary" disabled={build.isPending || Object.keys(answers).length === 0} onClick={() => build.mutate()}>
            <Sparkles size={14}/> {build.isPending ? c.building : c.generate}
          </Btn>
        </div>
      )}
    </Card>
  );
}

function PlaceFields({ draft, setDraft }: { draft: any; setDraft: (fn: any) => void }) {
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const setF = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));
  const sensory = draft.sensory_palette || {};
  const variations = draft.variations || {};

  return (
    <Card>
      <h3 className="font-display text-lg mb-3 flex items-center gap-2"><MapPin size={16}/> {c.placeIdentity}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <FG label={c.purpose}><Ta rows={2} value={draft.purpose || ""} onChange={e => setF("purpose", e.target.value)} /></FG>
        <FG label={c.atmosphere}><Ta rows={2} value={draft.atmosphere || ""} onChange={e => setF("atmosphere", e.target.value)} /></FG>
      </div>
      <div className="mt-3">
        <p className="label mb-2">{c.sensoryPalette}</p>
        <div className="grid gap-3 md:grid-cols-5">
          {SENSES.map(s => <FG key={s} label={c.senses[s] ?? s}><Inp value={sensory[s] || ""} onChange={e => setF("sensory_palette", { ...sensory, [s]: e.target.value })} /></FG>)}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 mt-3">
        <FG label={c.spatialLayout}><Ta rows={2} value={draft.spatial_layout || ""} onChange={e => setF("spatial_layout", e.target.value)} /></FG>
        <FG label={c.controlsSpace}><Inp value={draft.controls_space || ""} onChange={e => setF("controls_space", e.target.value)} /></FG>
        <FG label={c.socialRules}><Ta rows={2} value={draft.social_rules || ""} onChange={e => setF("social_rules", e.target.value)} /></FG>
        <FG label={c.normalBehavior}><Ta rows={2} value={draft.normal_behavior || ""} onChange={e => setF("normal_behavior", e.target.value)} /></FG>
      </div>
      <div className="mt-3">
        <p className="label mb-2">{c.variations}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {VARIATIONS.map(v => <FG key={v} label={c.variationBy(c.variationLabels[v] ?? v)}><Inp value={variations[v] || ""} onChange={e => setF("variations", { ...variations, [v]: e.target.value })} /></FG>)}
        </div>
      </div>
      <FG label={c.symbolicMotif}><Inp value={draft.symbolic_motif || ""} onChange={e => setF("symbolic_motif", e.target.value)} /></FG>
      <p className="text-xs text-ink-text3 mt-2">{c.autosaves}</p>
    </Card>
  );
}

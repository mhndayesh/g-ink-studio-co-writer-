"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, QueryError, Sel, Ta, Tag } from "@/components/ui/Primitives";
import { useDebouncedSave } from "@/lib/debounce";
import { useI18n } from "@/lib/i18n";

const SENSES = ["sight", "sound", "smell", "taste", "touch"];

const COPY = {
  en: {
    title: "Scene Cards",
    scene: "Scene",
    newScene: "New scene",
    defaultTitle: "New scene",
    what: "scene cards",
    untitled: "Untitled scene",
    select: "Select or create a scene card.",
    autosave: "Autosaves as you type.",
    deleteConfirm: "Delete this scene?",
    titleLabel: "Title",
    beat: "Beat",
    order: "Order",
    chapter: "Chapter",
    pov: "POV",
    location: "Location",
    summary: "Summary",
    goal: "Goal",
    conflict: "Conflict",
    outcome: "Outcome",
    storyTime: "Story time",
    sortKey: "Sort key",
    duration: "Duration",
    unassigned: "unassigned",
    none: "none",
    castThreads: "Cast and Threads",
    characters: "Characters",
    plotThreads: "Plot threads",
    sensoryPalette: "Sensory Palette",
    senses: { sight: "sight", sound: "sound", smell: "smell", taste: "taste", touch: "touch" },
    revelations: "Revelations",
    newRevelation: "New revelation",
    add: "Add",
    readerKnows: "reader knows",
    hidden: "hidden",
    noRevelations: "No revelations on this scene.",
    chapterShort: "Ch",
    deleteRevelationAria: "Delete revelation",
  },
  ar: {
    title: "بطاقات المشاهد",
    scene: "مشهد",
    newScene: "مشهد جديد",
    defaultTitle: "مشهد جديد",
    what: "بطاقات المشاهد",
    untitled: "مشهد بلا عنوان",
    select: "اختر بطاقة مشهد أو أنشئ واحدة.",
    autosave: "يُحفظ تلقائيًا أثناء الكتابة.",
    deleteConfirm: "هل تريد حذف هذا المشهد؟",
    titleLabel: "العنوان",
    beat: "النبضة",
    order: "الترتيب",
    chapter: "الفصل",
    pov: "وجهة النظر",
    location: "المكان",
    summary: "الملخص",
    goal: "الهدف",
    conflict: "الصراع",
    outcome: "النتيجة",
    storyTime: "زمن القصة",
    sortKey: "مفتاح الترتيب",
    duration: "المدة",
    unassigned: "غير مُسنَد",
    none: "لا شيء",
    castThreads: "الشخصيات والخيوط",
    characters: "الشخصيات",
    plotThreads: "خيوط الحبكة",
    sensoryPalette: "لوحة الحواس",
    senses: { sight: "البصر", sound: "السمع", smell: "الشم", taste: "التذوّق", touch: "اللمس" },
    revelations: "الكشوفات",
    newRevelation: "كشف جديد",
    add: "إضافة",
    readerKnows: "القارئ يعرف",
    hidden: "مخفي",
    noRevelations: "لا توجد كشوفات في هذا المشهد.",
    chapterShort: "ف",
    deleteRevelationAria: "حذف الكشف",
  },
} as const;

function toggleId(list: string[] = [], id: string) {
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}

export default function ScenesPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { t, locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const senseLabel = (sense: string) => (c.senses as Record<string, string>)[sense] ?? sense;
  const { data: scenes, isError: scenesError, error: scenesErr, refetch: refetchScenes } = useQuery({ queryKey: ["scenes", storyId], queryFn: () => api.listScenes(storyId) });
  const { data: chapters } = useQuery({ queryKey: ["chapters", storyId], queryFn: () => api.listChapters(storyId) });
  const { data: characters } = useQuery({ queryKey: ["characters", storyId], queryFn: () => api.listCharacters(storyId) });
  const { data: locations } = useQuery({ queryKey: ["locations", storyId], queryFn: () => api.listLocations(storyId) });
  const { data: threads } = useQuery({ queryKey: ["threads", storyId], queryFn: () => api.listThreads(storyId) });
  const { data: revelations } = useQuery({ queryKey: ["revelations", storyId], queryFn: () => api.listRevelations(storyId) });

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { if (!activeId && scenes && scenes.length > 0) setActiveId(scenes[0].id); }, [activeId, scenes]);
  const active = useMemo(() => scenes?.find((s: any) => s.id === activeId) || null, [scenes, activeId]);
  const [draft, setDraft] = useState<any>(null);
  useEffect(() => { setDraft(active ? { ...active, sensory_palette: active.sensory_palette || {} } : null); }, [active]);

  const create = useMutation({
    mutationFn: () => api.createScene(storyId, { title: c.defaultTitle, beat: "", content: "", ordinal: (scenes?.length || 0) + 1 }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["scenes", storyId] });
      qc.invalidateQueries({ queryKey: ["timeline", storyId] });
      qc.invalidateQueries({ queryKey: ["weave", storyId] });
      setActiveId(s.id);
    },
  });
  const patch = useMutation({
    mutationFn: (p: any) => api.patchScene(storyId, activeId!, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenes", storyId] });
      qc.invalidateQueries({ queryKey: ["timeline", storyId] });
      qc.invalidateQueries({ queryKey: ["weave", storyId] });
    },
  });
  const del = useMutation({
    mutationFn: () => api.deleteScene(storyId, activeId!),
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["scenes", storyId] });
      qc.invalidateQueries({ queryKey: ["timeline", storyId] });
      qc.invalidateQueries({ queryKey: ["weave", storyId] });
    },
  });

  useDebouncedSave(draft, 800, (d) => {
    if (!d || !activeId) return;
    const { id, story_id, ...patchable } = d;
    patch.mutate(patchable);
  });

  const [revText, setRevText] = useState("");
  const addRev = useMutation({
    mutationFn: () => api.createRevelation(storyId, { scene_id: activeId, description: revText, kind: "revelation", reader_knows: true }),
    onSuccess: () => {
      setRevText("");
      qc.invalidateQueries({ queryKey: ["revelations", storyId] });
    },
  });
  const delRev = useMutation({
    mutationFn: (id: string) => api.deleteRevelation(storyId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revelations", storyId] }),
  });

  const sceneRevelations = (revelations || []).filter((r: any) => r.scene_id === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6 max-w-7xl">
      <aside>
        <PageHdr title={c.title} />
        <Btn variant="primary" className="w-full mb-3" onClick={() => create.mutate()}><Plus size={14}/> {c.newScene}</Btn>
        {scenesError && <div className="mb-3"><QueryError error={scenesErr} retry={refetchScenes} what={c.what} /></div>}
        <ul className="space-y-1">
          {(scenes || []).map((s: any) => (
            <li key={s.id}>
              <button
                onClick={() => setActiveId(s.id)}
                className={`w-full text-start px-3 py-2 rounded text-sm ${activeId === s.id ? "bg-ink-gold/10 text-ink-goldLight border border-ink-gold/30" : "text-ink-text2 hover:text-ink-text hover:bg-ink-surface2"}`}
              >
                <span className="text-ink-text3 me-1">{formatNumber(s.ordinal || 0)}.</span>
                {s.title || s.beat || s.summary || c.untitled}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section>
        {!draft && <p className="text-ink-text2">{c.select}</p>}
        {draft && (
          <>
            <PageHdr
              title={draft.title || draft.beat || c.scene}
              subtitle={c.autosave}
              right={<Btn variant="ghost" onClick={() => { if (confirm(c.deleteConfirm)) del.mutate(); }}><Trash2 size={14}/> {t("common.delete")}</Btn>}
            />

            <Card className="mb-4">
              <div className="grid gap-3 md:grid-cols-3">
                <FG label={c.titleLabel}><Inp value={draft.title || ""} onChange={e => setDraft({ ...draft, title: e.target.value })} /></FG>
                <FG label={c.beat}><Inp value={draft.beat || ""} onChange={e => setDraft({ ...draft, beat: e.target.value })} /></FG>
                <FG label={c.order}><Inp type="number" value={draft.ordinal || 0} onChange={e => setDraft({ ...draft, ordinal: Number(e.target.value) })} /></FG>
                <FG label={c.chapter}>
                  <Sel value={draft.chapter_id || ""} onChange={e => setDraft({ ...draft, chapter_id: e.target.value || null })}>
                    <option value="">{c.unassigned}</option>
                    {(chapters || []).map((chapter: any) => <option key={chapter.id} value={chapter.id}>{c.chapterShort}{formatNumber(chapter.number)}. {chapter.title}</option>)}
                  </Sel>
                </FG>
                <FG label={c.pov}>
                  <Sel value={draft.pov_character_id || ""} onChange={e => setDraft({ ...draft, pov_character_id: e.target.value || null })}>
                    <option value="">{c.none}</option>
                    {(characters || []).map((character: any) => <option key={character.id} value={character.id}>{character.name}</option>)}
                  </Sel>
                </FG>
                <FG label={c.location}>
                  <Sel value={draft.location_id || ""} onChange={e => setDraft({ ...draft, location_id: e.target.value || null })}>
                    <option value="">{c.none}</option>
                    {(locations || []).map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </Sel>
                </FG>
              </div>
              <FG label={c.summary}><Ta rows={3} value={draft.summary || ""} onChange={e => setDraft({ ...draft, summary: e.target.value })} /></FG>
              <div className="grid gap-3 md:grid-cols-3">
                <FG label={c.goal}><Ta rows={3} value={draft.goal || ""} onChange={e => setDraft({ ...draft, goal: e.target.value })} /></FG>
                <FG label={c.conflict}><Ta rows={3} value={draft.conflict || ""} onChange={e => setDraft({ ...draft, conflict: e.target.value })} /></FG>
                <FG label={c.outcome}><Ta rows={3} value={draft.outcome || ""} onChange={e => setDraft({ ...draft, outcome: e.target.value })} /></FG>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <FG label={c.storyTime}><Inp value={draft.time_anchor || ""} onChange={e => setDraft({ ...draft, time_anchor: e.target.value })} /></FG>
                <FG label={c.sortKey}><Inp type="number" value={draft.time_sort_key ?? ""} onChange={e => setDraft({ ...draft, time_sort_key: e.target.value === "" ? null : Number(e.target.value) })} /></FG>
                <FG label={c.duration}><Inp value={draft.duration_hint || ""} onChange={e => setDraft({ ...draft, duration_hint: e.target.value })} /></FG>
              </div>
            </Card>

            <Card className="mb-4">
              <h3 className="font-display text-lg mb-3">{c.castThreads}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="label">{c.characters}</p>
                  <div className="flex flex-wrap gap-2">
                    {(characters || []).map((character: any) => (
                      <button key={character.id} onClick={() => setDraft({ ...draft, character_ids: toggleId(draft.character_ids || [], character.id) })}>
                        <Tag color={(draft.character_ids || []).includes(character.id) ? "gold" : "muted"}>{character.name}</Tag>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="label">{c.plotThreads}</p>
                  <div className="flex flex-wrap gap-2">
                    {(threads || []).map((thread: any) => (
                      <button key={thread.id} onClick={() => setDraft({ ...draft, plot_thread_ids: toggleId(draft.plot_thread_ids || [], thread.id) })}>
                        <Tag color={(draft.plot_thread_ids || []).includes(thread.id) ? "green" : "muted"}>{thread.name}</Tag>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="mb-4">
              <h3 className="font-display text-lg mb-3">{c.sensoryPalette}</h3>
              <div className="grid gap-3 md:grid-cols-5">
                {SENSES.map(sense => (
                  <FG key={sense} label={senseLabel(sense)}>
                    <Inp
                      type="number"
                      min={0}
                      max={100}
                      value={draft.sensory_palette?.[sense] ?? 0}
                      onChange={e => setDraft({ ...draft, sensory_palette: { ...(draft.sensory_palette || {}), [sense]: Number(e.target.value) } })}
                    />
                  </FG>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="font-display text-lg mb-3">{c.revelations}</h3>
              <div className="grid gap-2 md:grid-cols-[1fr_auto] items-end mb-3">
                <FG label={c.newRevelation}><Inp value={revText} onChange={e => setRevText(e.target.value)} /></FG>
                <Btn variant="primary" className="mb-3" disabled={!revText.trim() || addRev.isPending} onClick={() => addRev.mutate()}><Plus size={14}/> {c.add}</Btn>
              </div>
              <ul className="space-y-1">
                {sceneRevelations.map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-ink-surface2">
                    <span>{r.description} <Tag color={r.reader_knows ? "gold" : "muted"}>{r.reader_knows ? c.readerKnows : c.hidden}</Tag></span>
                    <button aria-label={c.deleteRevelationAria} onClick={() => delRev.mutate(r.id)} className="text-ink-text3 hover:text-ink-red"><X size={14}/></button>
                  </li>
                ))}
                {sceneRevelations.length === 0 && <li className="text-sm text-ink-text3">{c.noRevelations}</li>}
              </ul>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}

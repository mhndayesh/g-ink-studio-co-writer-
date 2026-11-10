"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, QueryError, Ta } from "@/components/ui/Primitives";
import { useDebouncedSave } from "@/lib/debounce";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    title: "Research Notes",
    subtitle: "Scratchpad for research, continuity facts, and anything the story bible shouldn't hold.",
    newNote: "New note",
    untitled: "Untitled note",
    titleLabel: "Title",
    bodyLabel: "Note",
    select: "Select a note or create one.",
    deleteConfirm: "Delete this note?",
    saving: "Saving…",
    saved: "Saved",
    saveFailed: "Save failed — retrying on next edit",
    empty: "No notes yet.",
  },
  ar: {
    title: "ملاحظات البحث",
    subtitle: "مساحة للبحث وحقائق الاستمرارية وكل ما لا ينتمي إلى دليل العالم.",
    newNote: "ملاحظة جديدة",
    untitled: "ملاحظة بلا عنوان",
    titleLabel: "العنوان",
    bodyLabel: "الملاحظة",
    select: "اختر ملاحظة أو أنشئ واحدة.",
    deleteConfirm: "هل تريد حذف هذه الملاحظة؟",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    saveFailed: "فشل الحفظ — ستتم إعادة المحاولة عند التعديل التالي",
    empty: "لا ملاحظات بعد.",
  },
} as const;

export default function NotesPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;

  const { data: notes, isError, error, refetch } = useQuery({
    queryKey: ["notes", storyId],
    queryFn: () => api.listNotes(storyId),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    const fromUrl = searchParams.get("note");
    if (fromUrl) setActiveId(fromUrl);
  }, [searchParams]);
  useEffect(() => {
    if (!activeId && notes && notes.length > 0) setActiveId(notes[0].id);
  }, [notes, activeId]);

  const active = useMemo(() => notes?.find((n: any) => n.id === activeId) || null, [notes, activeId]);
  const [draft, setDraft] = useState<any>(null);
  useEffect(() => {
    if (active && active.id === activeId) setDraft({ title: active.title || "", body: active.body || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.id]);

  const create = useMutation({
    mutationFn: () => api.createNote(storyId, { title: c.untitled, body: "" }),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["notes", storyId] });
      selectNote(n.id);
    },
  });
  const patch = useMutation({
    mutationFn: (payload: any) => api.patchNote(storyId, activeId!, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", storyId] }),
  });
  const del = useMutation({
    mutationFn: () => api.deleteNote(storyId, activeId!),
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["notes", storyId] });
    },
  });

  const { status: saveStatus, flush } = useDebouncedSave(draft, 900, (d) => {
    if (!d || !activeId) return;
    patch.mutate({ title: d.title || "", body: d.body || "" });
  }, activeId ?? "none");

  function selectNote(id: string) {
    flush();
    setActiveId(id);
    router.replace(`/studio/${storyId}/notes?note=${id}`, { scroll: false });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-6 max-w-6xl">
      <aside>
        <PageHdr title={c.title} />
        <Btn variant="primary" className="w-full mb-3" disabled={create.isPending} onClick={() => create.mutate()}>
          <Plus size={14}/> {c.newNote}
        </Btn>
        {isError && <div className="mb-3"><QueryError error={error} retry={refetch} what={c.title} /></div>}
        <ul className="space-y-1">
          {(notes || []).map((n: any) => (
            <li key={n.id}>
              <button
                onClick={() => selectNote(n.id)}
                className={`w-full text-start px-3 py-2 rounded text-sm ${activeId === n.id ? "bg-ink-gold/10 text-ink-goldLight border border-ink-gold/30" : "text-ink-text2 hover:text-ink-text hover:bg-ink-surface2"}`}
              >
                {n.title || c.untitled}
              </button>
            </li>
          ))}
          {(notes || []).length === 0 && <li className="text-sm text-ink-text3 px-3 py-2">{c.empty}</li>}
        </ul>
      </aside>

      <section>
        <p className="text-sm text-ink-text2 mb-3">{c.subtitle}</p>
        {!active && <p className="text-ink-text2">{c.select}</p>}
        {active && draft && (
          <Card>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs text-ink-text3">
                {saveStatus === "saving" ? c.saving : saveStatus === "error" ? c.saveFailed : saveStatus === "saved" ? c.saved : ""}
              </p>
              <Btn variant="ghost" onClick={() => { if (confirm(c.deleteConfirm)) del.mutate(); }}>
                <Trash2 size={14}/> {locale === "ar" ? "حذف" : "Delete"}
              </Btn>
            </div>
            <FG label={c.titleLabel}><Inp value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></FG>
            <FG label={c.bodyLabel}><Ta rows={18} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} className="leading-relaxed" /></FG>
          </Card>
        )}
      </section>
    </div>
  );
}

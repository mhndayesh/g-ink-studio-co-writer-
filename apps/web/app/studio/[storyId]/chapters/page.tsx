"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, History, Plus, Sparkles, StopCircle, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, QueryError, Ta, Tag } from "@/components/ui/Primitives";
import { CoverUploader } from "@/components/ui/CoverUploader";
import { useDebouncedSave } from "@/lib/debounce";
import { AiLockNotice } from "@/components/billing/AiLockNotice";
import { useEntitlement } from "@/lib/useEntitlement";
import { useI18n } from "@/lib/i18n";

const COUNT_WORDS = (text: string) => (text.match(/[\p{L}\p{N}'’-]+/gu) || []).length;

const COPY = {
  en: {
    title: "❧ Chapters",
    newChapter: "New chapter",
    defaultTitle: "New chapter",
    yourChapters: "your chapters",
    selectChapter: "Select a chapter on the left, or create one.",
    chapterTitle: "Chapter {n}",
    autosave: "Autosaves as you type.",
    deleteConfirm: "Delete this chapter?",
    pov: "POV",
    location: "Location",
    summary: "Summary",
    noneOption: "— none —",
    chapterCover: "Chapter cover (optional)",
    manuscript: "Manuscript",
    sceneStrip: "Scene Strip",
    untitledScene: "Untitled scene",
    povTag: "POV: {name}",
    goal: "Goal",
    conflict: "Conflict",
    outcome: "Outcome",
    writingCompanion: "Writing Companion",
    companionHint: "Describe a scene — the AI drafts it using the full story context (Graph-RAG).",
    instructionPlaceholder:
      "e.g. The reunion in the throne room, Mira confronts Aiden about the broken pact.",
    stop: "Stop",
    draftScene: "Draft scene",
    draft: "Draft",
    streaming: "Streaming…",
    discard: "Discard",
    insertIntoChapter: "Insert into chapter",
    draftFailedFallback: "The draft failed to generate.",
    draftErrorSuffix: "— please try again.",
    emptyResult:
      "The model returned nothing. Try rephrasing your instruction, or check your AI model in Settings.",
    saving: "Saving…",
    saved: "Saved",
    saveFailed: "Save failed — retrying on next edit",
    words: "words",
    moveUp: "Move up",
    moveDown: "Move down",
    revisions: "History",
    revisionsTitle: "Chapter history",
    noRevisions: "No saved revisions yet. Edits are snapshotted automatically.",
    restore: "Restore",
    restoreConfirm: "Restore this revision? The current text is saved to history first.",
    close: "Close",
  },
  ar: {
    title: "❧ الفصول",
    newChapter: "فصل جديد",
    defaultTitle: "فصل جديد",
    yourChapters: "فصولك",
    selectChapter: "اختر فصلًا من القائمة، أو أنشئ فصلًا جديدًا.",
    chapterTitle: "الفصل {n}",
    autosave: "يُحفظ تلقائيًا أثناء الكتابة.",
    deleteConfirm: "هل تريد حذف هذا الفصل؟",
    pov: "وجهة النظر",
    location: "المكان",
    summary: "الملخص",
    noneOption: "— لا شيء —",
    chapterCover: "غلاف الفصل (اختياري)",
    manuscript: "المخطوطة",
    sceneStrip: "شريط المشاهد",
    untitledScene: "مشهد بلا عنوان",
    povTag: "وجهة النظر: {name}",
    goal: "الهدف",
    conflict: "الصراع",
    outcome: "النتيجة",
    writingCompanion: "رفيق الكتابة",
    companionHint: "صِف مشهدًا، وسيكتبه الذكاء الاصطناعي مستعينًا بسياق القصة الكامل (Graph-RAG).",
    instructionPlaceholder: "مثال: اللقاء في قاعة العرش، حيث تواجه ميرا أيدن بشأن الميثاق المكسور.",
    stop: "إيقاف",
    draftScene: "صياغة مشهد",
    draft: "المسودة",
    streaming: "جارٍ التوليد…",
    discard: "تجاهل",
    insertIntoChapter: "إدراج في الفصل",
    draftFailedFallback: "تعذّر توليد المسودة.",
    draftErrorSuffix: "— حاول مرة أخرى.",
    emptyResult: "لم يُرجع النموذج أي نص. أعد صياغة تعليماتك، أو تحقّق من نموذج الذكاء الاصطناعي في الإعدادات.",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    saveFailed: "فشل الحفظ — ستتم إعادة المحاولة عند التعديل التالي",
    words: "كلمة",
    moveUp: "نقل لأعلى",
    moveDown: "نقل لأسفل",
    revisions: "السجل",
    revisionsTitle: "سجل الفصل",
    noRevisions: "لا توجد نسخ محفوظة بعد. تُحفظ التعديلات تلقائيًا.",
    restore: "استعادة",
    restoreConfirm: "هل تريد استعادة هذه النسخة؟ سيُحفظ النص الحالي في السجل أولًا.",
    close: "إغلاق",
  },
} as const;

export default function ChaptersPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { aiAvailable } = useEntitlement();
  const { t, locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;

  const { data: chapters, isError: chaptersError, error: chaptersErr, refetch: refetchChapters } = useQuery({ queryKey: ["chapters", storyId], queryFn: () => api.listChapters(storyId) });
  const { data: characters } = useQuery({ queryKey: ["characters", storyId], queryFn: () => api.listCharacters(storyId) });
  const { data: locations } = useQuery({ queryKey: ["locations", storyId], queryFn: () => api.listLocations(storyId) });
  const { data: scenes } = useQuery({ queryKey: ["scenes", storyId], queryFn: () => api.listScenes(storyId) });
  const { data: threads } = useQuery({ queryKey: ["threads", storyId], queryFn: () => api.listThreads(storyId) });

  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Deep-linkable selection: /chapters?chapter=<id> (used by the Plot Board).
  useEffect(() => {
    const fromUrl = searchParams.get("chapter");
    if (fromUrl) setActiveId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!activeId && chapters && chapters.length > 0) setActiveId(chapters[0].id);
    // If a deep-linked chapter no longer exists, fall back to the first one.
    if (activeId && chapters && chapters.length > 0 && !chapters.some((c: any) => c.id === activeId)) {
      setActiveId(chapters[0].id);
    }
  }, [chapters, activeId]);

  const active = useMemo(() => chapters?.find((c: any) => c.id === activeId) || null, [chapters, activeId]);
  const activeScenes = useMemo(
    () => (scenes || []).filter((s: any) => s.chapter_id === activeId).sort((a: any, b: any) => (a.ordinal || 0) - (b.ordinal || 0)),
    [scenes, activeId],
  );
  const threadById = useMemo(() => Object.fromEntries((threads || []).map((t: any) => [t.id, t])), [threads]);
  const charById = useMemo(() => Object.fromEntries((characters || []).map((c: any) => [c.id, c])), [characters]);
  const locById = useMemo(() => Object.fromEntries((locations || []).map((l: any) => [l.id, l])), [locations]);

  const create = useMutation({
    mutationFn: () => api.createChapter(storyId, { title: c.defaultTitle, content: "" }),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ["chapters", storyId] }); selectChapter(c.id); },
  });

  const patch = useMutation({
    mutationFn: (p: any) => api.patchChapter(storyId, activeId!, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chapters", storyId] }),
  });

  const del = useMutation({
    mutationFn: () => api.deleteChapter(storyId, activeId!),
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["chapters", storyId] });
      qc.invalidateQueries({ queryKey: ["graph", storyId] });
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const ordered = [...(chapters || [])].sort((a: any, b: any) => a.number - b.number).map((x: any) => x.id);
      const i = ordered.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ordered.length) return null;
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      return api.reorderChapters(storyId, ordered);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chapters", storyId] });
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
  });

  const revisions = useQuery({
    queryKey: ["chapter-revisions", storyId, activeId],
    queryFn: () => api.listChapterRevisions(storyId, activeId!),
    enabled: !!activeId && showHistory,
  });

  const restore = useMutation({
    mutationFn: (revisionId: string) => api.restoreChapterRevision(storyId, activeId!, revisionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chapters", storyId] });
      qc.invalidateQueries({ queryKey: ["chapter-revisions", storyId, activeId] });
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
  });

  // Local editable form. Hydrate ONLY when the active record changes — never on
  // a background refetch, which used to clobber keystrokes typed mid-save.
  const [draft, setDraft] = useState<any>(null);
  useEffect(() => {
    if (active && active.id === activeId) setDraft({ ...active });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.id]);

  const { status: saveStatus, flush } = useDebouncedSave(draft, 900, (d) => {
    if (!d || !activeId) return;
    const { id, story_id, created_at, updated_at, word_count, ...patchable } = d;
    patch.mutate(patchable);
  }, activeId ?? "none");

  function selectChapter(id: string) {
    flush(); // persist the previous chapter's last keystrokes immediately
    setActiveId(id);
    setShowHistory(false);
    router.replace(`/studio/${storyId}/chapters?chapter=${id}`, { scroll: false });
  }

  // ── Writing Companion (streaming) ───────────────────────────────────────────
  const [instruction, setInstruction] = useState("");
  // Live tokens accumulate here; shown immediately as they stream in.
  const [streamText, setStreamText] = useState("");
  // AbortController so the user can stop a long stream.
  const abortRef = useRef<AbortController | null>(null);

  // Not tagged ["llm", …] so BusyOverlay doesn't block the page — the user can
  // read the tokens as they arrive. Gate errors (402/429/byok) still reach the
  // global MutationCache.onError → UpgradeModal via api.ApiError instanceof check.
  const companion = useMutation({
    mutationKey: ["companion-stream", storyId],
    mutationFn: async (text: string) => {
      setStreamText("");
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let accumulated = "";
      try {
        await api.writingCompanionStream(storyId, text, (delta) => {
          accumulated += delta;
          setStreamText(accumulated);
        }, activeId || undefined, ctrl.signal);
      } finally {
        abortRef.current = null;
      }
      return accumulated;
    },
  });

  function stopStream() {
    abortRef.current?.abort();
    // Mark mutation as settled so the card reflects the partial result.
    companion.reset();
  }

  function insertDraftAtEnd(text: string) {
    if (!draft) return;
    setDraft({ ...draft, content: (draft.content ? draft.content + "\n\n" : "") + text });
  }

  function resetCompanion() {
    stopStream();
    setStreamText("");
    companion.reset();
    setInstruction("");
  }

  // Switching chapters must discard any in-flight / streamed companion draft and
  // its instruction — otherwise you could Insert the PREVIOUS chapter's generated
  // text into the chapter you just opened.
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamText("");
    setInstruction("");
    companion.reset();
    // Also abort on UNMOUNT (cleanup return) — navigating away from the Chapters
    // page otherwise leaves the SSE stream running (wasted tokens + setState after
    // unmount). The effect body handles the activeId-switch case.
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Text to show: prefer live streamText (non-empty); fall back to final mutation
  // result in case the component re-renders after streaming finishes.
  const displayText = streamText || (typeof companion.data === "string" ? companion.data : "");
  const isStreaming = companion.isPending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-6 max-w-7xl">
      <aside>
        <PageHdr title={c.title} />
        <Btn variant="primary" className="w-full mb-3" disabled={create.isPending} onClick={() => create.mutate()}><Plus size={14}/> {c.newChapter}</Btn>
        {chaptersError && <div className="mb-3"><QueryError error={chaptersErr} retry={refetchChapters} what={c.yourChapters} /></div>}
        <ul className="space-y-1">
          {(chapters || []).map((chapter: any, idx: number, arr: any[]) => (
            <li key={chapter.id} className="group flex items-center gap-1">
              <button
                onClick={() => selectChapter(chapter.id)}
                className={`flex-1 text-start px-3 py-2 rounded text-sm ${activeId === chapter.id ? "bg-ink-gold/10 text-ink-goldLight border border-ink-gold/30" : "text-ink-text2 hover:text-ink-text hover:bg-ink-surface2"}`}
              >
                <span className="text-ink-text3 me-1">{formatNumber(chapter.number)}.</span> {chapter.title || t("common.untitled")}
              </button>
              <span className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  aria-label={c.moveUp}
                  disabled={idx === 0 || move.isPending}
                  onClick={() => move.mutate({ id: chapter.id, dir: -1 })}
                  className="text-ink-text3 hover:text-ink-text disabled:opacity-30"
                ><ArrowUp size={12}/></button>
                <button
                  aria-label={c.moveDown}
                  disabled={idx === arr.length - 1 || move.isPending}
                  onClick={() => move.mutate({ id: chapter.id, dir: 1 })}
                  className="text-ink-text3 hover:text-ink-text disabled:opacity-30"
                ><ArrowDown size={12}/></button>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <section>
        {!active && <p className="text-ink-text2">{c.selectChapter}</p>}
        {active && draft && (
          <>
            <PageHdr
              title={c.chapterTitle.replace("{n}", formatNumber(draft.number))}
              subtitle={
                saveStatus === "saving" ? c.saving
                  : saveStatus === "error" ? c.saveFailed
                    : saveStatus === "saved" ? c.saved
                      : c.autosave
              }
              right={
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" onClick={() => setShowHistory(v => !v)}>
                    <History size={14}/> {c.revisions}
                  </Btn>
                  <Btn variant="ghost" onClick={() => { if (confirm(c.deleteConfirm)) del.mutate(); }}>
                    <Trash2 size={14}/> {t("common.delete")}
                  </Btn>
                </div>
              }
            />

            {showHistory && (
              <Card className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg">{c.revisionsTitle}</h3>
                  <Btn variant="ghost" onClick={() => setShowHistory(false)}>{c.close}</Btn>
                </div>
                {revisions.isLoading && <p className="text-sm text-ink-text2">{t("common.loading")}</p>}
                {revisions.isError && <QueryError error={revisions.error} retry={revisions.refetch} what={c.revisionsTitle} />}
                {!revisions.isLoading && (revisions.data || []).length === 0 && (
                  <p className="text-sm text-ink-text3">{c.noRevisions}</p>
                )}
                <ul className="space-y-1">
                  {(revisions.data || []).map((rev: any) => (
                    <li key={rev.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-ink-surface2">
                      <span className="truncate">
                        <span className="text-ink-text3 me-2">{new Date(rev.created_at).toLocaleString()}</span>
                        {rev.title || t("common.untitled")}
                        <span className="text-ink-text3 ms-2">{formatNumber(rev.word_count)} {c.words}</span>
                      </span>
                      <Btn
                        variant="ghost"
                        disabled={restore.isPending}
                        onClick={() => {
                          if (confirm(c.restoreConfirm)) restore.mutate(rev.id);
                        }}
                      >{c.restore}</Btn>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="mb-4">
              <div className="grid gap-3 md:grid-cols-2">
                <FG label={t("studio.title")}><Inp value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></FG>
                <FG label={c.pov}>
                  <select className="input" value={draft.pov_character_id || ""} onChange={e => setDraft({ ...draft, pov_character_id: e.target.value || null })}>
                    <option value="">{c.noneOption}</option>
                    {(characters || []).map((character: any) => <option key={character.id} value={character.id}>{character.name}</option>)}
                  </select>
                </FG>
                <FG label={c.location}>
                  <select className="input" value={draft.location_id || ""} onChange={e => setDraft({ ...draft, location_id: e.target.value || null })}>
                    <option value="">{c.noneOption}</option>
                    {(locations || []).map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </FG>
                <FG label={c.summary}><Inp value={draft.summary || ""} onChange={e => setDraft({ ...draft, summary: e.target.value })} /></FG>
              </div>
              <div className="mt-3 border-t border-ink-border pt-3">
                <CoverUploader
                  value={draft.cover_image_url}
                  onChange={(url) => setDraft({ ...draft, cover_image_url: url })}
                  label={c.chapterCover}
                  aspect="16 / 9"
                  width={120}
                />
              </div>
            </Card>

            <Card className="mb-4">
              <FG label={c.manuscript}>
                <Ta rows={20} value={draft.content || ""} onChange={e => setDraft({ ...draft, content: e.target.value })} className="leading-relaxed text-base" />
              </FG>
              <p className="text-xs text-ink-text3 mt-2">
                {formatNumber(COUNT_WORDS(draft.content || ""))} {c.words}
              </p>
            </Card>

            {activeScenes.length > 0 && (
              <Card className="mb-4">
                <h3 className="font-display text-lg mb-3">{c.sceneStrip}</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {activeScenes.map((s: any) => (
                    <div key={s.id} className="rounded border border-ink-border bg-ink-surface2/60 p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Tag color="muted">{formatNumber(s.ordinal || 0)}</Tag>
                        <strong>{s.title || s.beat || c.untitledScene}</strong>
                      </div>
                      {s.summary && <p className="text-sm text-ink-text2 mb-2">{s.summary}</p>}
                      <div className="flex flex-wrap gap-1">
                        {s.pov_character_id && charById[s.pov_character_id] && <Tag color="gold">{c.povTag.replace("{name}", charById[s.pov_character_id].name)}</Tag>}
                        {s.location_id && locById[s.location_id] && <Tag color="rose">{locById[s.location_id].name}</Tag>}
                        {(s.plot_thread_ids || []).map((tid: string) => threadById[tid] && <Tag key={tid} color="green">{threadById[tid].name}</Tag>)}
                      </div>
                      {(s.goal || s.conflict || s.outcome) && (
                        <p className="text-xs text-ink-text3 mt-2">
                          {[s.goal && `${c.goal}: ${s.goal}`, s.conflict && `${c.conflict}: ${s.conflict}`, s.outcome && `${c.outcome}: ${s.outcome}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h3 className="font-display text-lg mb-2">{c.writingCompanion}</h3>
              <p className="text-sm text-ink-text2 mb-3">{c.companionHint}</p>
              <AiLockNotice />
              <Ta
                rows={3}
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder={c.instructionPlaceholder}
                disabled={isStreaming}
              />
              <div className="flex justify-end mt-2 gap-2">
                {isStreaming ? (
                  <Btn variant="ghost" onClick={stopStream}>
                    <StopCircle size={14}/> {c.stop}
                  </Btn>
                ) : (
                  <Btn
                    variant="primary"
                    disabled={!instruction.trim() || !aiAvailable}
                    onClick={() => companion.mutate(instruction)}
                  >
                    <Sparkles size={14}/> {c.draftScene}
                  </Btn>
                )}
              </div>

              {/* Streaming output — appears as soon as the first token arrives */}
              {displayText && (
                <div className="mt-4 border-t border-ink-border pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs uppercase tracking-wider text-ink-text2">{c.draft}</p>
                    {isStreaming && (
                      <span className="text-xs text-ink-text3 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-3.5 bg-ink-gold/70 rounded-sm animate-pulse" />
                        {c.streaming}
                      </span>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-sm text-ink-text">{displayText}</pre>
                  {!isStreaming && (
                    <div className="flex justify-end gap-2 mt-3">
                      <Btn variant="ghost" onClick={resetCompanion}>{c.discard}</Btn>
                      <Btn variant="primary" onClick={() => { insertDraftAtEnd(displayText); resetCompanion(); }}>
                        {c.insertIntoChapter}
                      </Btn>
                    </div>
                  )}
                </div>
              )}

              {/* Surface a stream failure / empty result — a transient error
                  otherwise looks identical to "I never clicked Draft". */}
              {!isStreaming && companion.isError && (
                <p className="mt-3 text-sm text-ink-red">
                  {companion.error instanceof Error ? companion.error.message : c.draftFailedFallback} {c.draftErrorSuffix}
                </p>
              )}
              {!isStreaming && companion.isSuccess && !displayText && (
                <p className="mt-3 text-sm text-ink-text3">
                  {c.emptyResult}
                </p>
              )}
            </Card>
          </>
        )}
      </section>
    </div>
  );
}

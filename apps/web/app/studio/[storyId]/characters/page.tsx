"use client";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Drama, ArrowRight } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, QueryError, Sel, Tag } from "@/components/ui/Primitives";
import { useDebouncedSave } from "@/lib/debounce";
import { useI18n } from "@/lib/i18n";

// The Characters tab is now a lightweight ROSTER: name, role, status, age, icon.
// All depth — personality, behavior, voice fingerprint, relationship masks,
// current state — lives in the Character Voice Studio (one source of truth).
const ROLES = ["protagonist", "antagonist", "ally", "mentor", "rival", "love interest", "supporting"];
const STATUSES = ["alive", "dead", "unknown", "missing", "transformed"];

const COPY = {
  en: {
    title: "◈ Characters",
    newCharacter: "New character",
    defaultName: "New character",
    yourCharacters: "your characters",
    selectCharacter: "Select a character on the left.",
    autosave: "Basic roster info. Autosaves as you type.",
    deleteConfirm: "Delete this character?",
    saving: "Saving…",
    saved: "Saved",
    saveFailed: "Save failed — retrying on next edit",
    name: "Name",
    role: "Role",
    status: "Status",
    age: "Age",
    icon: "Icon",
    rolePlaceholder: "— role —",
    iconPlaceholder: "emoji or short text",
    roles: {
      protagonist: "protagonist",
      antagonist: "antagonist",
      ally: "ally",
      mentor: "mentor",
      rival: "rival",
      "love interest": "love interest",
      supporting: "supporting",
    },
    statuses: {
      alive: "alive",
      dead: "dead",
      unknown: "unknown",
      missing: "missing",
      transformed: "transformed",
    },
    fullIdentity: "Full identity & voice",
    identityHint:
      "Personality, behavior, voice fingerprint, relationship masks and current state now live in the Voice Studio.",
    editInVoiceStudio: "Edit in Voice Studio",
    compiledSummary: "Compiled summary (read-only)",
    personality: "personality",
    motivation: "motivation",
    flaw: "flaw",
  },
  ar: {
    title: "◈ الشخصيات",
    newCharacter: "شخصية جديدة",
    defaultName: "شخصية جديدة",
    yourCharacters: "شخصياتك",
    selectCharacter: "اختر شخصية من القائمة.",
    autosave: "بيانات أساسية عن الشخصية. تُحفظ تلقائيًا أثناء الكتابة.",
    deleteConfirm: "هل تريد حذف هذه الشخصية؟",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    saveFailed: "فشل الحفظ — ستتم إعادة المحاولة عند التعديل التالي",
    name: "الاسم",
    role: "الدور",
    status: "الحالة",
    age: "العمر",
    icon: "الأيقونة",
    rolePlaceholder: "— الدور —",
    iconPlaceholder: "رمز تعبيري أو نص قصير",
    roles: {
      protagonist: "البطل",
      antagonist: "الخصم",
      ally: "الحليف",
      mentor: "المرشد",
      rival: "المنافس",
      "love interest": "الطرف الرومانسي",
      supporting: "مساند",
    },
    statuses: {
      alive: "على قيد الحياة",
      dead: "متوفّى",
      unknown: "غير معروف",
      missing: "مفقود",
      transformed: "متحوّل",
    },
    fullIdentity: "الهوية والصوت",
    identityHint: "السمات والسلوك وبصمة الصوت وأقنعة العلاقات والحالة الراهنة أصبحت الآن في استوديو الصوت.",
    editInVoiceStudio: "تحرير في استوديو الصوت",
    compiledSummary: "ملخّص مجمّع (للقراءة فقط)",
    personality: "السمات",
    motivation: "الدافع",
    flaw: "العيب",
  },
} as const;

export default function CharactersPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { t, locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const roleLabel = (role?: string) =>
    role ? (c.roles as Record<string, string>)[role] ?? role : "";
  const statusLabel = (status?: string) =>
    status ? (c.statuses as Record<string, string>)[status] ?? status : "";

  const { data: characters, isError, error, refetch } = useQuery({ queryKey: ["characters", storyId], queryFn: () => api.listCharacters(storyId) });
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    const fromUrl = searchParams.get("character");
    if (fromUrl) setActiveId(fromUrl);
  }, [searchParams]);
  useEffect(() => { if (!activeId && characters && characters.length > 0) setActiveId(characters[0].id); }, [characters, activeId]);

  const active = useMemo(() => characters?.find((c: any) => c.id === activeId) || null, [characters, activeId]);
  const [draft, setDraft] = useState<any>(null);
  useEffect(() => {
    if (active && active.id === activeId) setDraft({ ...active });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.id]);

  const create = useMutation({
    mutationFn: () => api.createCharacter(storyId, { name: c.defaultName }),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ["characters", storyId] }); setActiveId(c.id); },
  });
  const patch = useMutation({
    mutationFn: (p: any) => api.patchCharacter(storyId, activeId!, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters", storyId] }),
  });
  const del = useMutation({
    mutationFn: () => api.deleteCharacter(storyId, activeId!),
    onSuccess: () => { setActiveId(null); qc.invalidateQueries({ queryKey: ["characters", storyId] }); },
  });

  // Autosave only the roster basics (name/role/status/age/icon).
  const { status: saveStatus, flush } = useDebouncedSave(draft, 900, (d) => {
    if (!d || !activeId) return;
    patch.mutate({ name: d.name, role: d.role, status: d.status, age: d.age, icon: d.icon });
  }, activeId ?? "none");

  function selectCharacter(id: string) {
    flush();
    setActiveId(id);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-6 max-w-7xl">
      <aside>
        <PageHdr title={c.title} />
        <Btn variant="primary" className="w-full mb-3" onClick={() => create.mutate()}><Plus size={14}/> {c.newCharacter}</Btn>
        {isError && <div className="mb-3"><QueryError error={error} retry={refetch} what={c.yourCharacters} /></div>}
        <ul className="space-y-1">
          {(characters || []).map((character: any) => (
            <li key={character.id}>
              <button onClick={() => selectCharacter(character.id)} className={`w-full text-start px-3 py-2 rounded text-sm ${activeId === character.id ? "bg-ink-gold/10 text-ink-goldLight border border-ink-gold/30" : "text-ink-text2 hover:text-ink-text hover:bg-ink-surface2"}`}>
                {character.name} <span className="text-ink-text3 text-xs">{roleLabel(character.role)}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section>
        {!active && <p className="text-ink-text2">{c.selectCharacter}</p>}
        {active && draft && (
          <>
            <PageHdr
              title={draft.name}
              subtitle={
                saveStatus === "saving" ? c.saving
                  : saveStatus === "error" ? c.saveFailed
                    : saveStatus === "saved" ? c.saved
                      : c.autosave
              }
              right={<Btn variant="ghost" onClick={() => { if (confirm(c.deleteConfirm)) del.mutate(); }}><Trash2 size={14}/> {t("common.delete")}</Btn>}
            />

            <Card className="mb-4">
              <div className="grid gap-3 md:grid-cols-3">
                <FG label={c.name}><Inp value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></FG>
                <FG label={c.role}>
                  <Sel value={draft.role || ""} onChange={e => setDraft({ ...draft, role: e.target.value })}>
                    <option value="">{c.rolePlaceholder}</option>
                    {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </Sel>
                </FG>
                <FG label={c.status}>
                  <Sel value={draft.status || "alive"} onChange={e => setDraft({ ...draft, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </Sel>
                </FG>
                <FG label={c.age}><Inp value={draft.age || ""} onChange={e => setDraft({ ...draft, age: e.target.value })} /></FG>
                <FG label={c.icon}><Inp value={draft.icon || ""} onChange={e => setDraft({ ...draft, icon: e.target.value })} placeholder={c.iconPlaceholder} /></FG>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg flex items-center gap-2"><Drama size={16}/> {c.fullIdentity}</h3>
                  <p className="text-sm text-ink-text2 mt-1">
                    {c.identityHint}
                  </p>
                </div>
                <Link href={`/studio/${storyId}/voice?character=${active.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-ink-gold text-ink-deep hover:brightness-110 transition">
                  {c.editInVoiceStudio} <ArrowRight size={14} className="rtl-flip"/>
                </Link>
              </div>
              {(active.personality || active.backstory || active.motivation) && (
                <div className="mt-3 pt-3 border-t border-ink-border text-sm text-ink-text2 space-y-1">
                  <p className="label">{c.compiledSummary}</p>
                  {active.personality && <p><Tag color="muted">{c.personality}</Tag> {active.personality}</p>}
                  {active.motivation && <p><Tag color="muted">{c.motivation}</Tag> {active.motivation}</p>}
                  {active.flaw && <p><Tag color="muted">{c.flaw}</Tag> {active.flaw}</p>}
                </div>
              )}
            </Card>
          </>
        )}
      </section>
    </div>
  );
}

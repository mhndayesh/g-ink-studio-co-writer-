"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Settings, Trash2, LogOut, Send } from "lucide-react";
import * as api from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { Btn, Card, FG, Inp, Sel, PageHdr, Tag } from "@/components/ui/Primitives";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useI18n, type MessageKey } from "@/lib/i18n";

const GENRES: Array<{ value: string; key: MessageKey }> = [
  { value: "Fantasy", key: "genres.fantasy" },
  { value: "Sci-Fi", key: "genres.scifi" },
  { value: "Mystery", key: "genres.mystery" },
  { value: "Thriller", key: "genres.thriller" },
  { value: "Romance", key: "genres.romance" },
  { value: "Historical", key: "genres.historical" },
  { value: "Horror", key: "genres.horror" },
  { value: "Literary", key: "genres.literary" },
  { value: "Other", key: "genres.other" },
];

export default function StudioHub() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t, locale, formatNumber } = useI18n();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState(GENRES[0].value);
  const [language, setLanguage] = useState<"en" | "ar">(locale);
  const authed = useRequireAuth();

  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: api.listStories,
    enabled: authed,
  });

  const create = useMutation({
    mutationFn: (p: any) => api.createStory(p),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: ["stories"] }); router.push(`/studio/${s.id}/flow`); },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.deleteStory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });

  async function logout() {
    await api.logout();  // server-side revoke + clears local tokens
    qc.clear();          // drop cached stories/entitlement so they don't flash for the next user
    router.push("/login");
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-1">
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink-gold">{t("studio.coWriter")}</span>
        <span className="text-[10px] text-ink-text3 mx-1">/</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-text3">{t("studio.brand")}</span>
      </div>
      <PageHdr
        title={t("studio.yourStories")}
        subtitle={t("studio.storiesSubtitle")}
        right={
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <Link href="/settings" className="btn"><Settings size={14}/> {t("studio.settings")}</Link>
            <Btn variant="ghost" onClick={logout}><LogOut size={14}/> {t("studio.signOut")}</Btn>
          </div>
        }
      />

      <Card className="mb-6">
        <h2 className="font-display text-lg mb-3">{t("studio.newStory")}</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto] items-end">
          <FG label={t("studio.title")}>
            <Inp value={title} onChange={e => setTitle(e.target.value)} placeholder={t("studio.titlePlaceholder")} />
          </FG>
          <FG label={t("studio.genre")}>
            <Sel value={genre} onChange={e => setGenre(e.target.value)}>
              {GENRES.map(g => <option key={g.value} value={g.value}>{t(g.key)}</option>)}
            </Sel>
          </FG>
          <FG label={t("studio.writingLanguage")}>
            <Sel value={language} onChange={e => setLanguage(e.target.value as "en" | "ar")}>
              <option value="ar">{t("studio.languageArabic")}</option>
              <option value="en">{t("studio.languageEnglish")}</option>
            </Sel>
          </FG>
          <Btn
            variant="primary"
            disabled={!title.trim() || create.isPending}
            onClick={() => create.mutate({ title: title.trim(), genre, language })}
            className="mb-3"
          >
            <Plus size={14}/> {create.isPending ? t("common.creating") : t("common.create")}
          </Btn>
        </div>
      </Card>

      {authed && isLoading && <p className="text-ink-text2">Loading…</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(stories || []).map((s: any) => {
          const cover = api.mediaUrl(s.cover_image_url);
          return (
          <Card key={s.id} className="flex flex-col !p-0 overflow-hidden">
            {/* Cover banner (or a genre-tinted placeholder) */}
            <Link href={`/studio/${s.id}`} className="block relative h-32 bg-ink-surface2 border-b border-ink-border">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center">
                  <BookOpen size={26} className="text-ink-text3" />
                </div>
              )}
            </Link>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/studio/${s.id}`} className="flex-1 min-w-0">
                  <h3 className="font-display text-lg text-ink-text mb-1 truncate">{s.title || t("common.untitled")}</h3>
                  <p className="text-xs text-ink-text2 uppercase tracking-wider">{s.genre ? (GENRES.find(g => g.value === s.genre) ? t(GENRES.find(g => g.value === s.genre)!.key) : s.genre) : t("common.story")}</p>
                </Link>
                <button
                  onClick={() => { if (confirm(t("studio.deleteConfirm", { title: s.title || t("common.untitled") }))) del.mutate(s.id); }}
                  className="text-ink-text3 hover:text-ink-red"
                  aria-label={t("common.deleteStory")}
                ><Trash2 size={14}/></button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 text-xs text-ink-text2">
                <Tag color="muted"><BookOpen size={10}/> {t("studio.chaptersCount", { count: formatNumber(s.stats?.chapters ?? 0) })}</Tag>
                <Tag color="muted">{t("studio.charactersCount", { count: formatNumber(s.stats?.characters ?? 0) })}</Tag>
                <Tag color="muted">{t("studio.wordsCount", { count: formatNumber(s.stats?.words ?? 0) })}</Tag>
              </div>
              <div className="flex gap-2 mt-4">
                <Link href={`/studio/${s.id}`} className="btn btn-primary flex-1 justify-center">{t("studio.open")} <span className="rtl-flip">?</span></Link>
                <Link href={`/publish/${s.id}`} className="btn justify-center" title={t("common.publish")}>
                  <Send size={14}/> {t("common.publish")}
                </Link>
              </div>
            </div>
          </Card>
          );
        })}
        {authed && !isLoading && (stories || []).length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3 text-center text-ink-text2">
            {t("studio.noStories")}
          </Card>
        )}
      </div>
    </main>
  );
}

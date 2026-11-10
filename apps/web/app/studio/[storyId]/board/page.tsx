"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as api from "@/lib/api";
import { Card, PageHdr, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    title: "Plot Board",
    subtitle: "A live read of your story structure: chapters, threads, and scene cards.",
    chapters: "Chapters",
    chapterShort: "Ch",
    noChapters: "No chapters yet.",
    threads: "Threads",
    noThreads: "No threads yet.",
    sceneCards: "Scene cards",
    noScenes: "No scene cards yet.",
    threadStatus: { open: "open", paid_off: "paid off", abandoned: "abandoned" },
  },
  ar: {
    title: "لوحة الحبكة",
    subtitle: "قراءة حيّة لبنية قصتك: الفصول والخيوط وبطاقات المشاهد.",
    chapters: "الفصول",
    chapterShort: "ف",
    noChapters: "لا توجد فصول بعد.",
    threads: "الخيوط",
    noThreads: "لا توجد خيوط بعد.",
    sceneCards: "بطاقات المشاهد",
    noScenes: "لا توجد بطاقات مشاهد بعد.",
    threadStatus: { open: "مفتوح", paid_off: "مُغلَق", abandoned: "متروك" },
  },
} as const;

export default function BoardPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { t, locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data: chapters } = useQuery({ queryKey: ["chapters", storyId], queryFn: () => api.listChapters(storyId) });
  const { data: threads } = useQuery({ queryKey: ["threads", storyId], queryFn: () => api.listThreads(storyId) });
  const { data: scenes } = useQuery({ queryKey: ["scenes", storyId], queryFn: () => api.listScenes(storyId) });

  const threadStatus = (status?: string) =>
    status ? (c.threadStatus as Record<string, string>)[status] ?? status.replace("_", " ") : "";

  return (
    <div className="max-w-6xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />

      <h2 className="font-display text-xl mb-3">{c.chapters}</h2>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {(chapters || []).map((chapter: any) => (
          <Link key={chapter.id} href={`/studio/${storyId}/chapters?chapter=${chapter.id}`}>
            <Card className="hover:border-ink-gold/50 transition-colors">
              <p className="text-xs text-ink-text2">{c.chapterShort} {formatNumber(chapter.number)}</p>
              <h3 className="font-display text-lg mt-1">{chapter.title || t("common.untitled")}</h3>
              {chapter.summary && <p className="text-sm text-ink-text2 mt-2 line-clamp-3">{chapter.summary}</p>}
            </Card>
          </Link>
        ))}
        {(!chapters || chapters.length === 0) && <Card><p className="text-ink-text2 text-sm">{c.noChapters}</p></Card>}
      </div>

      <h2 className="font-display text-xl mb-3">{c.threads}</h2>
      <div className="grid gap-2 md:grid-cols-2 mb-8">
        {(threads || []).map((thread: any) => (
          <Card key={thread.id}>
            <div className="flex items-center gap-2 mb-1"><h3 className="font-display">{thread.name}</h3><Tag color={thread.status === "paid_off" ? "green" : thread.status === "abandoned" ? "muted" : "gold"}>{threadStatus(thread.status)}</Tag></div>
            <p className="text-sm text-ink-text2">{thread.description}</p>
          </Card>
        ))}
        {(!threads || threads.length === 0) && <Card><p className="text-ink-text2 text-sm">{c.noThreads}</p></Card>}
      </div>

      <h2 className="font-display text-xl mb-3">{c.sceneCards}</h2>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {(scenes || []).map((s: any) => (
          <Link key={s.id} href={`/studio/${storyId}/scenes?scene=${s.id}`}>
            <Card className="hover:border-ink-gold/50 transition-colors">
              {s.beat && <p className="text-xs uppercase tracking-wider text-ink-text2">{s.beat}</p>}
              <p className="text-sm mt-1">{s.title || s.summary || s.content}</p>
            </Card>
          </Link>
        ))}
        {(!scenes || scenes.length === 0) && <Card><p className="text-ink-text2 text-sm">{c.noScenes}</p></Card>}
      </div>
    </div>
  );
}

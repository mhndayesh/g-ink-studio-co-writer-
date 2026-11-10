"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Calendar, FileText, NotebookPen, Search, Target, TrendingUp, Wand2 } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, QueryError, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    title: "Dashboard",
    subtitle: "Where the story stands today.",
    words: "words",
    chapters: "chapters",
    today: "written today",
    streak: "day streak",
    continueWriting: "Continue writing",
    latest: "Latest chapter",
    openFlow: "Open Flow Writing",
    recent: "Recent chapters",
    noChapters: "No chapters yet — start with Flow Writing.",
    goals: "Writing goals",
    target: "Total word target",
    daily: "Daily word target",
    deadline: "Deadline",
    saveGoals: "Save goals",
    saved: "Saved",
    progress: "Progress",
    quick: "Quick links",
    notes: "Research notes",
    search: "Search story",
    timeline: "Timeline",
    export: "Export",
    last14: "Last 14 days",
    untitled: "Untitled",
  },
  ar: {
    title: "لوحة المتابعة",
    subtitle: "أين وصلت القصة اليوم.",
    words: "كلمة",
    chapters: "فصل",
    today: "كُتب اليوم",
    streak: "أيام متتالية",
    continueWriting: "تابع الكتابة",
    latest: "آخر فصل",
    openFlow: "افتح الكتابة الانسيابية",
    recent: "أحدث الفصول",
    noChapters: "لا فصول بعد — ابدأ بالكتابة الانسيابية.",
    goals: "أهداف الكتابة",
    target: "هدف الكلمات الكلي",
    daily: "هدف الكلمات اليومي",
    deadline: "الموعد النهائي",
    saveGoals: "حفظ الأهداف",
    saved: "تم الحفظ",
    progress: "التقدم",
    quick: "روابط سريعة",
    notes: "ملاحظات البحث",
    search: "ابحث في القصة",
    timeline: "الخط الزمني",
    export: "تصدير",
    last14: "آخر ١٤ يومًا",
    untitled: "بلا عنوان",
  },
} as const;

export default function StoryDashboard() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;

  const storyQ = useQuery({ queryKey: ["story", storyId], queryFn: () => api.getStory(storyId) });
  const chaptersQ = useQuery({ queryKey: ["chapters", storyId], queryFn: () => api.listChapters(storyId) });
  const statsQ = useQuery({ queryKey: ["story-stats", storyId], queryFn: () => api.storyStats(storyId, 30) });

  const story = storyQ.data;
  const stats = story?.stats || {};
  const chapters = useMemo(
    () => [...(chaptersQ.data || [])].sort((a: any, b: any) => a.number - b.number),
    [chaptersQ.data],
  );
  const latest = chapters[chapters.length - 1] || null;
  const recent = [...chapters].reverse().slice(0, 5);

  const [target, setTarget] = useState("");
  const [daily, setDaily] = useState("");
  const [deadline, setDeadline] = useState("");
  useEffect(() => {
    if (!story) return;
    setTarget(story.target_word_count ? String(story.target_word_count) : "");
    setDaily(story.daily_word_target ? String(story.daily_word_target) : "");
    setDeadline(story.deadline ? String(story.deadline).slice(0, 10) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const saveGoals = useMutation({
    mutationFn: () => api.updateStory(storyId, {
      target_word_count: target ? Number(target) : null,
      daily_word_target: daily ? Number(daily) : null,
      deadline: deadline ? new Date(`${deadline}T00:00:00Z`).toISOString() : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  const series: Array<{ day: string; words: number }> = (statsQ.data?.series || []).slice(-14);
  const maxWords = Math.max(1, ...series.map(s => s.words));
  const progress = target && stats.words ? Math.min(100, Math.round((stats.words / Number(target)) * 100)) : null;

  if (storyQ.isError) {
    return <QueryError error={storyQ.error} retry={storyQ.refetch} what={c.title} />;
  }

  return (
    <div className="max-w-5xl">
      <PageHdr
        title={c.title}
        subtitle={c.subtitle}
        right={<Link href={`/studio/${storyId}/flow`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-ink-gold text-ink-deep hover:brightness-110"><Wand2 size={14}/> {c.openFlow}</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink-text3">{c.words}</p>
          <p className="text-2xl font-display mt-1">{formatNumber(stats.words || 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink-text3">{c.chapters}</p>
          <p className="text-2xl font-display mt-1">{formatNumber(stats.chapters || 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink-text3">{c.today}</p>
          <p className="text-2xl font-display mt-1 flex items-center gap-2">
            {formatNumber(stats.words_today || 0)}
            {stats.daily_word_target ? <span className="text-xs text-ink-text3">/ {formatNumber(stats.daily_word_target)}</span> : null}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-ink-text3">{c.streak}</p>
          <p className="text-2xl font-display mt-1 flex items-center gap-2"><TrendingUp size={18} className="text-ink-gold"/>{formatNumber(stats.streak_days || 0)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] mb-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg flex items-center gap-2"><BookOpen size={16}/> {c.continueWriting}</h2>
            {latest && <Tag color="gold">Ch{formatNumber(latest.number)}</Tag>}
          </div>
          {latest ? (
            <>
              <p className="text-lg font-display">{latest.title || c.untitled}</p>
              {latest.summary && <p className="text-sm text-ink-text2 mt-1 line-clamp-3">{latest.summary}</p>}
              <div className="flex gap-2 mt-3">
                <Link href={`/studio/${storyId}/chapters?chapter=${latest.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-ink-gold text-ink-deep hover:brightness-110">
                  <FileText size={14}/> {c.latest}
                </Link>
                <Link href={`/studio/${storyId}/flow`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-ink-border text-ink-text2 hover:text-ink-text">
                  <Wand2 size={14}/> {c.openFlow}
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-text2">{c.noChapters}</p>
          )}

          <div className="mt-5 pt-4 border-t border-ink-border">
            <p className="text-xs uppercase tracking-wider text-ink-text3 mb-2">{c.last14}</p>
            <div className="flex items-end gap-1 h-20">
              {series.map((s) => (
                <div key={s.day} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${s.day}: ${s.words}`}>
                  <div className="w-full rounded-t bg-ink-gold/70" style={{ height: `${Math.max(2, (s.words / maxWords) * 72)}px` }} />
                </div>
              ))}
              {series.length === 0 && <p className="text-xs text-ink-text3">—</p>}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg flex items-center gap-2 mb-3"><Target size={16}/> {c.goals}</h2>
          <div className="grid gap-3">
            <FG label={c.target}><Inp type="number" min={0} value={target} onChange={e => setTarget(e.target.value)} /></FG>
            <FG label={c.daily}><Inp type="number" min={0} value={daily} onChange={e => setDaily(e.target.value)} /></FG>
            <FG label={c.deadline}><Inp type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></FG>
          </div>
          {progress !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-ink-text3 mb-1"><span>{c.progress}</span><span>{progress}%</span></div>
              <div className="h-2 rounded bg-ink-surface3 overflow-hidden"><div className="h-full bg-ink-gold" style={{ width: `${progress}%` }} /></div>
            </div>
          )}
          <div className="flex justify-end mt-3">
            <Btn variant="primary" disabled={saveGoals.isPending} onClick={() => saveGoals.mutate()}>
              {saveGoals.isPending ? c.saved : c.saveGoals}
            </Btn>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg mb-3">{c.recent}</h2>
          <ul className="space-y-1">
            {recent.map((ch: any) => (
              <li key={ch.id}>
                <Link href={`/studio/${storyId}/chapters?chapter=${ch.id}`} className="flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-ink-surface2">
                  <span className="truncate"><span className="text-ink-text3 me-2">Ch{formatNumber(ch.number)}</span>{ch.title || c.untitled}</span>
                  <span className="text-xs text-ink-text3">{formatNumber(ch.word_count || 0)} {c.words}</span>
                </Link>
              </li>
            ))}
            {recent.length === 0 && <li className="text-sm text-ink-text3">{c.noChapters}</li>}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-lg mb-3">{c.quick}</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { href: "notes", icon: NotebookPen, label: c.notes },
              { href: "search", icon: Search, label: c.search },
              { href: "timeline", icon: Calendar, label: c.timeline },
              { href: "export", icon: FileText, label: c.export },
            ].map(item => (
              <Link key={item.href} href={`/studio/${storyId}/${item.href}`} className="flex items-center gap-2 px-3 py-2 rounded border border-ink-border text-ink-text2 hover:text-ink-text hover:border-ink-gold/40">
                <item.icon size={14}/> {item.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

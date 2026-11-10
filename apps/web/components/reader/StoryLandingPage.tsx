"use client";
// apps/web/components/reader/StoryLandingPage.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { request, mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import RatingModal from "./RatingModal";
import ReviewPanel from "./ReviewPanel";

interface PublishedChapter {
  chapter_number: number;
  title: string;
  word_count: number;
  pushed_at: string;
}

interface StoryLanding {
  publication: {
    id: string;
    slug: string;
    status: string;
    release_type: "complete" | "serial";
    cover_image_url: string | null;
    tagline: string | null;
    genre: string | null;
    tags: string[];
    content_warnings: string[];
    view_count: number;
    total_planned_chapters: number | null;
    published_at: string | null;
  };
  story_title: string;
  story_logline: string | null;
  author_name: string;
  chapters: PublishedChapter[];
  avg_rating: number | null;
  rating_count: number;
}

interface Progress {
  last_chapter_number: number;
  completion_percentage: number;
  is_following: boolean;
}

const GENRES: Record<string, { en: string; ar: string }> = {  fantasy: { en: "Fantasy", ar: "فانتازيا" },
  "sci-fi": { en: "Sci-Fi", ar: "خيال علمي" },
  thriller: { en: "Thriller", ar: "إثارة" },
  romance: { en: "Romance", ar: "رومانسية" },
  literary: { en: "Literary", ar: "أدبية" },
  mystery: { en: "Mystery", ar: "غموض" },
  horror: { en: "Horror", ar: "رعب" },
  historical: { en: "Historical", ar: "تاريخية" },
  adventure: { en: "Adventure", ar: "مغامرة" },
  "young-adult": { en: "Young Adult", ar: "يافعون" },
  other: { en: "Other", ar: "أخرى" },
};

const WARNINGS: Record<string, { en: string; ar: string }> = {
  Violence: { en: "Violence", ar: "العنف" },
  "Strong language": { en: "Strong language", ar: "ألفاظ قوية" },
  "Adult themes": { en: "Adult themes", ar: "موضوعات للبالغين" },
  "Dark themes": { en: "Dark themes", ar: "مواضيع قاتمة" },
  "Substance use": { en: "Substance use", ar: "تعاطي مواد" },
  "Mental health": { en: "Mental health", ar: "الصحة النفسية" },
  "Graphic content": { en: "Graphic content", ar: "محتوى صريح" },
};

function genreLabel(value: string, locale: string): string {
  const hit = GENRES[value.trim().toLowerCase()];
  if (!hit) return value;
  return locale === "ar" ? hit.ar : hit.en;
}

function warningLabel(value: string, locale: string): string {
  const hit = WARNINGS[value];
  if (!hit) return value;
  return locale === "ar" ? hit.ar : hit.en;
}

const COPY = {
  en: {
    words: "{n} words",
    kiloWords: "{n}k words",
    minRead: "{n} min read",
    hoursRead: "{h}h {m}m read",
    by: "by {name}",
    serial: "📅 Serial",
    complete: "📖 Complete",
    contentWarnings: "⚠ Content warnings",
    chaptersCount: "{n} chapters",
    chaptersCountOne: "{n} chapter",
    reads: "{n} reads",
    resume: "Resume — Ch. {n}",
    startReading: "Start reading",
    following: "✓ Following",
    follow: "+ Follow",
    rate: "★ Rate",
    contentWarningsCount: "▸ Content warnings ({n})",
    chapters: "Chapters",
    planned: "({n} of {total} planned)",
    chapterFallback: "Chapter {n}",
    wordsShort: "{n} w",
    readingStats: "Reading stats",
    totalLength: "Total length",
    estTime: "Est. time",
    readsLabel: "Reads",
    rating: "Rating",
    yourProgress: "Your progress",
    completePct: "{n}% complete",
    upToChapter: " · up to Ch. {n}",
    about: "About",
  },
  ar: {
    words: "{n} كلمة",
    kiloWords: "{n} ألف كلمة",
    minRead: "~{n} د قراءة",
    hoursRead: "~{h} س {m} د قراءة",
    by: "بقلم {name}",
    serial: "📅 تسلسلية",
    complete: "📖 مكتملة",
    contentWarnings: "⚠ تنبيهات المحتوى",
    chaptersCount: "الفصول: {n}",
    chaptersCountOne: "الفصول: {n}",
    reads: "القراءات: {n}",
    resume: "متابعة — الفصل {n}",
    startReading: "ابدأ القراءة",
    following: "✓ تتابعها",
    follow: "+ متابعة",
    rate: "★ قيّم",
    contentWarningsCount: "▸ تنبيهات المحتوى ({n})",
    chapters: "الفصول",
    planned: "({n} من {total} مخطط لها)",
    chapterFallback: "الفصل {n}",
    wordsShort: "{n} كلمة",
    readingStats: "إحصاءات القراءة",
    totalLength: "الطول الإجمالي",
    estTime: "الوقت المقدّر",
    readsLabel: "القراءات",
    rating: "التقييم",
    yourProgress: "تقدّمك",
    completePct: "اكتمل {n}%",
    upToChapter: " · حتى الفصل {n}",
    about: "نبذة",
  },
} as const;

function totalWords(chapters: PublishedChapter[], locale: string, formatNumber: (v: number) => string): string {
  const total = chapters.reduce((s, ch) => s + (ch.word_count || 0), 0);
  const c = locale === "ar" ? COPY.ar : COPY.en;
  if (total < 1000) return c.words.replace("{n}", formatNumber(total));
  const thousands = Math.round(total / 1000);
  if (locale === "ar") {
    if (thousands === 1) return "ألف كلمة";
    if (thousands === 2) return "ألفا كلمة";
    if (thousands <= 10) return `${formatNumber(thousands)} آلاف كلمة`;
  }
  return c.kiloWords.replace("{n}", formatNumber(thousands));
}

function readTime(wordCount: number, locale: string, formatNumber: (v: number) => string): string {
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const mins = Math.ceil(wordCount / 250);
  if (mins < 60) return c.minRead.replace("{n}", formatNumber(mins));
  return c.hoursRead
    .replace("{h}", formatNumber(Math.floor(mins / 60)))
    .replace("{m}", formatNumber(mins % 60));
}

export default function StoryLandingPage({
  slug,
  isAuthenticated,
}: {
  slug: string;
  isAuthenticated: boolean;
}) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [followStatus, setFollowStatus]       = useState<"idle" | "loading" | "done">("idle");
  const [isFollowing, setIsFollowing]         = useState(false);

  const { locale, formatNumber, formatDate } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;

  const { data, isLoading } = useQuery({
    queryKey: ["landing", slug],
    queryFn: () => request<StoryLanding>(`/v1/read/${slug}`),
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", slug],
    queryFn: () => request<Progress | null>(`/v1/read/${slug}/progress`),
    enabled: isAuthenticated,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-ink-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ink-gold/40 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { publication: pub, story_title, story_logline, author_name, chapters, avg_rating, rating_count } = data;
  const totalChapters = chapters.length;
  const allWords      = chapters.reduce((s, ch) => s + (ch.word_count || 0), 0);
  const resumeChapter = progress?.last_chapter_number ?? 0;

  const handleFollow = async () => {
    if (!isAuthenticated) return;
    setFollowStatus("loading");
    try {
      if (isFollowing) {
        await request(`/v1/read/${slug}/follow`, { method: "DELETE" });
        setIsFollowing(false);
      } else {
        await request(`/v1/read/${slug}/follow`, { method: "POST" });
        setIsFollowing(true);
      }
      setFollowStatus("done");
      setTimeout(() => setFollowStatus("idle"), 1000);
    } catch {
      setFollowStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-ink-bg text-ink-text">

      {/* Hero */}
      <div className="border-b border-ink-border">
        <div className="max-w-5xl mx-auto px-6 py-14 flex gap-10 items-start">

          {/* Cover */}
          <div className="shrink-0 w-36 h-52 rounded-xl overflow-hidden shadow-lg border border-ink-border">
            {pub.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(pub.cover_image_url)} alt={story_title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-ink-surface2 flex items-center justify-center">
                <span className="text-4xl font-bold font-serif text-ink-text3 opacity-60">
                  {story_title.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h1 className="text-3xl font-display leading-tight text-ink-text" dir="auto">{story_title}</h1>
              <p className="text-ink-text2 text-sm mt-1">{c.by.replace("{name}", author_name)}</p>
            </div>

            {pub.tagline && (
              <p className="text-sm text-ink-text2 leading-relaxed italic" dir="auto">{pub.tagline}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {pub.genre && (
                <span className="text-xs px-2.5 py-1 rounded-full border border-ink-gold/40 bg-ink-gold/10 text-ink-goldLight font-medium capitalize">
                  {genreLabel(pub.genre, locale)}
                </span>
              )}
              <span className="text-xs px-2.5 py-1 rounded-full border border-ink-border bg-ink-surface2 text-ink-text2">
                {pub.release_type === "serial" ? c.serial : c.complete}
              </span>
              {pub.content_warnings.length > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full border border-ink-red/30 bg-ink-red/10 text-ink-red">
                  {c.contentWarnings}
                </span>
              )}
              {pub.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-ink-border text-ink-text3">
                  {tag}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-ink-text2">
              <span>
                {(totalChapters === 1 ? c.chaptersCountOne : c.chaptersCount).replace("{n}", formatNumber(totalChapters))}
              </span>
              <span className="text-ink-text3">·</span>
              <span>{totalWords(chapters, locale, formatNumber)}</span>
              <span className="text-ink-text3">·</span>
              <span>{c.reads.replace("{n}", formatNumber(pub.view_count ?? 0))}</span>
              {avg_rating && (
                <>
                  <span className="text-ink-text3">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-ink-gold">★</span>
                    {formatNumber(avg_rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    <span className="text-ink-text3">({formatNumber(rating_count)})</span>
                  </span>
                </>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-1">
              {resumeChapter > 0 && resumeChapter < totalChapters ? (
                <Link href={`/read/${slug}/${resumeChapter + 1}`} className="btn btn-primary">
                  {c.resume.replace("{n}", formatNumber(resumeChapter + 1))}
                </Link>
              ) : (
                <Link href={`/read/${slug}/1`} className="btn btn-primary">
                  {c.startReading}
                </Link>
              )}

              {isAuthenticated && pub.release_type === "serial" && (
                <button
                  onClick={handleFollow}
                  disabled={followStatus === "loading"}
                  className={`btn ${isFollowing ? "" : "btn-ghost"}`}
                >
                  {followStatus === "loading" ? "…" : isFollowing ? c.following : c.follow}
                </button>
              )}

              {isAuthenticated && (
                <button onClick={() => setShowRatingModal(true)} className="btn btn-ghost">
                  {c.rate}
                </button>
              )}
            </div>

            {pub.content_warnings.length > 0 && (
              <details className="text-xs text-ink-text3 cursor-pointer">
                <summary className="hover:text-ink-text2 transition">
                  {c.contentWarningsCount.replace("{n}", formatNumber(pub.content_warnings.length))}
                </summary>
                <p className="mt-1 text-ink-red/80 leading-relaxed">
                  {pub.content_warnings.map(w => warningLabel(w, locale)).join(locale === "ar" ? "، " : ", ")}
                </p>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Left: chapters + reviews */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="font-display text-lg text-ink-text">
            {c.chapters}
            {pub.release_type === "serial" && pub.total_planned_chapters && (
              <span className="ms-2 text-xs font-normal text-ink-text3">
                {c.planned
                  .replace("{n}", formatNumber(totalChapters))
                  .replace("{total}", formatNumber(pub.total_planned_chapters))}
              </span>
            )}
          </h2>

          <div className="space-y-0.5">
            {chapters.map(ch => {
              const isRead = resumeChapter >= ch.chapter_number;
              return (
                <Link
                  key={ch.chapter_number}
                  href={`/read/${slug}/${ch.chapter_number}`}
                  className="group flex items-center justify-between py-3 px-4 rounded-lg hover:bg-ink-surface2 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-mono shrink-0 w-6 text-center ${isRead ? "text-ink-gold" : "text-ink-text3"}`}>
                      {isRead ? "✓" : formatNumber(ch.chapter_number)}
                    </span>
                    <span className={`text-sm truncate transition ${isRead ? "text-ink-text2" : "text-ink-text"} group-hover:text-ink-text`}>
                      {ch.title || c.chapterFallback.replace("{n}", formatNumber(ch.chapter_number))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ms-4 text-xs text-ink-text3">
                    <span>{c.wordsShort.replace("{n}", formatNumber(ch.word_count))}</span>
                    <span className="hidden sm:block">
                      {formatDate(ch.pushed_at, { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-ink-text3 group-hover:text-ink-text2 transition">
                      <span className="rtl-flip inline-block">→</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Reviews */}
          <div className="pt-6 border-t border-ink-border">
            <ReviewPanel pubId={pub.id} slug={slug} isAuthenticated={isAuthenticated} />
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Reading stats */}
          <div className="card-ink p-4 space-y-3">
            <h3 className="text-xs text-ink-text3 uppercase tracking-wide">{c.readingStats}</h3>
            <div className="space-y-2">
              {[
                { label: c.totalLength, value: totalWords(chapters, locale, formatNumber) },
                { label: c.estTime,    value: readTime(allWords, locale, formatNumber) },
                { label: c.chapters,   value: formatNumber(totalChapters) },
                { label: c.readsLabel, value: formatNumber(pub.view_count) },
                ...(avg_rating
                  ? [{
                      label: c.rating,
                      value: `★ ${formatNumber(avg_rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} (${formatNumber(rating_count)})`,
                    }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-ink-text2">{label}</span>
                  <span className="text-ink-text font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reader progress */}
          {progress && progress.completion_percentage > 0 && (
            <div className="card-ink p-4 space-y-2">
              <h3 className="text-xs text-ink-text3 uppercase tracking-wide">{c.yourProgress}</h3>
              <div className="h-1.5 bg-ink-surface3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-ink-gold transition-all"
                  style={{ width: `${progress.completion_percentage}%` }}
                />
              </div>
              <p className="text-xs text-ink-text3">
                {c.completePct.replace("{n}", formatNumber(Math.round(progress.completion_percentage)))}
                {progress.last_chapter_number > 0 && c.upToChapter.replace("{n}", formatNumber(progress.last_chapter_number))}
              </p>
            </div>
          )}

          {/* About */}
          {story_logline && (
            <div className="card-ink p-4 space-y-2">
              <h3 className="text-xs text-ink-text3 uppercase tracking-wide">{c.about}</h3>
              <p className="text-sm text-ink-text2 leading-relaxed">{story_logline}</p>
            </div>
          )}
        </div>
      </div>

      {showRatingModal && (
        <RatingModal pubId={pub.id} storyTitle={story_title} onClose={() => setShowRatingModal(false)} />
      )}
    </div>
  );
}

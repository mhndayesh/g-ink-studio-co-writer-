"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request, mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface StoryCard {
  id: string;
  slug: string;
  author_id: string;
  story_title: string;
  author_name: string;
  tagline: string | null;
  genre: string | null;
  tags: string[];
  cover_image_url: string | null;
  content_warnings: string[];
  release_type: "complete" | "serial";
  view_count: number;
  published_at: string | null;
  total_chapters: number;
  avg_rating: number | null;
  rating_count: number;
}

interface FeedResponse {
  items: StoryCard[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

const GENRES = [
  "all", "fantasy", "sci-fi", "thriller", "romance", "literary",
  "mystery", "horror", "historical", "adventure",
];

const GENRE_LABELS: Record<string, { en: string; ar: string }> = {
  all: { en: "All", ar: "الكل" },
  fantasy: { en: "Fantasy", ar: "فانتازيا" },
  "sci-fi": { en: "Sci-Fi", ar: "خيال علمي" },
  thriller: { en: "Thriller", ar: "إثارة" },
  romance: { en: "Romance", ar: "رومانسية" },
  literary: { en: "Literary", ar: "أدبية" },
  mystery: { en: "Mystery", ar: "غموض" },
  horror: { en: "Horror", ar: "رعب" },
  historical: { en: "Historical", ar: "تاريخية" },
  adventure: { en: "Adventure", ar: "مغامرة" },
  scifi: { en: "Sci-Fi", ar: "خيال علمي" },
  other: { en: "Other", ar: "أخرى" },
};

function genreLabel(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const hit = GENRE_LABELS[value.trim().toLowerCase()];
  if (!hit) return value;
  return locale === "ar" ? hit.ar : hit.en;
}

const COPY = {
  en: {
    hubTitle: "G-Ink Hub",
    searchPlaceholder: "Search stories, authors…",
    sorts: { recent: "Recent", popular: "Popular", rating: "Top rated" },
    serial: "Serial",
    chaptersShort: "{n} ch.",
    reads: "{n} reads",
    loadErrorTitle: "Couldn’t load stories.",
    loadErrorBody: "This is a loading error, not missing content.",
    tryAgain: "Try again",
    noResults: "No stories found for \"{query}\"",
    noStories: "No stories published yet.",
    beFirst: "Be the first —",
    startWriting: "start writing",
    storyCount: "1 STORY",
    storiesCount: "{n} STORIES",
    previous: "Previous",
    next: "Next",
    page: "Page {n}",
  },
  ar: {
    hubTitle: "مركز G-Ink",
    searchPlaceholder: "ابحث عن قصص أو كتّاب…",
    sorts: { recent: "الأحدث", popular: "الأكثر رواجًا", rating: "الأعلى تقييمًا" },
    serial: "تسلسلية",
    chaptersShort: "الفصول: {n}",
    reads: "القراءات: {n}",
    loadErrorTitle: "تعذّر تحميل القصص.",
    loadErrorBody: "هذا خطأ في التحميل، وليس محتوى مفقودًا.",
    tryAgain: "حاول مرة أخرى",
    noResults: "لا توجد قصص مطابقة لـ «{query}»",
    noStories: "لم تُنشر أي قصص بعد.",
    beFirst: "كن الأول —",
    startWriting: "ابدأ الكتابة",
    storyCount: "قصة واحدة",
    storiesCount: "عدد القصص: {n}",
    previous: "السابق",
    next: "التالي",
    page: "الصفحة {n}",
  },
} as const;

function StoryCardItem({ story }: { story: StoryCard }) {
  const router  = useRouter();
  const { locale, formatNumber, t } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const initials = story.story_title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    // Outer div — NOT a link so author link can sit inside without nesting <a><a>
    <div
      role="article"
      onClick={() => router.push(`/read/${story.slug}`)}
      style={{
        cursor: "pointer",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow)",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px color-mix(in oklab, var(--accent) 12%, transparent)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)";
      }}
    >
        {/* Cover */}
        <div
          style={{
            height: 148,
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            borderBottom: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {story.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(story.cover_image_url)}
              alt={story.story_title}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 42,
                fontWeight: 600,
                color: "var(--accent)",
                opacity: 0.3,
                userSelect: "none",
                letterSpacing: "-0.02em",
              }}
            >
              {initials}
            </span>
          )}

          {/* Badges */}
          <div style={{ position: "absolute", top: 10, insetInlineStart: 10, display: "flex", gap: 6 }}>
            {story.release_type === "serial" && (
              <span className="iw-badge">{c.serial}</span>
            )}
            {story.content_warnings.length > 0 && (
              <span className="iw-badge" style={{ background: "var(--surface-2)", color: "var(--faint)" }}>
                ⚠ {formatNumber(story.content_warnings.length)}
              </span>
            )}
          </div>

          {story.genre && (
            <span
              className="iw-badge"
              style={{ position: "absolute", bottom: 10, insetInlineEnd: 10, textTransform: "capitalize" }}
            >
              {genreLabel(story.genre, locale)}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "14px 16px 16px" }}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Link
              href={story.author_id ? `/u/${story.author_id}` : "#"}
              onClick={e => e.stopPropagation()}
              style={{
                width: 28, height: 28,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                border: "1px solid var(--border)",
                display: "grid",
                placeItems: "center",
                color: "var(--accent)",
                fontWeight: 700,
                fontSize: 11,
                flexShrink: 0,
                textDecoration: "none",
                transition: "border-color 0.15s",
              }}
            >
              {(story.author_name || "?")[0].toUpperCase()}
            </Link>
            <div>
              <Link
                href={story.author_id ? `/u/${story.author_id}` : "#"}
                onClick={e => e.stopPropagation()}
                style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", lineHeight: 1.2, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text)")}
              >
                {story.author_name || t("common.anonymous")}
              </Link>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>
                {c.chaptersShort.replace("{n}", formatNumber(story.total_chapters))} · {c.reads.replace("{n}", formatNumber(story.view_count ?? 0))}
              </div>
            </div>
          </div>

          <h3 style={{ margin: "0 0 6px", lineHeight: 1.3 }}>
            <Link
              href={`/read/${story.slug}`}
              onClick={e => e.stopPropagation()}
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--text)",
                textDecoration: "none",
                letterSpacing: "-0.01em",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical" as const,
              }}
            >
              {story.story_title}
            </Link>
          </h3>

          {story.tagline && (
            <p
              style={{
                fontSize: 13.5,
                color: "var(--muted)",
                lineHeight: 1.55,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
              }}
            >
              {story.tagline}
            </p>
          )}

          {/* Footer */}
          {story.avg_rating && story.rating_count > 0 && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--faint)",
              }}
            >
              <span style={{ color: "var(--accent)" }}>★</span>
              <span>{formatNumber(story.avg_rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span>({formatNumber(story.rating_count)})</span>
            </div>
          )}
        </div>
      </div>
  );
}

export default function DiscoveryFeed({ topOffset = "top-0" }: { topOffset?: string }) {
  const [genre,    setGenre]    = useState("all");
  const [sort,     setSort]     = useState("recent");
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [inputVal, setInputVal] = useState("");

  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["discovery", genre, sort, search, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page), sort,
        ...(genre !== "all" && { genre }),
        ...(search && { q: search }),
      });
      return request<FeedResponse>(`/v1/read/?${params}`);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputVal);
    setPage(1);
  };

  const SORTS = [
    { value: "recent",  label: c.sorts.recent },
    { value: "popular", label: c.sorts.popular },
    { value: "rating",  label: c.sorts.rating },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Sticky filter bar */}
      <div
        className={`${topOffset}`}
        style={{
          position: "sticky",
          zIndex: 10,
          background: "color-mix(in oklab, var(--bg) 90%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "12px clamp(16px, 4vw, 44px)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 17,
              fontWeight: 500,
              color: "var(--text)",
              flexShrink: 0,
            }}
          >
            {c.hubTitle}
          </h2>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ flex: "1 1 200px", maxWidth: 320 }}>
            <div style={{ position: "relative" }}>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder={c.searchPlaceholder}
                className="iw-input"
                style={{ paddingInlineEnd: 36, paddingInlineStart: 14, paddingBlock: 8, fontSize: 14 }}
              />
              <button
                type="submit"
                style={{
                  position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "var(--faint)", cursor: "pointer",
                  fontSize: 16, padding: 0,
                }}
              >
                ⌕
              </button>
            </div>
          </form>

          {/* Sort */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {SORTS.map(s => (
              <button
                key={s.value}
                onClick={() => { setSort(s.value); setPage(1); }}
                style={{
                  padding: "6px 12px",
                  border: sort === s.value
                    ? "1px solid color-mix(in oklab, var(--accent) 35%, transparent)"
                    : "1px solid transparent",
                  borderRadius: 8,
                  background: sort === s.value ? "var(--accent-soft)" : "transparent",
                  color: sort === s.value ? "var(--accent)" : "var(--muted)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Genre chips */}
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(16px, 4vw, 44px) 12px",
            display: "flex",
            gap: 8,
            overflowX: "auto",
          }}
        >
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => { setGenre(g); setPage(1); }}
              className={`iw-chip${genre === g ? " active" : ""}`}
              style={{ flexShrink: 0, textTransform: "capitalize", fontSize: 12, padding: "4px 12px" }}
            >
              {genreLabel(g, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Story grid */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px clamp(16px, 4vw, 44px)" }}>
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  borderRadius: "var(--r-lg)",
                  height: 280,
                  animation: "pulse 1.5s ease-in-out infinite",
                  border: "1px solid var(--border)",
                }}
              />
            ))}
          </div>
        ) : isError ? (
          // A failed fetch must NOT look like "no stories" (which reads as an empty
          // library). Show a distinct, retryable error state instead.
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--faint)" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 48, marginBottom: 16, opacity: 0.4 }}>⚠</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--muted)" }}>
              {c.loadErrorTitle}
            </p>
            <p style={{ fontSize: 14, color: "var(--faint)", marginTop: 8 }}>
              {c.loadErrorBody}{" "}
              <button onClick={() => refetch()} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {c.tryAgain}
              </button>
            </p>
          </div>
        ) : !data?.items.length ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--faint)" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 48, marginBottom: 16, opacity: 0.4 }}>✦</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--muted)" }}>
              {search ? c.noResults.replace("{query}", search) : c.noStories}
            </p>
            <p style={{ fontSize: 14, color: "var(--faint)", marginTop: 8 }}>
              {c.beFirst} <a href="/signup" style={{ color: "var(--accent)" }}>{c.startWriting}</a>
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--faint)",
                  letterSpacing: "0.06em",
                }}
              >
                {data.total === 1
                  ? c.storyCount
                  : c.storiesCount.replace("{n}", formatNumber(data.total))}
                {search && ` · «${search}»`}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              {data.items.map(story => (
                <StoryCardItem key={story.id} story={story} />
              ))}
            </div>

            {/* Pagination */}
            {(data.has_more || page > 1) && (
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 48 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="iw-btn secondary"
                  style={{ fontSize: 13 }}
                >
                  <span className="rtl-flip" style={{ display: "inline-block" }}>←</span> {c.previous}
                </button>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--faint)",
                  }}
                >
                  {c.page.replace("{n}", formatNumber(page))}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.has_more}
                  className="iw-btn secondary"
                  style={{ fontSize: 13 }}
                >
                  {c.next} <span className="rtl-flip" style={{ display: "inline-block" }}>→</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

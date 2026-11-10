"use client";
// apps/web/components/publishing/PublishingHub.tsx
//
// Writer's publishing management dashboard for a single story.
// Usage:  <PublishingHub storyId={story.id} storyTitle={story.title} />
//
// Fetches publication data, shows status, allows pushing chapters & going live.

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request, mediaUrl } from "@/lib/api";
import { CoverUploader } from "@/components/ui/CoverUploader";
import { useI18n, type Locale } from "@/lib/i18n";

interface Chapter {
  id: string;
  number: number;
  title: string;
  word_count?: number;
}

interface Publication {
  id: string;
  slug: string;
  status: "draft" | "published" | "unlisted" | "archived";
  release_type: "complete" | "serial";
  tagline: string | null;
  genre: string | null;
  tags: string[];
  content_warnings: string[];
  cover_image_url: string | null;
  published_at: string | null;
  last_chapter_pushed_at: string | null;
  total_planned_chapters: number | null;
  view_count: number;
}

interface PushedChapter {
  chapter_number: number;
  title: string;
  word_count: number;
  pushed_at: string;
  version: number;
  is_latest: boolean;
}

interface PublishingHubProps {
  storyId: string;
  storyTitle: string;
  storyChapters: Chapter[];
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-ink-gold/10 text-ink-gold border-ink-gold/30",
  published: "bg-green-500/10 text-green-400 border-green-500/30",
  unlisted:  "bg-blue-500/10 text-blue-400 border-blue-500/30",
  archived:  "bg-ink-text2/10 text-ink-text2 border-ink-text2/20",
};

// Canonical values sent to the API; labels are localized at render time.
const WARNING_OPTIONS = [
  "Violence", "Strong language", "Adult themes", "Dark themes",
  "Substance use", "Mental health", "Graphic content",
];

const GENRE_OPTIONS = [
  "fantasy", "sci-fi", "thriller", "romance", "literary", "mystery",
  "horror", "historical", "adventure", "young-adult", "other",
];

const copyEn = {
  publishTitle: (title: string) => `Publish "${title}"`,
  createDesc: "Create a public page for your story. Readers can discover, read, and leave feedback. Your studio data is never touched — readers see a separate published snapshot.",
  complete: "Complete story",
  serial: "Serial (chapters over time)",
  creating: "Creating…",
  createDraft: "Create publication draft",
  views: (count: string, isOne: boolean) => `${count} view${isOne ? "" : "s"}`,
  statusLabels: { draft: "draft", published: "published", unlisted: "unlisted", archived: "archived" } as Record<string, string>,
  typeLabels: { complete: "complete", serial: "serial" } as Record<string, string>,
  publish: "Publish",
  publishing: "Publishing…",
  unlisting: "Unlisting…",
  unlist: "Unlist",
  republish: "Re-publish",
  tabLabels: { overview: "overview", chapters: "chapters", settings: "settings" } as Record<string, string>,
  taglineHeroEmpty: "Add a tagline + cover in Settings to make your story pop on discovery.",
  pushFirst: "Push a chapter first →",
  publishNow: "🚀 Publish now",
  viewPublic: "View public page ↗",
  statStatus: "Status",
  statType: "Type",
  statChapters: "Chapters",
  statViews: "Views",
  chaptersPublished: (count: string) => `${count} published`,
  taglineLabel: "Tagline",
  pushFirstHint: "⚡ Push at least one chapter from the Chapters tab before publishing.",
  chaptersIntro: "Select studio chapters to push to your public publication. Pushing creates an immutable snapshot — future edits in the studio won't affect what readers see until you push again.",
  chapterFallback: (number: string) => `Chapter ${number}`,
  publishedBadge: "published",
  pushChapters: (count: string, isOne: boolean) => `Push ${count} chapter${isOne ? "" : "s"}`,
  pushing: "Pushing…",
  currentlyPublished: "Currently published",
  version: (value: string) => `v${value}`,
  coverImage: "Cover image",
  coverAlt: "cover",
  tagline: "Tagline",
  taglinePlaceholder: "A compelling one-line for the discovery page…",
  genre: "Genre",
  selectGenre: "Select genre",
  genreNames: {
    fantasy: "Fantasy",
    "sci-fi": "Sci-Fi",
    thriller: "Thriller",
    romance: "Romance",
    literary: "Literary",
    mystery: "Mystery",
    horror: "Horror",
    historical: "Historical",
    adventure: "Adventure",
    "young-adult": "Young adult",
    other: "Other",
  } as Record<string, string>,
  contentWarnings: "Content warnings",
  warningLabels: {
    Violence: "Violence",
    "Strong language": "Strong language",
    "Adult themes": "Adult themes",
    "Dark themes": "Dark themes",
    "Substance use": "Substance use",
    "Mental health": "Mental health",
    "Graphic content": "Graphic content",
  } as Record<string, string>,
  saving: "Saving…",
  saved: "✓ Saved",
  saveSettings: "Save settings",
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    publishTitle: (title: string) => `نشر «${title}»`,
    createDesc: "أنشئ صفحة عامة لقصتك. يمكن للقرّاء اكتشافها وقراءتها وترك ملاحظاتهم. بيانات استوديوك لا تُمس — يرى القرّاء نسخة منشورة مستقلة.",
    complete: "قصة مكتملة",
    serial: "تسلسلية (تُنشر الفصول تدريجيًا)",
    creating: "جارٍ الإنشاء…",
    createDraft: "إنشاء مسودة النشر",
    views: (count: string) => `المشاهدات: ${count}`,
    statusLabels: { draft: "مسودة", published: "منشور", unlisted: "غير مُدرج", archived: "مؤرشف" },
    typeLabels: { complete: "مكتملة", serial: "تسلسلية" },
    publish: "نشر",
    publishing: "جارٍ النشر…",
    unlisting: "جارٍ إلغاء الإدراج…",
    unlist: "إلغاء الإدراج",
    republish: "إعادة النشر",
    tabLabels: { overview: "نظرة عامة", chapters: "الفصول", settings: "الإعدادات" },
    taglineHeroEmpty: "أضف عبارة تعريفية وغلافًا من الإعدادات ليبرز قصتك في صفحة الاستكشاف.",
    pushFirst: "انشر فصلًا أولًا ←",
    publishNow: "🚀 انشر الآن",
    viewPublic: "عرض الصفحة العامة ↗",
    statStatus: "الحالة",
    statType: "النوع",
    statChapters: "الفصول المنشورة",
    statViews: "المشاهدات",
    chaptersPublished: (count: string) => count,
    taglineLabel: "العبارة التعريفية",
    pushFirstHint: "⚡ انشر فصلًا واحدًا على الأقل من تبويب الفصول قبل النشر.",
    chaptersIntro: "اختر فصولًا من الاستوديو لنشرها في صفحتك العامة. ينشئ النشر نسخة ثابتة — ولن تؤثر تعديلاتك اللاحقة في الاستوديو على ما يقرأه الجمهور حتى تنشر مجددًا.",
    chapterFallback: (number: string) => `الفصل ${number}`,
    publishedBadge: "منشور",
    pushChapters: (count: string) => `نشر الفصول المحددة (${count})`,
    pushing: "جارٍ النشر…",
    currentlyPublished: "المنشور حاليًا",
    version: (value: string) => `v${value}`,
    coverImage: "صورة الغلاف",
    coverAlt: "الغلاف",
    tagline: "العبارة التعريفية",
    taglinePlaceholder: "عبارة تعريفية جذابة لصفحة الاستكشاف…",
    genre: "التصنيف",
    selectGenre: "اختر التصنيف",
    genreNames: {
      fantasy: "فانتازيا",
      "sci-fi": "خيال علمي",
      thriller: "إثارة",
      romance: "رومانسية",
      literary: "أدبية",
      mystery: "غموض",
      horror: "رعب",
      historical: "تاريخية",
      adventure: "مغامرة",
      "young-adult": "يافعون",
      other: "أخرى",
    },
    contentWarnings: "تنبيهات المحتوى",
    warningLabels: {
      Violence: "العنف",
      "Strong language": "ألفاظ قوية",
      "Adult themes": "موضوعات للبالغين",
      "Dark themes": "مواضيع قاتمة",
      "Substance use": "تعاطي مواد",
      "Mental health": "الصحة النفسية",
      "Graphic content": "محتوى صريح",
    },
    saving: "جارٍ الحفظ…",
    saved: "✓ تم الحفظ",
    saveSettings: "حفظ الإعدادات",
  },
};

export default function PublishingHub({
  storyId, storyTitle, storyChapters,
}: PublishingHubProps) {
  const qc = useQueryClient();
  const { locale, formatNumber, formatDate } = useI18n();
  const c = COPY[locale];

  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "chapters">("overview");
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set());
  const [tagline, setTagline]   = useState("");
  const [genre, setGenre]       = useState("");
  const [releaseType, setRelType] = useState<"complete" | "serial">("complete");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: pubData, isLoading } = useQuery({
    queryKey: ["publication", storyId],
    queryFn: () => request<Publication | null>(`/v1/publish/${storyId}`),
  });

  const pub: Publication | null = pubData ?? null;

  const { data: pushedChapters = [] } = useQuery({
    queryKey: ["pub-chapters", pub?.id],
    queryFn: () =>
      pub ? request<PushedChapter[]>(`/v1/publish/${pub.id}/chapters`) : [],
    enabled: !!pub,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createPub = useMutation({
    mutationFn: () =>
      request("/v1/publish/", {
        method: "POST",
        body: JSON.stringify({ story_id: storyId, release_type: releaseType }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publication", storyId] }),
  });

  const updateSettings = useMutation({
    mutationFn: () =>
      request(`/v1/publish/${pub!.id}`, {
        method: "PUT",
        body: JSON.stringify({ tagline, genre, release_type: releaseType, content_warnings: warnings }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publication", storyId] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    },
  });

  const pushChapters = useMutation({
    mutationFn: () =>
      request(`/v1/publish/${pub!.id}/push`, {
        method: "POST",
        body: JSON.stringify({ chapter_numbers: Array.from(selectedChapters) }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pub-chapters", pub?.id] });
      qc.invalidateQueries({ queryKey: ["publication", storyId] });
      setSelectedChapters(new Set());
    },
  });

  const goLive = useMutation({
    mutationFn: () =>
      request(`/v1/publish/${pub!.id}/go-live`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publication", storyId] }),
  });

  const setCover = useMutation({
    mutationFn: (url: string | null) =>
      request(`/v1/publish/${pub!.id}`, { method: "PUT", body: JSON.stringify({ cover_image_url: url }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publication", storyId] }),
  });

  const unpublish = useMutation({
    mutationFn: () =>
      request(`/v1/publish/${pub!.id}/unpublish`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publication", storyId] }),
  });

  const toggleChapter = useCallback((num: number) => {
    setSelectedChapters(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }, []);

  const toggleWarning = (w: string) => {
    setWarnings(prev =>
      prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]
    );
  };

  const pushedNums = new Set(pushedChapters.map(pushed => pushed.chapter_number));

  const statusLabel = (value: string) => c.statusLabels[value] ?? value;
  const typeLabel = (value: string) => c.typeLabels[value] ?? value;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-ink-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No publication yet ────────────────────────────────────────────────────
  if (!pub) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <div className="text-4xl mb-4">📖</div>
        <h3 className="text-xl font-semibold text-ink-text mb-2">
          {c.publishTitle(storyTitle)}
        </h3>
        <p className="text-ink-text2 text-sm mb-8 leading-relaxed">
          {c.createDesc}
        </p>
        <div className="flex gap-3 justify-center mb-6">
          {(["complete", "serial"] as const).map(type => (
            <button
              key={type}
              onClick={() => setRelType(type)}
              className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                releaseType === type
                  ? "bg-ink-gold text-ink-bg border-ink-gold"
                  : "bg-transparent text-ink-text2 border-ink-text2/30 hover:border-ink-gold/50"
              }`}
            >
              {type === "complete" ? c.complete : c.serial}
            </button>
          ))}
        </div>
        <button
          onClick={() => createPub.mutate()}
          disabled={createPub.isPending}
          className="px-8 py-3 bg-ink-gold text-ink-bg rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {createPub.isPending ? c.creating : c.createDraft}
        </button>
      </div>
    );
  }

  // ── Has publication ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[pub.status]}`}>
            {statusLabel(pub.status)}
          </span>
          <span className="text-ink-text2 text-sm">
            {c.views(formatNumber(pub.view_count), pub.view_count === 1)}
          </span>
          {pub.status === "published" && (
            <a
              href={`/read/${pub.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ink-gold hover:underline"
            >
              /read/{pub.slug} ↗
            </a>
          )}
        </div>
        <div className="flex gap-2">
          {pub.status === "draft" && (
            <button
              onClick={() => goLive.mutate()}
              disabled={goLive.isPending || pushedChapters.length === 0}
              className="px-4 py-1.5 bg-ink-gold text-ink-bg text-sm rounded-lg font-medium hover:opacity-90 transition disabled:opacity-40"
            >
              {goLive.isPending ? c.publishing : c.publish}
            </button>
          )}
          {pub.status === "published" && (
            <button
              onClick={() => unpublish.mutate()}
              disabled={unpublish.isPending}
              className="px-4 py-1.5 border border-ink-text2/30 text-ink-text2 text-sm rounded-lg hover:border-red-400/50 hover:text-red-400 transition"
            >
              {unpublish.isPending ? c.unlisting : c.unlist}
            </button>
          )}
          {pub.status === "unlisted" && (
            <button
              onClick={() => goLive.mutate()}
              disabled={goLive.isPending}
              className="px-4 py-1.5 bg-ink-gold text-ink-bg text-sm rounded-lg font-medium hover:opacity-90 transition disabled:opacity-40"
            >
              {goLive.isPending ? c.publishing : c.republish}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink-text2/15">
        {(["overview", "chapters", "settings"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px ${
              activeTab === tab
                ? "border-ink-gold text-ink-gold"
                : "border-transparent text-ink-text2 hover:text-ink-text"
            }`}
          >
            {c.tabLabels[tab] ?? tab}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-3">
        {/* Cover + ready-to-publish hero */}
        <div className="flex flex-col sm:flex-row gap-4 items-start bg-ink-bg2 rounded-xl p-4 border border-ink-text2/10">
          <div className="w-28 shrink-0 rounded-lg overflow-hidden border border-ink-text2/15 bg-ink-surface2" style={{ aspectRatio: "3 / 4" }}>
            {mediaUrl(pub.cover_image_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(pub.cover_image_url)} alt={c.coverAlt} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-2xl">📖</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg text-ink-text">{storyTitle}</h3>
            <p className="text-sm text-ink-text2 mt-0.5">{pub.tagline ? `“${pub.tagline}”` : c.taglineHeroEmpty}</p>
            {pub.status === "draft" && (
              <button
                onClick={() => goLive.mutate()}
                disabled={goLive.isPending || pushedChapters.length === 0}
                className="mt-3 px-5 py-2.5 bg-ink-gold text-ink-bg rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-40"
              >
                {goLive.isPending ? c.publishing : pushedChapters.length === 0 ? c.pushFirst : c.publishNow}
              </button>
            )}
            {pub.status === "published" && (
              <a href={`/read/${pub.slug}`} target="_blank" rel="noopener noreferrer"
                 className="mt-3 inline-block px-5 py-2.5 bg-ink-gold text-ink-bg rounded-lg font-semibold hover:opacity-90 transition">
                {c.viewPublic}
              </a>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: c.statStatus,   value: statusLabel(pub.status) },
            { label: c.statType,     value: typeLabel(pub.release_type) },
            { label: c.statChapters, value: c.chaptersPublished(formatNumber(pushedChapters.length)) },
            { label: c.statViews,    value: formatNumber(pub.view_count) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-ink-bg2 rounded-xl p-4 border border-ink-text2/10">
              <div className="text-xs text-ink-text2 uppercase tracking-wide mb-1">{label}</div>
              <div className="text-ink-text font-semibold capitalize">{value}</div>
            </div>
          ))}
          {pub.tagline && (
            <div className="col-span-2 md:col-span-4 bg-ink-bg2 rounded-xl p-4 border border-ink-text2/10">
              <div className="text-xs text-ink-text2 uppercase tracking-wide mb-1">{c.taglineLabel}</div>
              <div className="text-ink-text text-sm italic">"{pub.tagline}"</div>
            </div>
          )}
          {pub.status === "draft" && pushedChapters.length === 0 && (
            <div className="col-span-2 md:col-span-4 bg-ink-gold/5 border border-ink-gold/20 rounded-xl p-4 text-sm text-ink-gold">
              {c.pushFirstHint}
            </div>
          )}
        </div>
        </div>
      )}

      {/* ── Chapters tab ── */}
      {activeTab === "chapters" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-text2">
            {c.chaptersIntro}
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
            {storyChapters.map(ch => {
              const isPushed  = pushedNums.has(ch.number);
              const isChecked = selectedChapters.has(ch.number);
              return (
                <label
                  key={ch.number}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    isChecked
                      ? "border-ink-gold/50 bg-ink-gold/5"
                      : "border-ink-text2/15 hover:border-ink-text2/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleChapter(ch.number)}
                    className="accent-ink-gold"
                  />
                  <span className="flex-1 text-sm text-ink-text">
                    <span className="text-ink-text2 me-2">#{formatNumber(ch.number)}</span>
                    {ch.title || c.chapterFallback(formatNumber(ch.number))}
                  </span>
                  {isPushed && (
                    <span className="text-xs text-ink-text2 border border-ink-text2/20 rounded px-2 py-0.5">
                      {c.publishedBadge}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <button
            onClick={() => pushChapters.mutate()}
            disabled={selectedChapters.size === 0 || pushChapters.isPending}
            className="px-5 py-2 bg-ink-gold text-ink-bg text-sm rounded-lg font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            {pushChapters.isPending
              ? c.pushing
              : c.pushChapters(formatNumber(selectedChapters.size), selectedChapters.size === 1)}
          </button>

          {pushedChapters.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-ink-text2 uppercase tracking-wide mb-2">
                {c.currentlyPublished}
              </div>
              <div className="space-y-1.5">
                {pushedChapters.map(pushed => (
                  <div
                    key={pushed.chapter_number}
                    className="flex justify-between items-center text-sm text-ink-text2 py-1"
                  >
                    <span>
                      #{formatNumber(pushed.chapter_number)} {pushed.title}
                      {pushed.version > 1 && (
                        <span className="ms-1 text-xs text-ink-gold">{c.version(formatNumber(pushed.version))}</span>
                      )}
                    </span>
                    <span className="text-xs">
                      {formatDate(pushed.pushed_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Settings tab ── */}
      {activeTab === "settings" && (
        <div className="space-y-5 max-w-lg">
          <div>
            <label className="block text-sm text-ink-text2 mb-2">{c.coverImage}</label>
            <CoverUploader
              value={pub.cover_image_url}
              onChange={(url) => setCover.mutate(url)}
              label=""
            />
          </div>
          <div>
            <label className="block text-sm text-ink-text2 mb-1.5">{c.tagline}</label>
            <textarea
              value={tagline || pub.tagline || ""}
              onChange={e => setTagline(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder={c.taglinePlaceholder}
              className="w-full bg-ink-bg2 border border-ink-text2/20 rounded-lg px-3 py-2.5 text-sm text-ink-text resize-none focus:outline-none focus:border-ink-gold/50 placeholder-ink-text2/50"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-text2 mb-1.5">{c.genre}</label>
            <select
              value={genre || pub.genre || ""}
              onChange={e => setGenre(e.target.value)}
              className="w-full bg-ink-bg2 border border-ink-text2/20 rounded-lg px-3 py-2.5 text-sm text-ink-text focus:outline-none focus:border-ink-gold/50"
            >
              <option value="">{c.selectGenre}</option>
              {GENRE_OPTIONS.map(g => (
                <option key={g} value={g}>{c.genreNames[g] ?? g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink-text2 mb-2">{c.contentWarnings}</label>
            <div className="flex flex-wrap gap-2">
              {WARNING_OPTIONS.map(w => (
                <button
                  key={w}
                  onClick={() => toggleWarning(w)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    warnings.includes(w) || (pub.content_warnings || []).includes(w)
                      ? "bg-red-500/10 text-red-400 border-red-400/30"
                      : "bg-transparent text-ink-text2 border-ink-text2/25 hover:border-ink-text2/50"
                  }`}
                >
                  {c.warningLabels[w] ?? w}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => updateSettings.mutate()}
            disabled={updateSettings.isPending}
            className="px-5 py-2 bg-ink-gold text-ink-bg text-sm rounded-lg font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            {updateSettings.isPending
              ? c.saving
              : settingsSaved
              ? c.saved
              : c.saveSettings}
          </button>
        </div>
      )}
    </div>
  );
}

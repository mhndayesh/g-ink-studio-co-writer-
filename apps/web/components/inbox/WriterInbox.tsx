"use client";
// apps/web/components/inbox/WriterInbox.tsx
//
// Writer's feedback dashboard. Shows ratings aggregate, pending reviews,
// and unread private notes across all publications.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface InboxStats {
  total_views: number;
  total_ratings: number;
  avg_rating: number | null;
  total_reviews: number;
  pending_reviews: number;
  total_notes: number;
  unread_notes: number;
  followers: number;
}

interface ReviewItem {
  id: string;
  reader_id: string;
  body: string;
  status: string;
  created_at: string;
  reader_display_name: string | null;
  publication_slug?: string;
  publication_title?: string;
}

interface NoteItem {
  id: string;
  reader_id: string;
  publication_id: string;
  chapter_number: number | null;
  passage_reference: string | null;
  body: string;
  writer_reply: string | null;
  replied_at: string | null;
  is_read_by_writer: boolean;
  created_at: string;
  reader_display_name: string | null;
}

interface InboxData {
  stats: InboxStats;
  pending_reviews: ReviewItem[];
  unread_notes: NoteItem[];
}

const COPY = {
  en: {
    justNow: "just now",
    minutesAgo: "{n}m ago",
    hoursAgo: "{n}h ago",
    daysAgo: "{n}d ago",
    noRatings: "No ratings yet",
    loadError: "Couldn’t load your reader feedback.",
    tryAgain: "Try again",
    title: "Reader Feedback",
    subtitle: "Ratings, reviews, and private notes from your readers.",
    tabLabels: { overview: "Overview", reviews: "Reviews", notes: "Notes" },
    totalViews: "Total views",
    ratings: "Ratings",
    followers: "Followers",
    reviews: "Reviews",
    pending: "{n} pending",
    averageRating: "Average rating",
    basedOn: "Based on {n} ratings",
    basedOnOne: "Based on 1 rating",
    reviewsWaiting: "Reviews waiting for approval: {n}",
    notesUnread: "Unread private notes: {n}",
    noActivity: "No reader activity yet.",
    publishToStart: "Publish your story to start receiving feedback.",
    noPending: "No pending reviews.",
    reviewsIntro: "Approve reviews to make them public. Declined reviews are invisible to readers (but counted in your transparency stats).",
    anonymousReader: "Anonymous reader",
    approve: "✓ Approve",
    decline: "Decline",
    noNotes: "No new private notes.",
    aReader: "A reader",
    chapterShort: "Ch. {n}",
    newBadge: "new",
    yourReply: "Your reply:",
    replyPlaceholder: "Your private reply…",
    sending: "Sending…",
    sendReply: "Send reply",
    cancel: "Cancel",
    replyPrivately: "Reply privately",
    markAsRead: "Mark as read",
  },
  ar: {
    justNow: "الآن",
    minutesAgo: "منذ {n} دقيقة",
    hoursAgo: "منذ {n} ساعة",
    daysAgo: "منذ {n} يوم",
    noRatings: "لا توجد تقييمات بعد",
    loadError: "تعذّر تحميل ملاحظات قرّائك.",
    tryAgain: "حاول مرة أخرى",
    title: "ملاحظات القرّاء",
    subtitle: "تقييمات ومراجعات وملاحظات خاصة من قرّائك.",
    tabLabels: { overview: "نظرة عامة", reviews: "المراجعات", notes: "الملاحظات" },
    totalViews: "إجمالي المشاهدات",
    ratings: "التقييمات",
    followers: "المتابعون",
    reviews: "المراجعات",
    pending: "قيد المراجعة: {n}",
    averageRating: "متوسط التقييم",
    basedOn: "استنادًا إلى {n} من التقييمات",
    basedOnOne: "استنادًا إلى تقييم واحد",
    reviewsWaiting: "مراجعات بانتظار الموافقة: {n}",
    notesUnread: "ملاحظات خاصة غير مقروءة: {n}",
    noActivity: "لا يوجد نشاط من القرّاء بعد.",
    publishToStart: "انشر قصتك لتبدأ بتلقّي الملاحظات.",
    noPending: "لا توجد مراجعات معلّقة.",
    reviewsIntro: "وافق على المراجعات لتظهر للجميع. المراجعات المرفوضة لا يراها القرّاء (لكنها تُحتسب في إحصاءات الشفافية لديك).",
    anonymousReader: "قارئ مجهول",
    approve: "✓ موافقة",
    decline: "رفض",
    noNotes: "لا توجد ملاحظات خاصة جديدة.",
    aReader: "أحد القرّاء",
    chapterShort: "الفصل {n}",
    newBadge: "جديدة",
    yourReply: "ردّك:",
    replyPlaceholder: "ردّك الخاص…",
    sending: "جارٍ الإرسال…",
    sendReply: "إرسال الرد",
    cancel: "إلغاء",
    replyPrivately: "ردّ بشكل خاص",
    markAsRead: "تحديد كمقروءة",
  },
} as const;

function arabicMinutes(n: number, formatted: string): string {
  if (n === 1) return "منذ دقيقة";
  if (n === 2) return "منذ دقيقتين";
  if (n >= 3 && n <= 10) return `منذ ${formatted} دقائق`;
  return `منذ ${formatted} دقيقة`;
}

function arabicHours(n: number, formatted: string): string {
  if (n === 1) return "منذ ساعة";
  if (n === 2) return "منذ ساعتين";
  if (n >= 3 && n <= 10) return `منذ ${formatted} ساعات`;
  return `منذ ${formatted} ساعة`;
}

function arabicDays(n: number, formatted: string): string {
  if (n === 1) return "منذ يوم";
  if (n === 2) return "منذ يومين";
  if (n >= 3 && n <= 10) return `منذ ${formatted} أيام`;
  return `منذ ${formatted} يومًا`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-ink-bg2 rounded-xl p-4 border border-ink-text2/10">
      <div className="text-xs text-ink-text2 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-ink-text">{value}</div>
      {sub && <div className="text-xs text-ink-text2 mt-0.5">{sub}</div>}
    </div>
  );
}

function StarBar({ avg, noRatings, formatNumber }: {
  avg: number | null;
  noRatings: string;
  formatNumber: (v: number, opts?: Intl.NumberFormatOptions) => string;
}) {
  if (!avg) return <span className="text-ink-text2 text-sm">{noRatings}</span>;
  const full = Math.round(avg);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
          <span key={s} className={`text-base ${s <= full ? "text-amber-400" : "text-ink-text2/30"}`}>★</span>
        ))}
      </div>
      <span className="text-ink-text font-semibold">
        {formatNumber(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </span>
    </div>
  );
}

function timeAgo(
  dateStr: string,
  locale: string,
  formatNumber: (v: number) => string,
  formatDate: (value: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string,
  c: typeof COPY.en | typeof COPY.ar,
): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2)   return c.justNow;
  if (minutes < 60)  return locale === "ar" ? arabicMinutes(minutes, formatNumber(minutes)) : c.minutesAgo.replace("{n}", formatNumber(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return locale === "ar" ? arabicHours(hours, formatNumber(hours)) : c.hoursAgo.replace("{n}", formatNumber(hours));
  const days = Math.floor(hours / 24);
  if (days < 30)     return locale === "ar" ? arabicDays(days, formatNumber(days)) : c.daysAgo.replace("{n}", formatNumber(days));
  return formatDate(dateStr);
}

export default function WriterInbox() {
  const qc = useQueryClient();
  const { locale, formatNumber, formatDate } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [tab, setTab] = useState<"overview" | "reviews" | "notes">("overview");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText]   = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inbox"],
    queryFn: () => request<InboxData>("/v1/inbox/"),
  });

  const approveReview = useMutation({
    mutationFn: (id: string) =>
      request(`/v1/social/reviews/${id}/approve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  const declineReview = useMutation({
    mutationFn: (id: string) =>
      request(`/v1/social/reviews/${id}/decline`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  const replyNote = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      request(`/v1/social/notes/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      setReplyingTo(null);
      setReplyText("");
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      request(`/v1/social/notes/${id}/read`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  if (isError) {
    // Without this, an errored query (data===undefined) falls into the spinner
    // branch below and spins forever. Show a retryable error instead.
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 text-sm text-ink-text2">
        <p>{c.loadError}</p>
        <button onClick={() => refetch()} className="btn btn-ghost">{c.tryAgain}</button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-5 h-5 border-2 border-ink-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stats, pending_reviews, unread_notes } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-ink-text">{c.title}</h2>
        <p className="text-sm text-ink-text2 mt-1">
          {c.subtitle}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink-text2/15">
        {(["overview", "reviews", "notes"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px flex items-center gap-2 ${
              tab === t
                ? "border-ink-gold text-ink-gold"
                : "border-transparent text-ink-text2 hover:text-ink-text"
            }`}
          >
            {c.tabLabels[t]}
            {t === "reviews" && stats.pending_reviews > 0 && (
              <span className="text-xs bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full">
                {formatNumber(stats.pending_reviews)}
              </span>
            )}
            {t === "notes" && stats.unread_notes > 0 && (
              <span className="text-xs bg-ink-gold/20 text-ink-gold px-1.5 py-0.5 rounded-full">
                {formatNumber(stats.unread_notes)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={c.totalViews} value={formatNumber(stats.total_views)} />
            <StatCard label={c.ratings} value={formatNumber(stats.total_ratings)} />
            <StatCard label={c.followers} value={formatNumber(stats.followers)} />
            <StatCard label={c.reviews} value={formatNumber(stats.total_reviews)}
                      sub={stats.pending_reviews > 0 ? c.pending.replace("{n}", formatNumber(stats.pending_reviews)) : undefined} />
          </div>

          {/* Rating display */}
          <div className="bg-ink-bg2 rounded-xl p-5 border border-ink-text2/10">
            <div className="text-xs text-ink-text2 uppercase tracking-wide mb-3">{c.averageRating}</div>
            <StarBar avg={stats.avg_rating} noRatings={c.noRatings} formatNumber={formatNumber} />
            {stats.total_ratings > 0 && (
              <p className="text-xs text-ink-text2 mt-2">
                {(stats.total_ratings === 1 ? c.basedOnOne : c.basedOn).replace("{n}", formatNumber(stats.total_ratings))}
              </p>
            )}
          </div>

          {/* Quick actions */}
          {(stats.pending_reviews > 0 || stats.unread_notes > 0) && (
            <div className="space-y-2">
              {stats.pending_reviews > 0 && (
                <button
                  onClick={() => setTab("reviews")}
                  className="w-full text-start flex justify-between items-center p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl hover:border-amber-400/40 transition"
                >
                  <span className="text-sm text-amber-300">
                    {c.reviewsWaiting.replace("{n}", formatNumber(stats.pending_reviews))}
                  </span>
                  <span className="text-amber-300 text-sm"><span className="rtl-flip inline-block">→</span></span>
                </button>
              )}
              {stats.unread_notes > 0 && (
                <button
                  onClick={() => setTab("notes")}
                  className="w-full text-start flex justify-between items-center p-4 bg-ink-gold/5 border border-ink-gold/20 rounded-xl hover:border-ink-gold/40 transition"
                >
                  <span className="text-sm text-ink-gold">
                    {c.notesUnread.replace("{n}", formatNumber(stats.unread_notes))}
                  </span>
                  <span className="text-ink-gold text-sm"><span className="rtl-flip inline-block">→</span></span>
                </button>
              )}
            </div>
          )}

          {stats.total_views === 0 && (
            <div className="text-center py-12 text-ink-text2">
              <div className="text-4xl mb-3">📖</div>
              <p className="text-sm">{c.noActivity}</p>
              <p className="text-xs mt-1 text-ink-text2/60">
                {c.publishToStart}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Reviews ── */}
      {tab === "reviews" && (
        <div className="space-y-3">
          {pending_reviews.length === 0 ? (
            <div className="text-center py-12 text-ink-text2">
              <div className="text-3xl mb-3">✓</div>
              <p className="text-sm">{c.noPending}</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-text2">
                {c.reviewsIntro}
              </p>
              {pending_reviews.map(review => (
                <div
                  key={review.id}
                  className="bg-ink-bg2 rounded-xl p-4 border border-ink-text2/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-text">
                      {review.reader_display_name || c.anonymousReader}
                    </span>
                    <span className="text-xs text-ink-text2">{timeAgo(review.created_at, locale, formatNumber, formatDate, c)}</span>
                  </div>
                  <p dir="auto" className="text-sm text-ink-text leading-relaxed">{review.body}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveReview.mutate(review.id)}
                      disabled={approveReview.isPending}
                      className="px-4 py-1.5 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition disabled:opacity-50"
                    >
                      {c.approve}
                    </button>
                    <button
                      onClick={() => declineReview.mutate(review.id)}
                      disabled={declineReview.isPending}
                      className="px-4 py-1.5 text-xs font-medium bg-transparent text-ink-text2 border border-ink-text2/20 rounded-lg hover:border-red-400/40 hover:text-red-400 transition disabled:opacity-50"
                    >
                      {c.decline}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Notes ── */}
      {tab === "notes" && (
        <div className="space-y-3">
          {unread_notes.length === 0 ? (
            <div className="text-center py-12 text-ink-text2">
              <div className="text-3xl mb-3">✉️</div>
              <p className="text-sm">{c.noNotes}</p>
            </div>
          ) : (
            unread_notes.map(note => (
              <div
                key={note.id}
                className={`bg-ink-bg2 rounded-xl p-4 border space-y-3 ${
                  note.is_read_by_writer
                    ? "border-ink-text2/10"
                    : "border-ink-gold/25"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-ink-text">
                        {note.reader_display_name || c.aReader}
                      </span>
                      {note.chapter_number && (
                        <span className="text-xs text-ink-text2 border border-ink-text2/20 rounded px-1.5 py-0.5">
                          {c.chapterShort.replace("{n}", formatNumber(note.chapter_number))}
                        </span>
                      )}
                      {!note.is_read_by_writer && (
                        <span className="text-xs bg-ink-gold/15 text-ink-gold rounded px-1.5 py-0.5">
                          {c.newBadge}
                        </span>
                      )}
                    </div>
                    {note.passage_reference && (
                      <blockquote dir="auto" className="text-xs italic text-ink-text2 border-s-2 border-ink-gold/40 ps-2 mb-2 line-clamp-2">
                        "{note.passage_reference}"
                      </blockquote>
                    )}
                    <p dir="auto" className="text-sm text-ink-text leading-relaxed">{note.body}</p>
                  </div>
                  <span className="text-xs text-ink-text2 shrink-0">
                    {timeAgo(note.created_at, locale, formatNumber, formatDate, c)}
                  </span>
                </div>

                {/* Writer's existing reply */}
                {note.writer_reply && (
                  <div className="ms-4 ps-3 border-s border-ink-gold/30">
                    <p className="text-xs text-ink-text2 mb-1">{c.yourReply}</p>
                    <p dir="auto" className="text-sm text-ink-text">{note.writer_reply}</p>
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={c.replyPlaceholder}
                      rows={3}
                      className="w-full bg-ink-bg border border-ink-text2/20 rounded-lg px-3 py-2 text-sm text-ink-text resize-none focus:outline-none focus:border-ink-gold/50 placeholder-ink-text2/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => replyNote.mutate({ id: note.id, reply: replyText })}
                        disabled={replyText.trim().length < 1 || replyNote.isPending}
                        className="px-4 py-1.5 text-xs bg-ink-gold text-ink-bg rounded-lg font-medium disabled:opacity-40 hover:opacity-90 transition"
                      >
                        {replyNote.isPending ? c.sending : c.sendReply}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(""); }}
                        className="px-4 py-1.5 text-xs text-ink-text2 hover:text-ink-text transition"
                      >
                        {c.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {!note.writer_reply && (
                      <button
                        onClick={() => {
                          setReplyingTo(note.id);
                          if (!note.is_read_by_writer) markRead.mutate(note.id);
                        }}
                        className="text-xs text-ink-gold hover:underline transition"
                      >
                        {c.replyPrivately}
                      </button>
                    )}
                    {!note.is_read_by_writer && (
                      <button
                        onClick={() => markRead.mutate(note.id)}
                        className="text-xs text-ink-text2 hover:text-ink-text transition"
                      >
                        {c.markAsRead}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

"use client";
// apps/web/components/reader/ReviewPanel.tsx
//
// Shows approved public reviews and a submission form for authenticated readers.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface Review {
  id: string;
  reader_id: string;
  body: string;
  status: string;
  approved_at: string | null;
  created_at: string;
  reader_display_name: string | null;
}

interface ReviewPanelProps {
  pubId: string;
  slug: string;
  isAuthenticated: boolean;
}

const COPY = {
  en: {
    today: "today",
    yesterday: "yesterday",
    daysAgo: "{n}d ago",
    monthsAgo: "{n}mo ago",
    yearsAgo: "{n}y ago",
    aReader: "A reader",
    showLess: "Show less",
    readMore: "Read more",
    reviews: "Reviews",
    writeReview: "+ Write review",
    approvalNote: "Your review will be visible to others once the author approves it.",
    submitError: "Could not submit review. Please try again.",
    placeholder: "Share your thoughts about this story…",
    cancel: "Cancel",
    submitting: "Submitting…",
    submit: "Submit",
    submitted: "✓ Review submitted — it will appear once the author approves it.",
    noReviews: "No reviews yet.",
    beFirst: "Be the first.",
  },
  ar: {
    today: "اليوم",
    yesterday: "أمس",
    daysAgo: "قبل {n} يوم",
    monthsAgo: "قبل {n} شهر",
    yearsAgo: "قبل {n} سنة",
    aReader: "أحد القرّاء",
    showLess: "عرض أقل",
    readMore: "اقرأ المزيد",
    reviews: "المراجعات",
    writeReview: "+ اكتب مراجعة",
    approvalNote: "ستظهر مراجعتك للآخرين بعد موافقة المؤلف عليها.",
    submitError: "تعذّر إرسال المراجعة. حاول مرة أخرى.",
    placeholder: "شاركنا رأيك في هذه القصة…",
    cancel: "إلغاء",
    submitting: "جارٍ الإرسال…",
    submit: "إرسال",
    submitted: "✓ تم إرسال المراجعة — وستظهر بعد موافقة المؤلف عليها.",
    noReviews: "لا توجد مراجعات بعد.",
    beFirst: "كن أول من يكتب.",
  },
} as const;

function arAgo(n: number, unit: "d" | "mo" | "y", formatted: string): string {
  if (unit === "d") {
    if (n === 1) return "منذ يوم";
    if (n === 2) return "منذ يومين";
    if (n <= 10) return `منذ ${formatted} أيام`;
    return `منذ ${formatted} يومًا`;
  }
  if (unit === "mo") {
    if (n === 1) return "منذ شهر";
    if (n === 2) return "منذ شهرين";
    if (n <= 10) return `منذ ${formatted} أشهر`;
    return `منذ ${formatted} شهرًا`;
  }
  if (n === 1) return "منذ سنة";
  if (n === 2) return "منذ سنتين";
  if (n <= 10) return `منذ ${formatted} سنوات`;
  return `منذ ${formatted} سنة`;
}

function timeAgo(
  dateStr: string,
  c: typeof COPY.en | typeof COPY.ar,
  locale: string,
  formatNumber: (v: number) => string,
): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return c.today;
  if (days === 1) return c.yesterday;
  if (days < 30) {
    const n = formatNumber(days);
    return locale === "ar" ? arAgo(days, "d", n) : c.daysAgo.replace("{n}", n);
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    const n = formatNumber(months);
    return locale === "ar" ? arAgo(months, "mo", n) : c.monthsAgo.replace("{n}", n);
  }
  const years = Math.floor(months / 12);
  const n = formatNumber(years);
  return locale === "ar" ? arAgo(years, "y", n) : c.yearsAgo.replace("{n}", n);
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const isLong = review.body.length > 280;
  const displayText = isLong && !expanded
    ? review.body.slice(0, 280) + "…"
    : review.body;

  return (
    <div className="py-5 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-200">
          {review.reader_display_name || c.aReader}
        </span>
        <span className="text-xs text-gray-600">
          {timeAgo(review.approved_at || review.created_at, c, locale, formatNumber)}
        </span>
      </div>
      <p dir="auto" className="text-sm text-gray-400 leading-relaxed">{displayText}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-1.5 text-xs text-amber-500/70 hover:text-amber-400 transition"
        >
          {expanded ? c.showLess : c.readMore}
        </button>
      )}
    </div>
  );
}

export default function ReviewPanel({ pubId, slug, isAuthenticated }: ReviewPanelProps) {
  const qc = useQueryClient();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [showForm, setShowForm]     = useState(false);
  const [body, setBody]             = useState("");
  const [submitted, setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", pubId],
    queryFn: () => request<Review[]>(`/v1/social/${pubId}/reviews`),
  });

  const submitReview = useMutation({
    mutationFn: () =>
      request(`/v1/social/${pubId}/review`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", pubId] });
      setSubmitted(true);
      setShowForm(false);
      setBody("");
      setSubmitError(null);
    },
    onError: (err: any) => {
      setSubmitError(err?.message || c.submitError);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          {c.reviews}
          {reviews.length > 0 && (
            <span className="ms-2 text-sm font-normal text-gray-500">
              ({formatNumber(reviews.length)})
            </span>
          )}
        </h2>
        {isAuthenticated && !submitted && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-amber-500/80 hover:text-amber-400 transition"
          >
            {c.writeReview}
          </button>
        )}
      </div>

      {/* Submission form */}
      {showForm && (
        <div className="bg-white/[0.03] rounded-xl border border-white/8 p-4 space-y-3">
          <p className="text-xs text-gray-500">
            {c.approvalNote}
          </p>
          {submitError && (
            <p className="text-xs text-red-400 bg-red-900/15 border border-red-700/20 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}
          <textarea
            value={body}
            onChange={e => { setBody(e.target.value); setSubmitError(null); }}
            placeholder={c.placeholder}
            rows={4}
            maxLength={1000}
            className="w-full bg-[#0D0B08] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-amber-400/30 transition"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{formatNumber(body.length)}/1000</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-1.5 text-xs text-gray-500 hover:text-white transition"
              >
                {c.cancel}
              </button>
              <button
                onClick={() => submitReview.mutate()}
                disabled={body.trim().length < 20 || submitReview.isPending}
                className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition disabled:opacity-40"
              >
                {submitReview.isPending ? c.submitting : c.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitted message */}
      {submitted && (
        <div className="bg-green-900/15 border border-green-700/20 rounded-xl p-3 text-sm text-green-400">
          {c.submitted}
        </div>
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-white/[0.03] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-600">
          {c.noReviews}
          {isAuthenticated && !showForm && !submitted && (
            <span>
              {" "}
              <button
                onClick={() => setShowForm(true)}
                className="text-amber-500/70 hover:text-amber-400 transition"
              >
                {c.beFirst}
              </button>
            </span>
          )}
        </div>
      ) : (
        <div>
          {reviews.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

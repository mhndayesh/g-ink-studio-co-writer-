"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BookmarkX, BookOpen } from "lucide-react";
import * as api from "@/lib/api";
import { useIsAuthed } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    justNow: "just now",
    minutesAgo: "{n}m ago",
    hoursAgo: "{n}h ago",
    daysAgo: "{n}d ago",
    upToChapter: "up to Ch. {n}",
    yourLibrary: "Your library",
    signInPrompt: "Sign in to save stories and get notified about new chapters.",
    signInCta: "Sign in",
    loadError: "Couldn’t load your saved stories (a loading error, not lost data).",
    tryAgain: "Try again",
    notifications: "Notifications",
    newCount: "({n} new)",
    markAllRead: "Mark all read",
    noNotifications: "No notifications yet. Follow a story to hear when it posts a new chapter.",
    savedStories: "Saved stories",
    unsave: "Unsave",
    continueReading: "Continue reading",
    finished: "Finished",
    emptyLibrary: "You haven’t saved or started any stories yet.",
    browseStories: "Browse stories",
  },
  ar: {
    justNow: "الآن",
    minutesAgo: "قبل {n} دقيقة",
    hoursAgo: "قبل {n} ساعة",
    daysAgo: "قبل {n} يوم",
    upToChapter: "حتى الفصل {n}",
    yourLibrary: "مكتبتك",
    signInPrompt: "سجّل الدخول لحفظ القصص وتلقّي إشعار عند نشر فصول جديدة.",
    signInCta: "تسجيل الدخول",
    loadError: "تعذّر تحميل قصصك المحفوظة (خطأ في التحميل، وليست بيانات مفقودة).",
    tryAgain: "حاول مرة أخرى",
    notifications: "الإشعارات",
    newCount: "({n} جديدة)",
    markAllRead: "تحديد الكل كمقروء",
    noNotifications: "لا توجد إشعارات بعد. تابع قصة لتصلك عند نشر فصل جديد.",
    savedStories: "القصص المحفوظة",
    unsave: "إلغاء الحفظ",
    continueReading: "متابعة القراءة",
    finished: "المكتملة",
    emptyLibrary: "لم تحفظ أي قصة أو تبدأ قراءتها بعد.",
    browseStories: "تصفّح القصص",
  },
} as const;

function arAgo(n: number, unit: "m" | "h" | "d", formatted: string): string {
  if (unit === "m") {
    if (n === 1) return "منذ دقيقة";
    if (n === 2) return "منذ دقيقتين";
    if (n <= 10) return `منذ ${formatted} دقائق`;
    return `منذ ${formatted} دقيقة`;
  }
  if (unit === "h") {
    if (n === 1) return "منذ ساعة";
    if (n === 2) return "منذ ساعتين";
    if (n <= 10) return `منذ ${formatted} ساعات`;
    return `منذ ${formatted} ساعة`;
  }
  if (n === 1) return "منذ يوم";
  if (n === 2) return "منذ يومين";
  if (n <= 10) return `منذ ${formatted} أيام`;
  return `منذ ${formatted} يومًا`;
}

function timeAgo(
  iso: string | null | undefined,
  c: typeof COPY.en | typeof COPY.ar,
  locale: string,
  formatNumber: (value: number) => string,
): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (mins < 1) return c.justNow;
  if (mins < 60) {
    const n = formatNumber(mins);
    return locale === "ar" ? arAgo(mins, "m", n) : c.minutesAgo.replace("{n}", n);
  }
  const hrs = Math.round(mins / 60);
  if (hrs < 24) {
    const n = formatNumber(hrs);
    return locale === "ar" ? arAgo(hrs, "h", n) : c.hoursAgo.replace("{n}", n);
  }
  const days = Math.round(hrs / 24);
  const n = formatNumber(days);
  return locale === "ar" ? arAgo(days, "d", n) : c.daysAgo.replace("{n}", n);
}

function BookCard({ item, action }: { item: any; action?: React.ReactNode }) {
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const cover = api.mediaUrl(item.cover_image_url);
  const resume = item.last_chapter > 0 ? `/read/${item.slug}/${item.last_chapter}` : `/read/${item.slug}`;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", overflow: "hidden", boxShadow: "var(--shadow)",
    }}>
      <Link href={resume} style={{ textDecoration: "none", display: "block" }}>
        <div style={{ aspectRatio: "3 / 4", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
          {cover
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <BookOpen size={28} style={{ color: "var(--muted)", opacity: 0.5 }} />}
        </div>
        <div style={{ padding: "10px 12px" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text)", lineHeight: 1.3 }}>{item.title}</h3>
          {item.completion > 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {formatNumber(Math.round(item.completion))}% · {c.upToChapter.replace("{n}", formatNumber(item.last_chapter))}
            </p>
          )}
        </div>
      </Link>
      {action && <div style={{ padding: "0 12px 12px" }}>{action}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 36 }}>
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", marginBottom: 14 }}>{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>{children}</div>;
}

export default function LibraryPage() {
  const authed = useIsAuthed();
  const qc = useQueryClient();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;

  const { data: lib, isError: libError, refetch: refetchLib } = useQuery({ queryKey: ["library"], queryFn: api.getMyLibrary, enabled: authed });
  const { data: notif } = useQuery({ queryKey: ["notifications"], queryFn: () => api.listNotifications({ limit: 30 }), enabled: authed });

  const markAll = useMutation({
    mutationFn: () => api.markNotificationsRead({ all: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["nav-unread"] });
    },
  });
  const unfollow = useMutation({
    mutationFn: (slug: string) => api.unfollowStory(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });

  if (!authed) {
    return (
      <div style={{ textAlign: "center", padding: "80px 16px", color: "var(--muted)" }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 22, marginBottom: 10, color: "var(--text)" }}>{c.yourLibrary}</p>
        <p style={{ marginBottom: 16 }}>{c.signInPrompt}</p>
        <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
          {c.signInCta} <span className="rtl-flip" style={{ display: "inline-block" }}>→</span>
        </Link>
      </div>
    );
  }

  const following = lib?.following || [];
  const inProgress = lib?.in_progress || [];
  const completed = lib?.completed || [];
  const notifs = notif?.items || [];
  const unread = notif?.unread_count || 0;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "40px clamp(16px,4vw,44px) 80px" }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30, color: "var(--text)", letterSpacing: "-0.01em" }}>{c.yourLibrary}</h1>

      {libError && (
        // Distinguish a failed fetch from a genuinely empty library.
        <div style={{ marginTop: 16, padding: "12px 16px", border: "1px solid var(--border)", borderRadius: "var(--r-md, 10px)", color: "var(--muted)", fontSize: 14 }}>
          {c.loadError}{" "}
          <button onClick={() => refetchLib()} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {c.tryAgain}
          </button>
        </div>
      )}

      {/* Notifications */}
      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={18} /> {c.notifications} {unread > 0 && <span style={{ fontSize: 12, color: "var(--accent)" }}>{c.newCount.replace("{n}", formatNumber(unread))}</span>}
          </h2>
          {unread > 0 && (
            <button onClick={() => markAll.mutate()} disabled={markAll.isPending}
              style={{ fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}>
              {c.markAllRead}
            </button>
          )}
        </div>
        {notifs.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{c.noNotifications}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {notifs.map((n: any) => (
              <Link key={n.id} href={n.link || "#"} style={{
                textDecoration: "none", display: "block",
                background: n.read ? "transparent" : "var(--accent-soft)",
                border: "1px solid var(--border)", borderRadius: "var(--r-md, 10px)",
                padding: "10px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 14, color: "var(--text)", fontWeight: n.read ? 400 : 600 }}>{n.title}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{timeAgo(n.created_at, c, locale, formatNumber)}</span>
                </div>
                {n.body && <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{n.body}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      {following.length > 0 && (
        <Section title={c.savedStories}>
          <Grid>
            {following.map((it: any) => (
              <BookCard key={it.slug} item={it} action={
                <button onClick={() => unfollow.mutate(it.slug)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", cursor: "pointer", width: "100%", justifyContent: "center" }}>
                  <BookmarkX size={13} /> {c.unsave}
                </button>
              } />
            ))}
          </Grid>
        </Section>
      )}

      {inProgress.length > 0 && (
        <Section title={c.continueReading}><Grid>{inProgress.map((it: any) => <BookCard key={it.slug} item={it} />)}</Grid></Section>
      )}

      {completed.length > 0 && (
        <Section title={c.finished}><Grid>{completed.map((it: any) => <BookCard key={it.slug} item={it} />)}</Grid></Section>
      )}

      {following.length === 0 && inProgress.length === 0 && completed.length === 0 && (
        <p style={{ color: "var(--muted)", marginTop: 32 }}>
          {c.emptyLibrary}{" "}
          <Link href="/" style={{ color: "var(--accent)", fontWeight: 600 }}>
            {c.browseStories} <span className="rtl-flip" style={{ display: "inline-block" }}>→</span>
          </Link>
        </p>
      )}
    </main>
  );
}

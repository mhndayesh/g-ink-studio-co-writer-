"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import * as api from "@/lib/api";
import { useIsAuthed } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    chaptersShort: "{n} ch.",
    reads: "{n} reads",
    profileNotFound: "Profile not found",
    backToHub: "Back to hub",
    displayName: "Display name",
    yourName: "Your name",
    bio: "Bio",
    bioLimit: "(max 500 chars)",
    bioPlaceholder: "A few words about yourself…",
    publicProfile: "Public profile",
    publicHint: "— anyone can view your profile page",
    privateHint: "— only you can see this page",
    saving: "Saving…",
    save: "Save",
    cancel: "Cancel",
    editProfile: "Edit profile",
    published: "published",
    totalReads: "total reads",
    myStudio: "My Studio",
    yourPublishedStories: "Your published stories",
    storiesBy: "Stories by {name}",
    nothingPublished: "Nothing published yet.",
    noPublishedStories: "No published stories yet.",
    goToMyStudio: "Go to My Studio",
  },
  ar: {
    chaptersShort: "الفصول: {n}",
    reads: "القراءات: {n}",
    profileNotFound: "الملف الشخصي غير موجود",
    backToHub: "العودة إلى الرئيسية",
    displayName: "اسم العرض",
    yourName: "اسمك",
    bio: "نبذة",
    bioLimit: "(بحد أقصى 500 حرف)",
    bioPlaceholder: "بضع كلمات عنك…",
    publicProfile: "ملف شخصي عام",
    publicHint: "— يمكن لأي شخص عرض صفحة ملفك الشخصي",
    privateHint: "— أنت فقط من يستطيع رؤية هذه الصفحة",
    saving: "جارٍ الحفظ…",
    save: "حفظ",
    cancel: "إلغاء",
    editProfile: "تعديل الملف الشخصي",
    published: "منشورة",
    totalReads: "إجمالي القراءات",
    myStudio: "استوديوي",
    yourPublishedStories: "قصصك المنشورة",
    storiesBy: "قصص {name}",
    nothingPublished: "لم يُنشر شيء بعد.",
    noPublishedStories: "لا توجد قصص منشورة بعد.",
    goToMyStudio: "الانتقال إلى استوديوي",
  },
} as const;

const GENRES: Record<string, { en: string; ar: string }> = {
  fantasy: { en: "Fantasy", ar: "فانتازيا" },
  "sci-fi": { en: "Sci-Fi", ar: "خيال علمي" },
  scifi: { en: "Sci-Fi", ar: "خيال علمي" },
  mystery: { en: "Mystery", ar: "غموض" },
  thriller: { en: "Thriller", ar: "إثارة" },
  romance: { en: "Romance", ar: "رومانسية" },
  historical: { en: "Historical", ar: "تاريخية" },
  horror: { en: "Horror", ar: "رعب" },
  literary: { en: "Literary", ar: "أدبية" },
  adventure: { en: "Adventure", ar: "مغامرة" },
  other: { en: "Other", ar: "أخرى" },
};

function genreLabel(value: string, locale: string): string {
  const hit = GENRES[value.trim().toLowerCase()];
  if (!hit) return value;
  return locale === "ar" ? hit.ar : hit.en;
}

function InitialAvatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: "var(--accent-soft)",
      border: "2px solid var(--border)",
      display: "grid", placeItems: "center",
      color: "var(--accent)",
      fontFamily: "var(--font-serif)",
      fontSize: size * 0.38,
      fontWeight: 600,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function StoryCard({ story, slug }: { story: any; slug: string }) {
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const initials = (story.story_title || "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

  return (
    <Link href={`/read/${slug}`} style={{ textDecoration: "none", display: "block" }}>
      <article style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow)",
        transition: "border-color 0.2s, transform 0.15s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
      >
        {/* Cover placeholder */}
        <div style={{
          height: 120, background: "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderBottom: "1px solid var(--border)",
        }}>
          {story.cover_image_url
            ? <img src={story.cover_image_url} alt={story.story_title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontFamily: "var(--font-serif)", fontSize: 36, color: "var(--accent)", opacity: 0.3, fontWeight: 600 }}>{initials}</span>
          }
        </div>

        <div style={{ padding: "12px 14px 14px" }}>
          {story.genre && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--accent)",
              background: "var(--accent-soft)", padding: "2px 7px",
              borderRadius: 4, display: "inline-block", marginBottom: 8,
            }}>{genreLabel(story.genre, locale)}</span>
          )}
          <h3 style={{
            fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500,
            color: "var(--text)", marginBottom: 4, lineHeight: 1.3,
          }}>
            {story.story_title}
          </h3>
          {story.tagline && (
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 10,
              overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
            }}>
              {story.tagline}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>
            <span>{c.chaptersShort.replace("{n}", formatNumber(story.total_chapters ?? 0))}</span>
            <span>·</span>
            <span>{c.reads.replace("{n}", formatNumber(story.view_count || 0))}</span>
            {story.avg_rating && <><span>·</span><span>★ {formatNumber(story.avg_rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span></>}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function ProfilePage() {
  const params   = useParams<{ userId: string }>();
  const qc       = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft,  setDraft]  = useState({ display_name: "", bio: "", profile_public: true });

  const authed = useIsAuthed();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;

  // Resolve the signed-in user to know whether this is my own profile page.
  const { data: myProfile } = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => api.getMyProfile(),
    enabled: authed,
    staleTime: 5 * 60 * 1000,
  });
  const isMe = !!myProfile && myProfile.id === params.userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", params.userId],
    queryFn: () => api.getPublicProfile(params.userId),
  });

  const save = useMutation({
    mutationFn: () => api.updateMyProfile({ display_name: draft.display_name, bio: draft.bio, profile_public: draft.profile_public }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); qc.invalidateQueries({ queryKey: ["me", "profile"] }); setEditing(false); },
  });

  function startEdit() {
    setDraft({
      display_name: profile?.display_name || "",
      bio: profile?.bio || "",
      profile_public: profile?.profile_public ?? true,
    });
    setEditing(true);
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px clamp(16px,4vw,44px)" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--surface-2)", animation: "pulse 1.5s infinite" }} />
          <div style={{ flex: 1, display: "grid", gap: 10 }}>
            <div style={{ height: 24, width: 180, background: "var(--surface-2)", borderRadius: 6, animation: "pulse 1.5s infinite" }} />
            <div style={{ height: 16, width: 280, background: "var(--surface-2)", borderRadius: 6, animation: "pulse 1.5s infinite" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: "center", padding: "80px 16px", color: "var(--muted)" }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 24, marginBottom: 8 }}>{c.profileNotFound}</p>
        <Link href="/" style={{ color: "var(--accent)", fontWeight: 600 }}>
          <span className="rtl-flip" style={{ display: "inline-block" }}>←</span> {c.backToHub}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px clamp(16px,4vw,44px) 80px" }}>

      {/* Profile header */}
      <div style={{
        display: "flex", gap: 24, alignItems: "flex-start",
        paddingBottom: 32, marginBottom: 32,
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap",
      }}>
        <InitialAvatar name={profile.display_name} size={72} />

        <div style={{ flex: 1, minWidth: 200 }}>
          {editing ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label className="label">{c.displayName}</label>
                <input
                  className="input"
                  value={draft.display_name}
                  onChange={e => setDraft(d => ({ ...d, display_name: e.target.value }))}
                  placeholder={c.yourName}
                />
              </div>
              <div>
                <label className="label">{c.bio} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10 }}>{c.bioLimit}</span></label>
                <textarea
                  className="input"
                  rows={3}
                  maxLength={500}
                  value={draft.bio}
                  onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                  placeholder={c.bioPlaceholder}
                  style={{ resize: "vertical" }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={draft.profile_public}
                  onChange={e => setDraft(d => ({ ...d, profile_public: e.target.checked }))}
                />
                <span>
                  {c.publicProfile}
                  <span style={{ color: "var(--muted)", marginInlineStart: 6 }}>
                    {draft.profile_public ? c.publicHint : c.privateHint}
                  </span>
                </span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="iw-btn primary"
                  style={{ fontSize: 13, padding: "7px 16px" }}
                >
                  {save.isPending ? c.saving : c.save}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="iw-btn ghost"
                  style={{ fontSize: 13, padding: "7px 16px" }}
                >
                  {c.cancel}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h1 style={{
                  fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 500,
                  color: "var(--text)", letterSpacing: "-0.01em",
                }}>
                  {profile.display_name}
                </h1>
                {isMe && (
                  <button
                    onClick={startEdit}
                    className="iw-btn ghost"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                  >
                    {c.editProfile}
                  </button>
                )}
              </div>

              {profile.bio && (
                <p dir="auto" style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, lineHeight: 1.6, maxWidth: "52ch" }}>
                  {profile.bio}
                </p>
              )}

              {/* Stats row */}
              <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                {[
                  { val: formatNumber(profile.story_count ?? 0), label: c.published },
                  { val: formatNumber(profile.total_reads || 0), label: c.totalReads },
                ].map(s => (
                  <div key={s.label}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
                      {s.val}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--faint)", marginInlineStart: 6 }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {isMe && (
                <div style={{ marginTop: 12 }}>
                  <Link href="/studio" className="iw-btn secondary" style={{ fontSize: 12, padding: "5px 12px" }}>
                    {c.myStudio} <span className="rtl-flip" style={{ display: "inline-block" }}>→</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Published stories */}
      <div>
        <h2 style={{
          fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500,
          color: "var(--text)", marginBottom: 20,
        }}>
          {isMe ? c.yourPublishedStories : c.storiesBy.replace("{name}", profile.display_name)}
        </h2>

        {!profile.stories?.length ? (
          <div style={{
            textAlign: "center", padding: "48px 16px",
            color: "var(--faint)",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--r-lg)",
          }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 17, marginBottom: 8 }}>
              {isMe ? c.nothingPublished : c.noPublishedStories}
            </p>
            {isMe && (
              <Link href="/studio" style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14 }}>
                {c.goToMyStudio} <span className="rtl-flip" style={{ display: "inline-block" }}>→</span>
              </Link>
            )}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}>
            {profile.stories.map((story: any) => (
              <StoryCard key={story.id} story={story} slug={story.slug} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}

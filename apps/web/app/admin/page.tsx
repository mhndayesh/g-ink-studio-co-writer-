"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useEntitlement } from "@/lib/useEntitlement";
import { ActAsControl } from "@/components/billing/ActAsControl";
import { useI18n, type Locale } from "@/lib/i18n";

const copyEn = {
  periods: [
    { days: 30, label: "1 month" },
    { days: 90, label: "3 months" },
    { days: 180, label: "6 months" },
    { days: 365, label: "1 year" },
    { days: null, label: "Lifetime" },
  ] as { days: number | null; label: string }[],
  lifetime: "Lifetime",
  daysCount: (days: string) => `${days} days`,
  tierNames: {
    free: "Free trial",
    dev_ai: "Plus",
    byok: "Bring Your Own Key",
    owner: "Owner",
  } as Record<string, string>,
  accessDenied: "Access denied",
  restricted: "This area is restricted to site owners.",
  panelTitle: "⚙ Admin panel",
  panelSubtitle: "Owner-only. Your account has unlimited access to all services.",
  promoTitle: "🎟 Promo / gift codes",
  promoDesc: "Mint a code that grants a paid tier for a period. Share it; users redeem it in Settings.",
  tierPlus: "Plus (dev_ai)",
  tierByok: "Bring Your Own Key (byok)",
  maxUses: "Max uses (blank = ∞)",
  customCode: "Custom code (blank = auto-generate)",
  note: "Note (e.g. Beta testers)",
  generating: "Generating…",
  generate: "Generate code",
  noCodes: "No codes yet.",
  copyCode: "Copy code",
  codeMeta: (tier: string, duration: string, used: string, max: string) => `${tier} · ${duration} · ${used}/${max} used`,
  deactivate: "Deactivate",
  inactive: "inactive",
  yourAccount: "Your account",
  email: "Email",
  displayName: "Display name",
  userId: "User ID",
  plan: "Plan",
  meteredQ: "Metered?",
  yes: "yes",
  noUnlimited: "no — unlimited",
  no: "no",
  actionsUsedCap: "Actions used / cap",
  tokensUsedCap: "Tokens used / cap",
  lookupTitle: "Look up any user",
  userIdPlaceholder: "User ID (from their profile URL or DB)",
  lookUp: "Look up",
  loading: "Loading…",
  notFound: "User not found or access denied.",
  planTier: "Plan tier",
  planStatus: "Plan status",
  keySource: "Key source",
  actionsUsed: "Actions used",
  tokensUsed: "Tokens used",
  caps: "Cap — actions / tokens",
  setPlan: "Set plan",
  applyPlan: "Apply plan",
  saving: "Saving…",
  planSetTo: (tier: string) => `Plan set to ${tier}`,
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    periods: [
      { days: 30, label: "شهر واحد" },
      { days: 90, label: "3 أشهر" },
      { days: 180, label: "6 أشهر" },
      { days: 365, label: "سنة واحدة" },
      { days: null, label: "مدى الحياة" },
    ],
    lifetime: "مدى الحياة",
    daysCount: (days: string) => `${days} يومًا`,
    tierNames: {
      free: "تجربة مجانية",
      dev_ai: "بلس",
      byok: "مفتاحك الخاص",
      owner: "مالك",
    },
    accessDenied: "تم رفض الوصول",
    restricted: "هذه المنطقة مخصّصة لمالكي الموقع فقط.",
    panelTitle: "⚙ لوحة الإدارة",
    panelSubtitle: "للمالك فقط. يتمتع حسابك بوصول غير محدود إلى جميع الخدمات.",
    promoTitle: "🎟 رموز الترويج والهدايا",
    promoDesc: "أنشئ رمزًا يمنح خطة مدفوعة لمدة محددة، وشاركه ليفعّله المستخدمون من الإعدادات.",
    tierPlus: "بلس (dev_ai)",
    tierByok: "مفتاحك الخاص (byok)",
    maxUses: "الحد الأقصى للاستخدام (فارغ = ∞)",
    customCode: "رمز مخصص (فارغ = توليد تلقائي)",
    note: "ملاحظة (مثل: مختبِرون تجريبيون)",
    generating: "جارٍ التوليد…",
    generate: "توليد الرمز",
    noCodes: "لا توجد رموز بعد.",
    copyCode: "نسخ الرمز",
    codeMeta: (tier: string, duration: string, used: string, max: string) => `${tier} · ${duration} · المستخدم: ${used}/${max}`,
    deactivate: "إيقاف",
    inactive: "غير مفعّل",
    yourAccount: "حسابك",
    email: "البريد الإلكتروني",
    displayName: "اسم العرض",
    userId: "معرّف المستخدم",
    plan: "الخطة",
    meteredQ: "محاسب على الاستخدام؟",
    yes: "نعم",
    noUnlimited: "لا — بلا حدود",
    no: "لا",
    actionsUsedCap: "الإجراءات المستخدمة / الحد",
    tokensUsedCap: "الرموز المستخدمة / الحد",
    lookupTitle: "البحث عن مستخدم",
    userIdPlaceholder: "معرّف المستخدم (من رابط ملفه أو قاعدة البيانات)",
    lookUp: "بحث",
    loading: "جارٍ التحميل…",
    notFound: "لم يُعثر على المستخدم أو لا تملك صلاحية الوصول.",
    planTier: "فئة الخطة",
    planStatus: "حالة الخطة",
    keySource: "مصدر المفتاح",
    actionsUsed: "الإجراءات المستخدمة",
    tokensUsed: "الرموز المستخدمة",
    caps: "الحد — الإجراءات / الرموز",
    setPlan: "تعيين الخطة",
    applyPlan: "تطبيق الخطة",
    saving: "جارٍ الحفظ…",
    planSetTo: (tier: string) => `تم تعيين الخطة إلى ${tier}`,
  },
};

const css = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    padding: "clamp(24px, 5vw, 56px) clamp(16px, 6vw, 44px)",
    fontFamily: "var(--font-sans)",
  } as React.CSSProperties,
  inner: { maxWidth: 820, margin: "0 auto" } as React.CSSProperties,
  h1: {
    fontSize: "clamp(22px, 3.5vw, 30px)", fontWeight: 700,
    color: "var(--text)", margin: "0 0 6px",
    fontFamily: "var(--font-serif)",
  } as React.CSSProperties,
  sub: { fontSize: 14, color: "var(--muted)", margin: "0 0 36px" } as React.CSSProperties,
  card: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 12, padding: "24px 28px", marginBottom: 20,
  } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--muted)", textTransform: "uppercase" as const, marginBottom: 8, display: "block" },
  h2: { fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 18px" } as React.CSSProperties,
  row: { display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center" },
  input: {
    flex: 1, minWidth: 200,
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--bg)",
    color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 14,
    outline: "none",
  } as React.CSSProperties,
  select: {
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--bg)",
    color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: 14,
  } as React.CSSProperties,
  btn: (accent = false) => ({
    padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer",
    fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700,
    background: accent ? "var(--accent)" : "var(--surface-raised)",
    color: accent ? "var(--accent-text)" : "var(--text)",
    transition: "filter 0.15s",
  } as React.CSSProperties),
  kv: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  key: { fontSize: 13, color: "var(--muted)" } as React.CSSProperties,
  val: { fontSize: 13, fontWeight: 600, color: "var(--text)" } as React.CSSProperties,
  badge: (tier: string) => ({
    display: "inline-block", padding: "2px 10px", borderRadius: 99,
    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const,
    background: tier === "owner" || tier === "dev_ai" ? "color-mix(in oklab, var(--accent) 18%, transparent)" : "var(--surface-raised)",
    color: tier === "owner" || tier === "dev_ai" ? "var(--accent)" : "var(--muted)",
    border: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)",
  }),
  err: { color: "var(--red)", fontSize: 13, marginTop: 8 } as React.CSSProperties,
  ok: { color: "var(--green, #4ade80)", fontSize: 13, marginTop: 8 } as React.CSSProperties,
};

export default function AdminPage() {
  // Owner-ness comes from the backend entitlement (is_admin or ADMIN_EMAILS) —
  // the same source the API enforces — not a hardcoded email. `isRealOwner`
  // stays true even while shape-shifted into another tier for testing.
  const { isRealOwner, isLoading } = useEntitlement();
  const { locale } = useI18n();
  const c = COPY[locale];

  const { data: profile } = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => api.getMyProfile(),
    enabled: isRealOwner,
    staleTime: 60_000,
  });

  if (isLoading) return null;

  if (!isRealOwner) {
    return (
      <div style={css.page}>
        <div style={css.inner}>
          <h1 style={css.h1}>{c.accessDenied}</h1>
          <p style={css.sub}>{c.restricted}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={css.page}>
      <div style={css.inner}>
        <h1 style={css.h1}>{c.panelTitle}</h1>
        <p style={css.sub}>{c.panelSubtitle}</p>

        <div style={css.card}><ActAsControl /></div>
        <OwnerUsageCard profile={profile} />
        <UserLookupCard />
        <PromoCodesCard />
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "var(--accent)", color: "var(--accent-text)",
  fontWeight: 700, fontSize: 13, cursor: "pointer",
};

function PromoCodesCard() {
  const qc = useQueryClient();
  const { locale, formatNumber } = useI18n();
  const c = COPY[locale];
  const [tier, setTier] = useState<"dev_ai" | "byok">("dev_ai");
  const [days, setDays] = useState<string>("30");   // "lifetime" sentinel
  const [maxUses, setMaxUses] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const { data: codes = [] } = useQuery({ queryKey: ["admin", "codes"], queryFn: api.adminListCodes });

  const create = useMutation({
    mutationFn: () => api.adminCreateCode({
      tier,
      duration_days: days === "lifetime" ? null : Number(days),
      max_uses: maxUses.trim() ? Number(maxUses) : null,
      note: note.trim() || undefined,
      code: code.trim() || null,
    }),
    onSuccess: () => { setCode(""); setNote(""); setMaxUses(""); qc.invalidateQueries({ queryKey: ["admin", "codes"] }); },
    onError: (e: any) => alert(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.adminDeactivateCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "codes"] }),
  });

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  const durationLabel = (value: number | null) =>
    value == null ? c.lifetime : c.periods.find(p => p.days === value)?.label ?? c.daysCount(formatNumber(value));

  return (
    <div style={css.card}>
      <h2 style={css.h2}>{c.promoTitle}</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "-10px 0 16px" }}>
        {c.promoDesc}
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={css.row}>
          <select style={css.select} value={tier} onChange={e => setTier(e.target.value as "dev_ai" | "byok")}>
            <option value="dev_ai">{c.tierPlus}</option>
            <option value="byok">{c.tierByok}</option>
          </select>
          <select style={css.select} value={days} onChange={e => setDays(e.target.value)}>
            {c.periods.map(p => <option key={p.label} value={p.days === null ? "lifetime" : String(p.days)}>{p.label}</option>)}
          </select>
          <input style={css.input} placeholder={c.maxUses} value={maxUses}
            onChange={e => setMaxUses(e.target.value.replace(/[^0-9]/g, ""))} />
        </div>
        <div style={css.row}>
          <input style={{ ...css.input, flex: 1 }} placeholder={c.customCode} value={code} onChange={e => setCode(e.target.value)} />
          <input style={{ ...css.input, flex: 1 }} placeholder={c.note} value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div>
          <button style={btnPrimary} disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? c.generating : c.generate}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
        {codes.length === 0 && <p style={css.key}>{c.noCodes}</p>}
        {codes.map((item: any) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid var(--border)", opacity: item.active ? 1 : 0.5 }}>
            <button onClick={() => copy(item.code)} title={c.copyCode}
              style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {item.code}{copied === item.code ? " ✓" : ""}
            </button>
            <span style={css.key}>
              {c.codeMeta(
                c.tierNames[item.tier] ?? item.tier,
                durationLabel(item.duration_days),
                formatNumber(item.uses),
                item.max_uses == null ? "∞" : formatNumber(item.max_uses),
              )}
            </span>
            {item.note && <span style={{ ...css.key, fontStyle: "italic" }}>“{item.note}”</span>}
            <div style={{ flex: 1 }} />
            {item.active
              ? <button onClick={() => deactivate.mutate(item.id)}
                  style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                  {c.deactivate}
                </button>
              : <span style={css.key}>{c.inactive}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnerUsageCard({ profile }: { profile: any }) {
  const { locale, formatNumber } = useI18n();
  const c = COPY[locale];
  const { data: usage } = useQuery({
    queryKey: ["admin", "usage", profile?.id],
    queryFn: () => api.adminGetUserUsage(profile.id),
    enabled: !!profile?.id,
  });

  if (!profile) return null;

  const tierKey: string = usage?.effective_tier ?? "owner";

  return (
    <div style={css.card}>
      <h2 style={css.h2}>{c.yourAccount}</h2>
      <div style={css.kv}>
        <span style={css.key}>{c.email}</span>
        <span style={css.val}>{profile.email}</span>
      </div>
      <div style={css.kv}>
        <span style={css.key}>{c.displayName}</span>
        <span style={css.val}>{profile.display_name}</span>
      </div>
      <div style={css.kv}>
        <span style={css.key}>{c.userId}</span>
        <span style={{ ...css.val, fontFamily: "monospace", fontSize: 12 }}>{profile.id}</span>
      </div>
      <div style={css.kv}>
        <span style={css.key}>{c.plan}</span>
        <span style={css.badge(tierKey)}>
          {c.tierNames[tierKey] ?? tierKey} · {usage?.key_source ?? "server"}
        </span>
      </div>
      <div style={css.kv}>
        <span style={css.key}>{c.meteredQ}</span>
        <span style={css.val}>{usage?.metered ? c.yes : c.noUnlimited}</span>
      </div>
      {usage?.metered && (
        <>
          <div style={css.kv}>
            <span style={css.key}>{c.actionsUsedCap}</span>
            <span style={css.val}>{formatNumber(usage.usage.actions_used)} / {usage.limits.max_actions == null ? "∞" : formatNumber(usage.limits.max_actions)}</span>
          </div>
          <div style={css.kv}>
            <span style={css.key}>{c.tokensUsedCap}</span>
            <span style={css.val}>{formatNumber(usage.usage.tokens_used)} / {usage.limits.max_tokens == null ? "∞" : formatNumber(usage.limits.max_tokens)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function UserLookupCard() {
  const { locale, formatNumber } = useI18n();
  const c = COPY[locale];
  const [userId, setUserId] = useState("");
  const [queried, setQueried] = useState("");
  const [tier, setTier] = useState<"free" | "dev_ai" | "byok">("dev_ai");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: usage, isLoading, error } = useQuery({
    queryKey: ["admin", "usage", queried],
    queryFn: () => api.adminGetUserUsage(queried),
    enabled: !!queried,
    retry: false,
  });

  const setPlan = useMutation({
    mutationFn: () => api.adminSetUserPlan(queried, tier, "active"),
    onSuccess: (res) => {
      const applied: string = res.user?.plan_tier ?? tier;
      setMsg({ ok: true, text: c.planSetTo(c.tierNames[applied] ?? applied) });
    },
    onError: (e: any) => setMsg({ ok: false, text: e.message }),
  });

  const tierLabel = (key: string) => `${c.tierNames[key] ?? key} (${key})`;

  return (
    <div style={css.card}>
      <h2 style={css.h2}>{c.lookupTitle}</h2>

      <div style={css.row}>
        <input
          style={css.input}
          placeholder={c.userIdPlaceholder}
          value={userId}
          onChange={e => setUserId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setQueried(userId.trim())}
        />
        <button style={css.btn(true)} onClick={() => { setQueried(userId.trim()); setMsg(null); }}>
          {c.lookUp}
        </button>
      </div>

      {isLoading && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>{c.loading}</p>}
      {error && <p style={css.err}>{c.notFound}</p>}

      {usage && (
        <div style={{ marginTop: 18 }}>
          <div style={css.kv}>
            <span style={css.key}>{c.planTier}</span>
            <span style={css.badge(usage.effective_tier)}>{tierLabel(usage.effective_tier)}</span>
          </div>
          <div style={css.kv}>
            <span style={css.key}>{c.planStatus}</span>
            <span style={css.val}>{usage.plan_status}</span>
          </div>
          <div style={css.kv}>
            <span style={css.key}>{c.keySource}</span>
            <span style={css.val}>{usage.key_source}</span>
          </div>
          <div style={css.kv}>
            <span style={css.key}>{c.meteredQ}</span>
            <span style={css.val}>{usage.metered ? c.yes : c.no}</span>
          </div>
          <div style={css.kv}>
            <span style={css.key}>{c.actionsUsed}</span>
            <span style={css.val}>{formatNumber(usage.usage.actions_used)}</span>
          </div>
          <div style={css.kv}>
            <span style={css.key}>{c.tokensUsed}</span>
            <span style={css.val}>{formatNumber(usage.usage.tokens_used)}</span>
          </div>
          <div style={css.kv}>
            <span style={css.key}>{c.caps}</span>
            <span style={css.val}>
              {usage.limits.max_actions == null ? "∞" : formatNumber(usage.limits.max_actions)} / {usage.limits.max_tokens == null ? "∞" : formatNumber(usage.limits.max_tokens)}
            </span>
          </div>

          <div style={{ marginTop: 20 }}>
            <span style={css.label}>{c.setPlan}</span>
            <div style={css.row}>
              <select style={css.select} value={tier} onChange={e => setTier(e.target.value as any)}>
                <option value="free">{tierLabel("free")}</option>
                <option value="dev_ai">{tierLabel("dev_ai")}</option>
                <option value="byok">{tierLabel("byok")}</option>
              </select>
              <button
                style={css.btn(true)}
                onClick={() => { setMsg(null); setPlan.mutate(); }}
                disabled={setPlan.isPending}
              >
                {setPlan.isPending ? c.saving : c.applyPlan}
              </button>
            </div>
            {msg && <p style={msg.ok ? css.ok : css.err}>{msg.text}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

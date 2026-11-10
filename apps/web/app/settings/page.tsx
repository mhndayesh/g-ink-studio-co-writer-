"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftCircle, Cpu, KeyRound, Sparkles, Gift, Lock, CheckCircle2 } from "lucide-react";
import * as api from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { useUI } from "@/lib/store";
import { useEntitlement } from "@/lib/useEntitlement";
import { Btn, Card, Inp, PageHdr, Tag } from "@/components/ui/Primitives";
import { ProviderForm, ProviderValue, emptyProvider, type Provider } from "@/components/settings/ProviderForm";
import { OwnerPanel } from "@/components/settings/OwnerPanel";
import { useI18n, type Locale } from "@/lib/i18n";

function toValue(p?: api.LaneConfig | null, fallback: Provider = "lmstudio"): ProviderValue {
  if (!p || !p.provider) return emptyProvider(fallback);
  return {
    provider: p.provider as Provider,
    base_url: p.base_url || "",
    model: p.model || "",
    embed_model: p.embed_model || "",
    api_key: "",
    has_api_key: !!p.has_api_key,
  };
}

function toPayload(v: ProviderValue) {
  return { provider: v.provider, base_url: v.base_url, model: v.model, embed_model: v.embed_model, api_key: v.api_key };
}

const copyEn = {
  tiers: {
    free: "Free trial",
    dev_ai: "Plus",
    byok: "Bring Your Own Key",
    owner: "Owner",
  } as Record<string, string>,
  billingActive: "Your plan is active. Happy writing.",
  yourPlan: "Your plan",
  pastDue: "past due",
  ownerDesc: "Unlimited AI on the house models — owner account, no subscription needed.",
  byokDesc: "AI runs on your own provider keys — unlimited on our side.",
  usageThisMonth: (used: string, max: string) => `${used} of ${max} AI actions used this month.`,
  usageTrial: (used: string, max: string) => `Free trial — ${used} of ${max} AI actions used.`,
  subscribe: "Subscribe",
  changePlan: "Change plan",
  manageBilling: "Manage billing",
  ginkTitle: "Use G-Ink's models",
  activeTag: "active",
  ginkDesc1: "The simplest option: we run everything on G-Ink's built-in models — no keys to manage. Available on the ",
  ginkFree: "Free",
  ginkDesc2: " trial and the ",
  ginkPlus: "Plus",
  ginkDesc3: " plan.",
  trialAllowance: "Trial allowance",
  thisMonth: "This month",
  actionsCount: (used: string, max: string) => `${used}/${max} actions`,
  unlimitedOwner: "Unlimited — owner account.",
  activePlain: "Active.",
  byokLocked: "You're on BYOK — switch plans to use G-Ink's models instead.",
  byokTitle: "Bring your own key",
  byokPlanTag: "BYOK plan",
  byokBody: "Use your own provider keys (OpenAI, Anthropic, Gemini, OpenRouter, or a local LM Studio). Unlimited on our side — you pay your provider directly.",
  owner1: "As the owner you can run on any provider — local, DeepSeek, OpenAI, whatever. This is ",
  owner2: "your",
  owner3: " AI; your paid & free users get the house default you set in ",
  owner4: "Owner controls",
  owner5: " above.",
  unified: "Use the same model for everything",
  laneCreative: "Creative — Flow Polish · Writing Companion · Story Check",
  laneTechnical: "Technical — structured extraction · filing",
  laneEmbedding: "Embeddings — Graph-RAG vectors (Anthropic / OpenRouter can't embed → local LM Studio)",
  saveKeys: "Save keys",
  lockedKeys: "Configuring your own keys is part of the BYOK plan.",
  getByok: "Get the BYOK plan",
  routingTitle: "How AI routing works",
  routingBody: "Every AI action is tagged. With G-Ink's models, creative tasks (Flow Polish, the Writing Companion, Story Check) and structured filing all run on our house models, metered against your plan. With Bring Your Own Key, those same tasks run on your configured providers and are never metered by us. If a provider is unreachable, the studio degrades to a deterministic fallback so the UI never breaks.",
  portalFallback: "Contact support to manage your plan.",
  redeemTitle: "Redeem a code",
  redeemDesc: "Got a promo or gift code? Enter it to unlock a free subscription.",
  redeemPlaceholder: "e.g. GINK-AB12-CD34",
  redeemAction: "Redeem",
  redeeming: "Redeeming…",
  redeemSuccess: (verb: string, tier: string, when: string) => `${verb} — you’re on ${tier}${when ? ` ${when}` : ""}.`,
  redeemExtended: "Extended",
  redeemRedeemed: "Code redeemed",
  redeemsForLife: "for life",
  redeemUntil: (date: string) => `through ${date}`,
  redeemError: "Couldn’t redeem that code.",
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    tiers: {
      free: "تجربة مجانية",
      dev_ai: "بلس",
      byok: "مفتاحك الخاص",
      owner: "مالك",
    },
    billingActive: "اشتراكك مفعّل. كتابة ممتعة.",
    yourPlan: "خطتك",
    pastDue: "متأخر السداد",
    ownerDesc: "ذكاء اصطناعي بلا حدود على نماذج المنصة — حساب مالك، بلا حاجة لاشتراك.",
    byokDesc: "يعمل الذكاء الاصطناعي بمفاتيح مزوّدك — بلا حدود من جانبنا.",
    usageThisMonth: (used: string, max: string) => `الإجراءات الذكية المستخدمة هذا الشهر: ${used} من ${max}.`,
    usageTrial: (used: string, max: string) => `التجربة المجانية — الإجراءات الذكية المستخدمة: ${used} من ${max}.`,
    subscribe: "اشترك",
    changePlan: "تغيير الخطة",
    manageBilling: "إدارة الفوترة",
    ginkTitle: "استخدم نماذج G-Ink",
    activeTag: "مفعّل",
    ginkDesc1: "الخيار الأبسط: نُشغّل كل شيء على نماذج G-Ink المدمجة — بلا مفاتيح لإدارتها. متاحة في التجربة ",
    ginkFree: "المجانية",
    ginkDesc2: " وخطة ",
    ginkPlus: "بلس",
    ginkDesc3: ".",
    trialAllowance: "حصّة التجربة",
    thisMonth: "هذا الشهر",
    actionsCount: (used: string, max: string) => `الإجراءات: ${used}/${max}`,
    unlimitedOwner: "بلا حدود — حساب مالك.",
    activePlain: "مفعّل.",
    byokLocked: "أنت على خطة المفتاح الخاص — غيّر الخطة لاستخدام نماذج G-Ink بدلًا من ذلك.",
    byokTitle: "استخدم مفتاحك الخاص",
    byokPlanTag: "خطة المفتاح الخاص",
    byokBody: "استخدم مفاتيح مزوّدك (OpenAI أو Anthropic أو Gemini أو OpenRouter أو LM Studio محلي). بلا حدود من جانبنا — وتدفع لمزوّدك مباشرة.",
    owner1: "بصفتك المالك، يمكنك التشغيل على أي مزوّد — محلي أو DeepSeek أو OpenAI أو غيرها. هذا هو ",
    owner2: "ذكاؤك أنت",
    owner3: "؛ أما مستخدمو الخطط المدفوعة والمجانية فيحصلون على النموذج الافتراضي الذي تحدّده في ",
    owner4: "أدوات المالك",
    owner5: " أعلاه.",
    unified: "استخدام النموذج نفسه لكل المهام",
    laneCreative: "الإبداع — صقل الكتابة · رفيق الكتابة · تدقيق القصة",
    laneTechnical: "التقني — الاستخلاص المنظم · الأرشفة",
    laneEmbedding: "التضمينات — متجهات Graph-RAG (Anthropic وOpenRouter لا يدعمان التضمين ← LM Studio محلي)",
    saveKeys: "حفظ المفاتيح",
    lockedKeys: "إعداد مفاتيحك الخاصة جزء من خطة المفتاح الخاص.",
    getByok: "احصل على خطة المفتاح الخاص",
    routingTitle: "كيف يعمل توجيه الذكاء الاصطناعي",
    routingBody: "كل إجراء ذكاء اصطناعي موسوم بنوعه. مع نماذج G-Ink، تُنفَّذ المهام الإبداعية (صقل الكتابة، رفيق الكتابة، تدقيق القصة) والأرشفة المنظمة على نماذج المنصة وتُحتسب على خطتك. مع خطة المفتاح الخاص، تُنفَّذ المهام نفسها على مزوّديك المضبوطين ولا نحتسبها عليك. وإذا تعذّر الوصول إلى مزوّد، ينتقل الاستوديو إلى بديل حتمي كي لا تتعطّل الواجهة.",
    portalFallback: "تواصل مع الدعم لإدارة خطتك.",
    redeemTitle: "تفعيل رمز",
    redeemDesc: "لديك رمز ترويجي أو هدية؟ أدخله لتفعيل اشتراك مجاني.",
    redeemPlaceholder: "مثال: GINK-AB12-CD34",
    redeemAction: "تفعيل",
    redeeming: "جارٍ التفعيل…",
    redeemSuccess: (verb: string, tier: string, when: string) => `${verb} — أنت الآن على خطة ${tier}${when ? ` ${when}` : ""}.`,
    redeemExtended: "تم التمديد",
    redeemRedeemed: "تم تفعيل الرمز",
    redeemsForLife: "مدى الحياة",
    redeemUntil: (date: string) => `حتى ${date}`,
    redeemError: "تعذّر تفعيل هذا الرمز.",
  },
};

function RedeemCodeCard() {
  const qc = useQueryClient();
  const { locale, formatDate } = useI18n();
  const c = COPY[locale];
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const redeem = useMutation({
    mutationFn: () => api.redeemCode(code.trim()),
    onSuccess: (res) => {
      const when = res.lifetime ? c.redeemsForLife : res.expires_at ? c.redeemUntil(formatDate(res.expires_at)) : "";
      const verb = res.extended ? c.redeemExtended : c.redeemRedeemed;
      setMsg({ ok: true, text: c.redeemSuccess(verb, c.tiers[res.tier] ?? res.tier, when) });
      setCode("");
      qc.invalidateQueries({ queryKey: ["billing-me"] });
      qc.invalidateQueries({ queryKey: ["me", "profile"] });
    },
    onError: (e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : c.redeemError }),
  });

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Gift size={16} className="text-ink-gold" />
        <h3 className="font-display text-lg">{c.redeemTitle}</h3>
      </div>
      <p className="text-sm text-ink-text2 mb-3">{c.redeemDesc}</p>
      <div className="flex gap-2">
        <Inp value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder={c.redeemPlaceholder}
          onKeyDown={e => { if (e.key === "Enter" && code.trim()) redeem.mutate(); }} />
        <Btn variant="primary" disabled={!code.trim() || redeem.isPending} onClick={() => redeem.mutate()}>
          {redeem.isPending ? c.redeeming : c.redeemAction}
        </Btn>
      </div>
      {msg && <p className={`text-sm mt-2 ${msg.ok ? "text-ink-green" : "text-ink-red"}`}>{msg.text}</p>}
    </Card>
  );
}

function SettingsInner() {
  const qc = useQueryClient();
  const search = useSearchParams();
  const openUpgrade = useUI((s) => s.openUpgrade);
  const { t, locale, setLocale, formatNumber } = useI18n();
  const c = COPY[locale];
  useRequireAuth();

  const { entitlement, isByok, isOwner, isRealOwner, planTier, planStatus } = useEntitlement();

  // Returning from a successful checkout → refresh entitlement + status.
  useEffect(() => {
    if (search.get("billing") === "success") {
      qc.invalidateQueries({ queryKey: ["billing-me"] });
      qc.invalidateQueries({ queryKey: ["llm-status"] });
    }
  }, [search, qc]);

  const { data: config } = useQuery({ queryKey: ["llm-config"], queryFn: api.llmGetConfig });
  const { data: status } = useQuery({ queryKey: ["llm-status"], queryFn: api.llmStatus });

  const [unified, setUnified] = useState(true);
  const [creative, setCreative] = useState<ProviderValue>(emptyProvider());
  const [technical, setTechnical] = useState<ProviderValue>(emptyProvider());
  const [embedding, setEmbedding] = useState<ProviderValue>(emptyProvider());

  useEffect(() => {
    if (!config) return;
    const cv = toValue(config.creative);
    const tv = toValue(config.technical);
    const ev = toValue(config.embedding);
    setCreative(cv); setTechnical(tv); setEmbedding(ev);
    const same = cv.provider === tv.provider && cv.model === tv.model && cv.base_url === tv.base_url
      && cv.provider === ev.provider && cv.model === ev.model;
    setUnified(same);
  }, [config]);

  const statusByLane = useMemo(() => {
    const map: Record<string, api.LLMStatusItem> = {};
    for (const s of status?.statuses || []) map[s.lane] = s;
    return map;
  }, [status]);

  const save = useMutation({
    mutationFn: () => {
      if (unified) {
        const p = toPayload(creative);
        return api.llmPutConfig({ creative: p, technical: p, embedding: p });
      }
      return api.llmPutConfig({ creative: toPayload(creative), technical: toPayload(technical), embedding: toPayload(embedding) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-config"] });
      qc.invalidateQueries({ queryKey: ["llm-status"] });
    },
  });

  const portal = useMutation({
    mutationFn: api.billingPortal,
    onSuccess: (r) => { if (r.url) window.location.href = r.url; else alert(r.message || c.portalFallback); },
  });

  const metered = entitlement?.metered;
  const usedActions = entitlement?.usage.actions_used ?? 0;
  const maxActions = entitlement?.limits.max_actions ?? null;

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-6">
      <Link href="/studio" className="text-xs text-ink-text2 hover:text-ink-goldLight inline-flex items-center gap-1.5 mb-4"><ArrowLeftCircle size={14} className="rtl-flip"/> {t("common.backToStudio")}</Link>
      <PageHdr title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Card className="mb-6">
        <h3 className="font-display text-lg mb-1">{t("settings.languageSection")}</h3>
        <p className="text-sm text-ink-text2 mb-3">{t("settings.languageHint")}</p>
        <div className="flex gap-2">
          <Btn
            variant={locale === "en" ? "primary" : "ghost"}
            onClick={() => { setLocale("en"); api.updateMyProfile({ locale: "en" }).catch(() => undefined); }}
          >
            {t("common.english")}
          </Btn>
          <Btn
            variant={locale === "ar" ? "primary" : "ghost"}
            onClick={() => { setLocale("ar"); api.updateMyProfile({ locale: "ar" }).catch(() => undefined); }}
          >
            {t("common.arabic")}
          </Btn>
        </div>
      </Card>

      {search.get("billing") === "success" && (
        <Card className="mb-4 border-ink-green/40 bg-ink-green/10">
          <p className="text-sm text-ink-green inline-flex items-center gap-2"><CheckCircle2 size={15}/> {c.billingActive}</p>
        </Card>
      )}

      {/* ── Current plan ──────────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg">{c.yourPlan}</h3>
              <Tag color={planTier === "byok" ? "gold" : planTier === "dev_ai" ? "green" : "muted"}>{c.tiers[planTier] ?? planTier}</Tag>
              {planStatus === "past_due" && <Tag color="red">{c.pastDue}</Tag>}
            </div>
            <p className="text-sm text-ink-text2 mt-1">
              {isOwner && c.ownerDesc}
              {planTier === "byok" && c.byokDesc}
              {planTier === "dev_ai" && metered && maxActions != null && c.usageThisMonth(formatNumber(usedActions), formatNumber(maxActions))}
              {planTier === "free" && metered && maxActions != null && c.usageTrial(formatNumber(usedActions), formatNumber(maxActions))}
            </p>
          </div>
          {!isOwner && (
            <div className="flex flex-col gap-2 shrink-0">
              <Btn variant="primary" onClick={() => openUpgrade("manual")}>{planTier === "free" ? c.subscribe : c.changePlan}</Btn>
              {planTier !== "free" && <Btn variant="ghost" onClick={() => portal.mutate()} disabled={portal.isPending}>{c.manageBilling}</Btn>}
            </div>
          )}
        </div>
      </Card>

      {/* ── Redeem a code ─────────────────────────────────────────────── */}
      <RedeemCodeCard />

      {/* ── Owner-only control panel: shape-shift + house default + caps ── */}
      {isRealOwner && <OwnerPanel />}

      {/* ── Section 1: G-Ink's models (dev AI) ────────────────────────── */}
      <Card className={`mb-4 ${!isByok ? "border-ink-gold/40" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-ink-gold" />
          <h3 className="font-display text-lg">{c.ginkTitle}</h3>
          {!isByok && <Tag color="green">{c.activeTag}</Tag>}
        </div>
        <p className="text-sm text-ink-text2">
          {c.ginkDesc1}
          <strong>{c.ginkFree}</strong>
          {c.ginkDesc2}
          <strong>{c.ginkPlus}</strong>
          {c.ginkDesc3}
        </p>
        {!isByok ? (
          <div className="mt-3 rounded border border-ink-border bg-ink-surface2/50 p-3 text-sm">
            {metered && maxActions != null ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-ink-text2 inline-flex items-center gap-1.5">
                    {planTier === "free" ? <Gift size={13} className="text-ink-gold"/> : <Cpu size={13} className="text-ink-gold"/>}
                    {planTier === "free" ? c.trialAllowance : c.thisMonth}
                  </span>
                  <span className="text-ink-text3">{c.actionsCount(formatNumber(usedActions), formatNumber(maxActions))}</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-surface3 overflow-hidden">
                  <div className={`h-full rounded-full ${entitlement?.ai_available ? "bg-ink-gold" : "bg-ink-red"}`}
                       style={{ width: `${Math.min(100, Math.round((usedActions / Math.max(1, maxActions)) * 100))}%` }} />
                </div>
              </>
            ) : (
              <span className="text-ink-text2">{isOwner ? c.unlimitedOwner : c.activePlain}</span>
            )}
          </div>
        ) : (
          <div className="mt-3 text-sm text-ink-text3 inline-flex items-center gap-1.5">
            <Lock size={13}/> {c.byokLocked}
          </div>
        )}
      </Card>

      {/* ── Section 2: Bring your own key (BYOK) ──────────────────────── */}
      <Card className={`mb-4 ${isByok ? "border-ink-gold/40" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-ink-gold" />
          <h3 className="font-display text-lg">{c.byokTitle}</h3>
          {isByok ? <Tag color="green">{c.activeTag}</Tag> : <Tag color="muted">{c.byokPlanTag}</Tag>}
        </div>
        <p className="text-sm text-ink-text2 mb-3">
          {c.byokBody}
        </p>

        {isRealOwner && (
          <p className="text-xs text-ink-text3 mb-3 -mt-1">
            {c.owner1}<strong>{c.owner2}</strong>{c.owner3}<em>{c.owner4}</em>{c.owner5}
          </p>
        )}
        {(isByok || isRealOwner) ? (
          <>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={unified} onChange={(e) => setUnified(e.target.checked)} />
              <span className="text-sm"><Cpu size={14} className="inline me-1"/> {c.unified}</span>
            </label>

            {unified ? (
              <ProviderForm value={creative} onChange={setCreative} lane="creative" status={statusByLane["creative"]} />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-ink-text3 mb-2">{c.laneCreative}</p>
                  <ProviderForm value={creative} onChange={setCreative} lane="creative" showEmbed={false} status={statusByLane["creative"]} />
                </div>
                <div>
                  <p className="text-xs text-ink-text3 mb-2">{c.laneTechnical}</p>
                  <ProviderForm value={technical} onChange={setTechnical} lane="technical" showEmbed={false} status={statusByLane["technical"]} />
                </div>
                <div>
                  <p className="text-xs text-ink-text3 mb-2">{c.laneEmbedding}</p>
                  <ProviderForm value={embedding} onChange={setEmbedding} lane="embedding" showEmbed status={statusByLane["embedding"]} />
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Btn variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? t("common.saving") : c.saveKeys}
              </Btn>
            </div>
          </>
        ) : (
          <div className="rounded border border-ink-border bg-ink-surface2/50 p-4 text-center">
            <Lock size={18} className="text-ink-gold mx-auto mb-2" />
            <p className="text-sm text-ink-text2 mb-3">{c.lockedKeys}</p>
            <Btn variant="primary" onClick={() => openUpgrade("byok_key_missing")}>{c.getByok}</Btn>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-2">{c.routingTitle}</h2>
        <p className="text-sm text-ink-text2">{c.routingBody}</p>
      </Card>
    </main>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto p-6 text-ink-text2">{t("common.loading")}</main>}>
      <SettingsInner />
    </Suspense>
  );
}

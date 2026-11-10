"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Cpu, Gauge } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, Tag } from "@/components/ui/Primitives";
import { ProviderForm, ProviderValue, emptyProvider, type Provider } from "@/components/settings/ProviderForm";
import { ActAsControl } from "@/components/billing/ActAsControl";
import { useI18n, type Locale } from "@/lib/i18n";

type Caps = api.SiteConfigCaps;
const EMPTY_CAPS: Caps = {
  dev_ai_max_actions: null, dev_ai_max_tokens: null,
  free_trial_max_actions: null, free_trial_max_tokens: null,
};

function houseToValue(sc?: api.SiteConfig): ProviderValue {
  const fallback = (sc?.defaults.env_house_provider as Provider) || "lmstudio";
  const h = sc?.house;
  if (!h || !h.provider) return emptyProvider(fallback);
  return {
    provider: h.provider as Provider,
    base_url: h.base_url || "",
    model: h.model || "",
    embed_model: h.embed_model || "",
    api_key: "",
    has_api_key: !!h.has_api_key,
  };
}

// "" → null; numeric string → number. Used for the cap inputs.
function numOrNull(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

const copyEn = {
  title: "Owner controls",
  ownerOnly: "owner only",
  subtitle: "Set the default AI your paid & free users run on, tune their limits, and view the app as any user type.",
  defaultAi: "Default AI (what paid & free users get)",
  usageLimits: "Usage limits (paid & free)",
  usageHint: "Leave blank to use the built-in default. BYOK and owner are never capped.",
  capPaidActions: "Paid — actions / month",
  capPaidTokens: "Paid — tokens / month",
  capFreeActions: "Free trial — actions",
  capFreeTokens: "Free trial — tokens",
  defaultValue: (value: string) => `default ${value}`,
  defaultPlain: "default",
  saved: "Saved.",
  save: "Save owner settings",
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    title: "أدوات المالك",
    ownerOnly: "للمالك فقط",
    subtitle: "حدّد الذكاء الاصطناعي الافتراضي لمستخدمي الخطط المدفوعة والمجانية، واضبط حدودهم، واستعرض التطبيق بأي نوع مستخدم.",
    defaultAi: "الذكاء الاصطناعي الافتراضي (للمستخدمين المدفوعين والمجانيين)",
    usageLimits: "حدود الاستخدام (المدفوع والمجاني)",
    usageHint: "اتركه فارغًا لاستخدام الافتراضي المدمج. خطة المفتاح الخاص والمالك بلا حدود دائمًا.",
    capPaidActions: "المدفوع — الإجراءات / شهر",
    capPaidTokens: "المدفوع — الرموز / شهر",
    capFreeActions: "التجربة المجانية — الإجراءات",
    capFreeTokens: "التجربة المجانية — الرموز",
    defaultValue: (value: string) => `الافتراضي ${value}`,
    defaultPlain: "الافتراضي",
    saved: "تم الحفظ.",
    save: "حفظ إعدادات المالك",
  },
};

/** Owner-only control surface: shape-shift + the default AI every paid/free user
 *  runs on + the tunable usage caps. Renders nothing for non-owners. */
export function OwnerPanel() {
  const qc = useQueryClient();
  const { locale, t, formatNumber } = useI18n();
  const c = COPY[locale];
  const { data: sc } = useQuery({ queryKey: ["site-config"], queryFn: api.adminGetSiteConfig });

  const [house, setHouse] = useState<ProviderValue>(emptyProvider());
  const [caps, setCaps] = useState<Caps>(EMPTY_CAPS);

  useEffect(() => {
    if (!sc) return;
    setHouse(houseToValue(sc));
    setCaps(sc.caps);
  }, [sc]);

  const save = useMutation({
    mutationFn: () =>
      api.adminPutSiteConfig({
        house: {
          provider: house.provider,
          base_url: house.base_url,
          model: house.model,
          embed_model: house.embed_model,
          api_key: house.api_key, // blank keeps the stored key
        },
        caps,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-config"] });
      qc.invalidateQueries({ queryKey: ["llm-status"] }); // your house provider may have changed
    },
  });

  const def = sc?.defaults;
  const capRow = (label: string, key: keyof Caps, placeholder?: number | null) => (
    <FG label={label}>
      <Inp
        type="number"
        min={0}
        value={caps[key] ?? ""}
        placeholder={placeholder != null ? c.defaultValue(formatNumber(placeholder)) : c.defaultPlain}
        onChange={(e) => setCaps({ ...caps, [key]: numOrNull(e.target.value) })}
      />
    </FG>
  );

  return (
    <Card className="mb-4 border-ink-gold/40">
      <div className="flex items-center gap-2 mb-1">
        <Crown size={16} className="text-ink-gold" />
        <h3 className="font-display text-lg">{c.title}</h3>
        <Tag color="gold">{c.ownerOnly}</Tag>
      </div>
      <p className="text-sm text-ink-text2 mb-4">
        {c.subtitle}
      </p>

      {/* Shape-shift */}
      <div className="mb-5">
        <ActAsControl />
      </div>

      {/* House default AI */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={14} className="text-ink-gold" />
          <h4 className="font-medium">{c.defaultAi}</h4>
        </div>
        <ProviderForm value={house} onChange={setHouse} lane="creative" showEmbed />
      </div>

      {/* Tunable caps */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Gauge size={14} className="text-ink-gold" />
          <h4 className="font-medium">{c.usageLimits}</h4>
        </div>
        <p className="text-xs text-ink-text3 mb-2">{c.usageHint}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {capRow(c.capPaidActions, "dev_ai_max_actions", def?.dev_ai_max_actions)}
          {capRow(c.capPaidTokens, "dev_ai_max_tokens", def?.dev_ai_max_tokens)}
          {capRow(c.capFreeActions, "free_trial_max_actions", def?.free_trial_max_actions)}
          {capRow(c.capFreeTokens, "free_trial_max_tokens", def?.free_trial_max_tokens)}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {save.isSuccess && <span className="text-xs text-ink-green">{c.saved}</span>}
        <Btn variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? t("common.saving") : c.save}
        </Btn>
      </div>
    </Card>
  );
}

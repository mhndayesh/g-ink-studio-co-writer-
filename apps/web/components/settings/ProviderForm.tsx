"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, KeyRound, ListChecks } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, FG, Inp, Sel } from "@/components/ui/Primitives";
import { useI18n, type Locale } from "@/lib/i18n";

export type Provider = "lmstudio" | "llamacpp" | "openai" | "anthropic" | "openrouter" | "gemini" | "deepseek";

// Providers that cannot produce embeddings — mirrors the backend EMBED_CAPABLE.
export const EMBED_INCAPABLE: Provider[] = ["anthropic", "openrouter", "deepseek", "llamacpp"];

export type ProviderValue = {
  provider: Provider;
  base_url: string;
  model: string;
  embed_model: string;
  api_key: string;     // only sent when non-empty
  has_api_key: boolean; // whether a key is already stored server-side
};

export const PROVIDER_DEFAULTS: Record<Provider, { base_url: string; model: string; embed_model: string }> = {
  lmstudio:   { base_url: "http://localhost:1234/v1", model: "local-model", embed_model: "nomic-embed-text-v1.5" },
  llamacpp:   { base_url: "http://localhost:8080/v1", model: "local", embed_model: "" },
  openai:     { base_url: "https://api.openai.com/v1", model: "gpt-4o-mini", embed_model: "text-embedding-3-small" },
  anthropic:  { base_url: "", model: "claude-sonnet-4-5", embed_model: "" },
  openrouter: { base_url: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", embed_model: "" },
  gemini:     { base_url: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash", embed_model: "text-embedding-004" },
  deepseek:   { base_url: "https://api.deepseek.com/v1", model: "deepseek-v4-flash", embed_model: "" },
};

// Brand names stay as-is; only the "(local)" qualifier is localized.
const PROVIDER_NAMES: Record<Provider, string> = {
  lmstudio: "LM Studio",
  llamacpp: "llama.cpp / llama-server",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  gemini: "Google Gemini",
  deepseek: "DeepSeek",
};

const copyEn = {
  localSuffix: " (local)",
  reachable: "reachable",
  unreachable: (detail: string) => `unreachable (${detail})`,
  provider: "Provider",
  baseUrl: "Base URL",
  baseUrlUnused: "Not used — Anthropic Messages API.",
  chatModel: "Chat model",
  availablePick: (count: string) => `${count} available — pick or type`,
  embeddingModel: "Embedding model",
  cantEmbed: (provider: string) => `${provider} can't embed — will use LM Studio.`,
  apiKey: "API key",
  apiKeyHint: "Encrypted at rest. Leave blank to keep the current one.",
  keySet: "•••••• (set)",
  keyPaste: "paste key here",
  testing: "Testing…",
  test: "Test",
  loading: "Loading…",
  loadModels: "Load models",
  fallbackUnreachable: "fallback — not reachable",
  couldntList: (error: string) => `couldn't list models — ${error}`,
  foundModels: (count: string) => `found ${count} model${count === "1" ? "" : "s"}`,
  requestFailed: "request failed",
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    localSuffix: " (محلي)",
    reachable: "متاح",
    unreachable: (detail: string) => `غير متاح (${detail})`,
    provider: "المزوّد",
    baseUrl: "عنوان الأساس",
    baseUrlUnused: "غير مستخدم — واجهة Anthropic Messages.",
    chatModel: "نموذج المحادثة",
    availablePick: (count: string) => `${count} متاح — اختر أو اكتب`,
    embeddingModel: "نموذج التضمين",
    cantEmbed: (provider: string) => `${provider} لا يدعم التضمين — سيُستخدم LM Studio بدلًا منه.`,
    apiKey: "مفتاح API",
    apiKeyHint: "مشفَّر عند التخزين. اتركه فارغًا للإبقاء على المفتاح الحالي.",
    keySet: "•••••• (مضبوط)",
    keyPaste: "ألصق المفتاح هنا",
    testing: "جارٍ الاختبار…",
    test: "اختبار",
    loading: "جارٍ التحميل…",
    loadModels: "تحميل النماذج",
    fallbackUnreachable: "وضع احتياطي — غير متاح",
    couldntList: (error: string) => `تعذّر سرد النماذج — ${error}`,
    foundModels: (count: string) => `تم العثور على ${count} نموذج`,
    requestFailed: "فشل الطلب",
  },
};

export function emptyProvider(p: Provider = "lmstudio"): ProviderValue {
  return { provider: p, ...PROVIDER_DEFAULTS[p], api_key: "", has_api_key: false };
}

export function ProviderForm({
  value,
  onChange,
  lane,
  showEmbed = true,
  status,
}: {
  value: ProviderValue;
  onChange: (v: ProviderValue) => void;
  lane: "creative" | "technical" | "embedding";
  showEmbed?: boolean;
  status?: { reachable: boolean; detail: string; provider: string; model: string };
}) {
  const { locale, formatNumber } = useI18n();
  const c = COPY[locale];

  const test = useMutation({
    mutationKey: ["llm", "llm.test"],
    mutationFn: () => api.llmTest({ lane }),
  });

  // Live model list for the picker. NOT tagged ["llm", …] on purpose — this is a
  // quick metadata call, not an AI generation, so it shouldn't trip BusyOverlay.
  const [models, setModels] = useState<api.ModelInfo[]>([]);
  const loadModels = useMutation({
    mutationKey: ["model-list", lane],
    mutationFn: () => api.llmListModels({
      provider: value.provider, base_url: value.base_url, api_key: value.api_key, lane,
    }),
    onSuccess: (d) => setModels(d.models || []),
  });
  const chatModels = models.filter((m) => m.kind !== "embed");
  const embedModels = models.filter((m) => m.kind === "embed");
  const chatListId = `models-chat-${lane}`;
  const embedListId = `models-embed-${lane}`;

  function applyProvider(p: Provider) {
    setModels([]);          // stale list belongs to the old provider
    loadModels.reset();
    onChange({ ...value, provider: p, ...PROVIDER_DEFAULTS[p] });
  }

  const isAnthropic = value.provider === "anthropic";
  const isEmbeddingSlot = lane === "embedding";
  const cantEmbed = EMBED_INCAPABLE.includes(value.provider);
  // Embedding slots only allow embed-capable providers.
  const providerOptions = (Object.keys(PROVIDER_NAMES) as Provider[]).filter(
    (p) => !isEmbeddingSlot || !EMBED_INCAPABLE.includes(p),
  );

  const providerLabel = (p: Provider) => {
    const base = PROVIDER_NAMES[p];
    return p === "lmstudio" || p === "llamacpp" ? `${base}${c.localSuffix}` : base;
  };

  return (
    <div className="space-y-3">
      {status && (
        <div className={`inline-flex items-center gap-1 text-xs ${status.reachable ? "text-ink-green" : "text-ink-red"}`}>
          {status.reachable ? <CheckCircle2 size={13}/> : <XCircle size={13}/>}
          {status.provider}/{status.model} — {status.reachable ? c.reachable : c.unreachable(status.detail)}
        </div>
      )}

      <FG label={c.provider}>
        <Sel value={value.provider} onChange={(e) => applyProvider(e.target.value as Provider)}>
          {providerOptions.map((p) => <option key={p} value={p}>{providerLabel(p)}</option>)}
        </Sel>
      </FG>

      <FG label={c.baseUrl} hint={isAnthropic ? c.baseUrlUnused : ""}>
        <Inp value={value.base_url} onChange={(e) => onChange({ ...value, base_url: e.target.value })}
             placeholder={PROVIDER_DEFAULTS[value.provider].base_url} disabled={isAnthropic} />
      </FG>

      <div className={`grid gap-3 ${showEmbed && !isEmbeddingSlot ? "md:grid-cols-2" : ""}`}>
        {!isEmbeddingSlot && (
          <FG label={c.chatModel} hint={chatModels.length ? c.availablePick(formatNumber(chatModels.length)) : ""}>
            <Inp list={chatListId} value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })}
                 placeholder={PROVIDER_DEFAULTS[value.provider].model} />
            <datalist id={chatListId}>
              {chatModels.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </datalist>
          </FG>
        )}
        {(showEmbed || isEmbeddingSlot) && (
          <FG label={c.embeddingModel} hint={cantEmbed ? c.cantEmbed(providerLabel(value.provider)) : (embedModels.length ? c.availablePick(formatNumber(embedModels.length)) : "")}>
            <Inp list={embedListId} value={value.embed_model} onChange={(e) => onChange({ ...value, embed_model: e.target.value })}
                 placeholder={PROVIDER_DEFAULTS[value.provider].embed_model} disabled={cantEmbed} />
            <datalist id={embedListId}>
              {embedModels.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </datalist>
          </FG>
        )}
      </div>

      {value.provider !== "lmstudio" && value.provider !== "llamacpp" && (
        <FG label={c.apiKey} hint={c.apiKeyHint}>
          <div className="relative">
            <KeyRound size={14} className="absolute start-2 top-1/2 -translate-y-1/2 text-ink-text3"/>
            <Inp type="password" className="ps-7" value={value.api_key}
                 onChange={(e) => onChange({ ...value, api_key: e.target.value })}
                 placeholder={value.has_api_key ? c.keySet : c.keyPaste} />
          </div>
        </FG>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={() => test.mutate()} disabled={test.isPending}>
          {test.isPending ? c.testing : c.test}
        </Btn>
        <Btn variant="ghost" onClick={() => loadModels.mutate()} disabled={loadModels.isPending}>
          <ListChecks size={13} className="me-1 inline" />
          {loadModels.isPending ? c.loading : c.loadModels}
        </Btn>
        {test.data && (
          <span className={`text-xs ${test.data.fallback ? "text-ink-red" : "text-ink-text2"}`}>
            {test.data.fallback ? c.fallbackUnreachable : `✓ ${test.data.model}: ${test.data.text.slice(0, 60)}`}
          </span>
        )}
        {loadModels.data && (
          <span className={`text-xs ${loadModels.data.error ? "text-ink-red" : "text-ink-text2"}`}>
            {loadModels.data.error
              ? c.couldntList(loadModels.data.error)
              : c.foundModels(formatNumber(loadModels.data.count))}
          </span>
        )}
        {loadModels.isError && <span className="text-xs text-ink-red">{c.requestFailed}</span>}
      </div>
    </div>
  );
}

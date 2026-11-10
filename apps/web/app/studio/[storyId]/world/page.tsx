"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, QueryError, Ta, Tag } from "@/components/ui/Primitives";
import { CoverUploader } from "@/components/ui/CoverUploader";
import { useDebouncedSave } from "@/lib/debounce";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    title: "✦ Your World",
    subtitle: "The story bible. The AI respects everything here on every generation.",
    projectCover: "Project cover",
    projectCoverHint: "Shown on your stories hub and used as the default when you publish.",
    genre: "Genre",
    logline: "Logline",
    loglineHint: "One-sentence story pitch.",
    timePeriod: "Time period",
    setting: "Setting",
    worldRules: "World rules",
    worldRulesHint: "Hard constraints the AI must never violate.",
    rulePlaceholder: "e.g. Magic requires a year of life per casting",
    add: "Add",
    noRules: "No rules yet.",
    themes: "Themes",
    themePlaceholder: "e.g. legacy, sacrifice, identity",
    lore: "Lore",
    loreHint: "Backstory the reader may never see but the world depends on.",
    seeds: "Seeds → payoff",
    seedsHint: "Foreshadowing tracker. Plant something here, mark it paid off later.",
    removeRuleAria: "Remove rule",
    removeThemeAria: "Remove theme",
  },
  ar: {
    title: "✦ عالمك",
    subtitle: "موسوعة القصة. يحترم الذكاء الاصطناعي كل ما هنا في كل عملية توليد.",
    projectCover: "غلاف المشروع",
    projectCoverHint: "يظهر في صفحة قصصك ويُستخدم افتراضيًا عند النشر.",
    genre: "التصنيف",
    logline: "سطر القصة",
    loglineHint: "عرض القصة في جملة واحدة.",
    timePeriod: "الحقبة الزمنية",
    setting: "الإطار",
    worldRules: "قواعد العالم",
    worldRulesHint: "قيود صارمة لا يجوز للذكاء الاصطناعي خرقها.",
    rulePlaceholder: "مثال: تتطلب السحر سنة من العمر لكل تعويذة",
    add: "إضافة",
    noRules: "لا توجد قواعد بعد.",
    themes: "الموضوعات",
    themePlaceholder: "مثال: الإرث، التضحية، الهوية",
    lore: "الخلفيات",
    loreHint: "أحداث ماضية قد لا يراها القارئ، لكن العالم يقوم عليها.",
    seeds: "البذور ← الحصاد",
    seedsHint: "متتبّع التمهيد. ازرع شيئًا هنا، ثم علّمه كمُحصَّل لاحقًا.",
    removeRuleAria: "حذف القاعدة",
    removeThemeAria: "حذف الموضوع",
  },
} as const;

export default function WorldPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { t, locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data: world, isError, error, refetch } = useQuery({ queryKey: ["world", storyId], queryFn: () => api.getWorld(storyId) });
  const { data: story } = useQuery({ queryKey: ["story", storyId], queryFn: () => api.getStory(storyId) });

  const setCover = useMutation({
    mutationFn: (url: string | null) => api.updateStory(storyId, { cover_image_url: url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  const [draft, setDraft] = useState<any>(null);
  useEffect(() => { if (world && !draft) setDraft({ ...world }); }, [world, draft]);

  const patch = useMutation({
    mutationFn: async (p: any) => {
      const updated = await api.patchWorld(storyId, p);
      // Keep the story row (hub title/genre) in sync with the world bible.
      if (p.title !== undefined || p.genre !== undefined) {
        await api.updateStory(storyId, {
          ...(p.title !== undefined ? { title: p.title } : {}),
          ...(p.genre !== undefined ? { genre: p.genre } : {}),
        });
      }
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world", storyId] });
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  useDebouncedSave(draft, 900, (d) => {
    if (!d) return;
    const { story_id, ...rest } = d;
    patch.mutate(rest);
  });

  const [newRule, setNewRule] = useState("");
  const [newTheme, setNewTheme] = useState("");

  function addRule() { if (!newRule.trim() || !draft) return; setDraft({ ...draft, rules: [...(draft.rules || []), newRule.trim()] }); setNewRule(""); }
  function removeRule(i: number) { if (!draft) return; setDraft({ ...draft, rules: draft.rules.filter((_: any, idx: number) => idx !== i) }); }
  function addTheme() { if (!newTheme.trim() || !draft) return; setDraft({ ...draft, themes: [...(draft.themes || []), newTheme.trim()] }); setNewTheme(""); }
  function removeTheme(i: number) { if (!draft) return; setDraft({ ...draft, themes: draft.themes.filter((_: any, idx: number) => idx !== i) }); }

  if (isError) return <QueryError error={error} retry={refetch} what={c.title} />;
  if (!draft) return <p className="text-ink-text2">{t("common.loading")}</p>;

  return (
    <div className="max-w-4xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />

      <Card className="mb-4">
        <h3 className="font-display text-lg mb-1">{c.projectCover}</h3>
        <p className="text-sm text-ink-text2 mb-3">{c.projectCoverHint}</p>
        <CoverUploader value={story?.cover_image_url} onChange={(url) => setCover.mutate(url)} label="" />
      </Card>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2">
          <FG label={t("studio.title")}><Inp value={draft.title || ""} onChange={e => setDraft({ ...draft, title: e.target.value })} /></FG>
          <FG label={c.genre}><Inp value={draft.genre || ""} onChange={e => setDraft({ ...draft, genre: e.target.value })} /></FG>
        </div>
        <FG label={c.logline} hint={c.loglineHint}><Inp value={draft.logline || ""} onChange={e => setDraft({ ...draft, logline: e.target.value })} /></FG>
        <FG label={c.timePeriod}><Inp value={draft.time_period || ""} onChange={e => setDraft({ ...draft, time_period: e.target.value })} /></FG>
        <FG label={c.setting}><Ta value={draft.setting || ""} onChange={e => setDraft({ ...draft, setting: e.target.value })} /></FG>
      </Card>

      <Card className="mb-4">
        <h3 className="font-display text-lg mb-2">{c.worldRules}</h3>
        <p className="text-sm text-ink-text2 mb-3">{c.worldRulesHint}</p>
        <div className="flex gap-2 mb-3">
          <Inp value={newRule} onChange={e => setNewRule(e.target.value)} placeholder={c.rulePlaceholder} onKeyDown={e => e.key === "Enter" && addRule()} />
          <Btn variant="primary" onClick={addRule}><Plus size={14}/> {c.add}</Btn>
        </div>
        <ul className="space-y-1">
          {(draft.rules || []).map((r: string, i: number) => (
            <li key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-ink-surface2">
              <span>• {r}</span>
              <button aria-label={c.removeRuleAria} onClick={() => removeRule(i)} className="text-ink-text3 hover:text-ink-red"><X size={14}/></button>
            </li>
          ))}
          {(draft.rules || []).length === 0 && <li className="text-sm text-ink-text3">{c.noRules}</li>}
        </ul>
      </Card>

      <Card className="mb-4">
        <h3 className="font-display text-lg mb-2">{c.themes}</h3>
        <div className="flex gap-2 mb-3">
          <Inp value={newTheme} onChange={e => setNewTheme(e.target.value)} placeholder={c.themePlaceholder} onKeyDown={e => e.key === "Enter" && addTheme()} />
          <Btn variant="primary" onClick={addTheme}><Plus size={14}/> {c.add}</Btn>
        </div>
        <div className="flex flex-wrap gap-2">
          {(draft.themes || []).map((th: string, i: number) => (
            <span key={th + i} className="inline-flex items-center gap-2"><Tag color="green">{th}</Tag><button aria-label={c.removeThemeAria} onClick={() => removeTheme(i)} className="text-ink-text3 hover:text-ink-red"><X size={12}/></button></span>
          ))}
        </div>
      </Card>

      <Card>
        <FG label={c.lore} hint={c.loreHint}><Ta rows={6} value={draft.lore || ""} onChange={e => setDraft({ ...draft, lore: e.target.value })} /></FG>
        <FG label={c.seeds} hint={c.seedsHint}><Ta rows={4} value={draft.seeds || ""} onChange={e => setDraft({ ...draft, seeds: e.target.value })} /></FG>
      </Card>
    </div>
  );
}

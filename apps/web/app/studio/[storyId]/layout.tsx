"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wand2, FileText, Users, Globe, Network, ShieldCheck, Settings, ListTree, Layers, MapPin, ScrollText, Download, Calendar, Radar, ArrowLeftCircle, Cpu, AlertTriangle, Send, Inbox, BookOpen, Drama, Fingerprint, Ear, Sparkles, GitCompare, Menu, X, Search, NotebookPen } from "lucide-react";
import * as api from "@/lib/api";
import { useRequireAuth, useAuthReady } from "@/lib/auth";
import { useUI, ViewMode } from "@/lib/store";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { TokenCounter } from "@/components/billing/TokenCounter";
import { useI18n, type MessageKey } from "@/lib/i18n";

const GENRE_KEYS: Record<string, MessageKey> = {
  Fantasy: "genres.fantasy",
  "Sci-Fi": "genres.scifi",
  Mystery: "genres.mystery",
  Thriller: "genres.thriller",
  Romance: "genres.romance",
  Historical: "genres.historical",
  Horror: "genres.horror",
  Literary: "genres.literary",
  Other: "genres.other",
};

const COPY = {
  en: {
    viewModes: { flow: "Flow", studio: "Studio", voice: "Voice" },
    flowTabs: {
      flow: "Flow Writing",
      chapters: "Chapters",
      characters: "Characters",
      world: "Your World",
      map: "Story Map",
      check: "Story Check",
      notes: "Notes",
      search: "Search",
    },
    voiceStudio: "Character Voice Studio",
    voiceStages: { build: "Build", write: "Write" },
    voiceTabs: {
      identity: "Identity",
      place: "Place",
      observer: "Observer",
      evolve: "Evolve",
      compare: "Compare",
    },
    studioStages: {
      foundation: "Foundation",
      characters: "Characters",
      plot: "Plot",
      write: "Write",
      produce: "Produce",
      review: "Review",
    },
    studioTabs: {
      world: "World",
      board: "Plot Board",
      characters: "Cast",
      locations: "Locations",
      factions: "Factions",
      scenes: "Scene Cards",
      threads: "Plot Threads",
      flow: "Flow",
      chapters: "Chapters",
      script: "Script",
      export: "Export",
      publish: "Publish",
      check: "Story Check",
      timeline: "Timeline",
      radar: "Continuity Radar",
      notes: "Notes",
      search: "Search",
    },
    browseStories: "Browse stories",
    readerInbox: "Reader inbox",
    llm: "LLM",
    reachable: "reachable",
    unreachable: "unreachable",
  },
  ar: {
    viewModes: { flow: "تدفّق", studio: "الاستوديو", voice: "الصوت" },
    flowTabs: {
      flow: "الكتابة المتدفقة",
      chapters: "الفصول",
      characters: "الشخصيات",
      world: "عالمك",
      map: "خريطة القصة",
      check: "فحص القصة",
      notes: "ملاحظات",
      search: "بحث",
    },
    voiceStudio: "استوديو صوت الشخصية",
    voiceStages: { build: "البناء", write: "الكتابة" },
    voiceTabs: {
      identity: "الهوية",
      place: "المكان",
      observer: "المراقب",
      evolve: "التطوّر",
      compare: "المقارنة",
    },
    studioStages: {
      foundation: "الأساس",
      characters: "الشخصيات",
      plot: "الحبكة",
      write: "الكتابة",
      produce: "الإنتاج",
      review: "المراجعة",
    },
    studioTabs: {
      world: "العالم",
      board: "لوحة الحبكة",
      characters: "طاقم الشخصيات",
      locations: "الأماكن",
      factions: "الفصائل",
      scenes: "بطاقات المشاهد",
      threads: "خيوط الحبكة",
      flow: "تدفّق",
      chapters: "الفصول",
      script: "النص",
      export: "التصدير",
      publish: "النشر",
      check: "فحص القصة",
      timeline: "الخط الزمني",
      radar: "رادار الاتساق",
      notes: "ملاحظات",
      search: "بحث",
    },
    browseStories: "تصفّح القصص",
    readerInbox: "صندوق وارد القرّاء",
    llm: "النموذج",
    reachable: "متاح",
    unreachable: "غير متاح",
  },
} as const;

const FLOW_TABS = [
  { href: "flow", icon: Wand2 },
  { href: "chapters", icon: FileText },
  { href: "characters", icon: Users },
  { href: "world", icon: Globe },
  { href: "map", icon: Network },
  { href: "check", icon: ShieldCheck },
  { href: "notes", icon: NotebookPen },
  { href: "search", icon: Search },
];

// Voice Studio is its own view (third toggle). Its sidebar links route to the
// single /voice page and drive its sub-tab via the ?tab= query param.
const VOICE_SECTIONS: Array<{ stage: string; pages: Array<{ tab: string; icon: any }> }> = [
  { stage: "Build", pages: [
    { tab: "identity", icon: Fingerprint },
    { tab: "place", icon: MapPin },
  ]},
  { stage: "Write", pages: [
    { tab: "observer", icon: Ear },
    { tab: "evolve", icon: Sparkles },
    { tab: "compare", icon: GitCompare },
  ]},
];

const STUDIO_STAGES: Array<{ stage: string; pages: Array<{ href: string; icon: any }> }> = [
  { stage: "Foundation", pages: [
    { href: "world", icon: Globe },
    { href: "board", icon: Layers },
  ]},
  { stage: "Characters", pages: [
    { href: "characters", icon: Users },
    { href: "locations", icon: MapPin },
    { href: "factions", icon: Users },
  ]},
  { stage: "Plot", pages: [
    { href: "scenes", icon: ListTree },
    { href: "threads", icon: ListTree },
  ]},
  { stage: "Write", pages: [
    { href: "flow", icon: Wand2 },
    { href: "chapters", icon: FileText },
  ]},
  { stage: "Produce", pages: [
    { href: "script", icon: ScrollText },
    { href: "export", icon: Download },
    { href: "publish", icon: Send },
  ]},
  { stage: "Review", pages: [
    { href: "check", icon: ShieldCheck },
    { href: "timeline", icon: Calendar },
    { href: "radar", icon: Radar },
    { href: "notes", icon: NotebookPen },
    { href: "search", icon: Search },
  ]},
];

// Which tabs live in only ONE view. Deep-linking / refreshing a view-exclusive
// tab must flip the sidebar to the matching view, or you get the wrong sidebar
// group with no link back to the page you're on. Tabs shared by both views keep
// whatever toggle the user had (both sidebars can navigate to them anyway).
const _FLOW_HREFS = new Set(FLOW_TABS.map(t => t.href));
const _STUDIO_HREFS = new Set(STUDIO_STAGES.flatMap(s => s.pages.map(p => p.href)));
const STUDIO_ONLY_TABS = new Set(
  [..._STUDIO_HREFS].filter(h => !_FLOW_HREFS.has(h) && h !== "publish"), // publish routes outside /studio
);
const FLOW_ONLY_TABS = new Set([..._FLOW_HREFS].filter(h => !_STUDIO_HREFS.has(h)));

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ storyId: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { viewMode, setViewMode, llmReachable, setLlmReachable } = useUI();
  const { t, locale, isRTL } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const flowLabel = (href: string) => (c.flowTabs as Record<string, string>)[href] ?? href;
  const studioTabLabel = (href: string) => (c.studioTabs as Record<string, string>)[href] ?? href;
  const studioStageLabel = (stage: string) =>
    (c.studioStages as Record<string, string>)[stage.toLowerCase()] ?? stage;
  const voiceTabLabel = (tab: string) => (c.voiceTabs as Record<string, string>)[tab] ?? tab;
  const voiceStageLabel = (stage: string) =>
    (c.voiceStages as Record<string, string>)[stage.toLowerCase()] ?? stage;

  useRequireAuth();
  // Gate data fetching until the client has mounted: before that, getToken()
  // can't read the stored bearer token, so any query fired now would 401 and only
  // recover on refetch. We hold the children (and our own queries) until then.
  const isLoaded = useAuthReady();

  // Mobile/tablet sidebar drawer (<lg). On desktop the sidebar is always visible
  // and this state is irrelevant (CSS overrides it). Close on every navigation.
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setNavOpen(false); }, [pathname, searchParams]);

  // Voice Studio is its own view. Keep the toggle and the route in sync:
  // landing on /voice (e.g. the Characters deep-link) flips the toggle to Voice.
  const onVoice = pathname === `/studio/${params.storyId}/voice`;
  const voiceTab = searchParams.get("tab") || "identity";
  useEffect(() => {
    if (onVoice && viewMode !== "voice") setViewMode("voice");
  }, [onVoice, viewMode, setViewMode]);

  // Keep the Flow/Studio toggle in sync with the route for view-exclusive tabs, so
  // refreshing or deep-linking e.g. /locations (Studio-only) or /map (Flow-only)
  // shows the correct sidebar instead of stranding you in the wrong group.
  const currentTab = pathname.split("/")[3] || "";
  useEffect(() => {
    if (onVoice) return; // /voice is handled by its own effect above
    if (STUDIO_ONLY_TABS.has(currentTab) && viewMode !== "studio") setViewMode("studio");
    else if (FLOW_ONLY_TABS.has(currentTab) && viewMode !== "flow") setViewMode("flow");
  }, [currentTab, onVoice, viewMode, setViewMode]);

  // Switching the toggle TO Voice navigates to the page; switching AWAY from it
  // while on /voice sends you to that view's home tab.
  const switchView = (m: ViewMode) => {
    setViewMode(m);
    if (m === "voice") router.push(`/studio/${params.storyId}/voice`);
    else if (onVoice) router.push(`/studio/${params.storyId}/${m === "flow" ? "flow" : "world"}`);
  };

  const { data: story } = useQuery({
    queryKey: ["story", params.storyId],
    queryFn: () => api.getStory(params.storyId),
    enabled: isLoaded && !!params.storyId,
  });

  const genreLabel = story?.genre
    ? (GENRE_KEYS[story.genre] ? t(GENRE_KEYS[story.genre]) : story.genre)
    : "";

  useQuery({
    queryKey: ["llm-status"],
    queryFn: async () => {
      try {
        const s = await api.llmStatus();
        setLlmReachable(s.reachable);
        return s;
      } catch { setLlmReachable(false); return null; }
    },
    enabled: isLoaded,
    refetchInterval: 60_000,
  });

  // Hold the shell until the client has mounted so child pages don't fire their
  // own queries before the bearer token is readable (avoids the 401-then-200 burst).
  if (!isLoaded) {
    return (
      <div className="min-h-screen grid place-items-center text-ink-text2 text-sm">
        <span className="inline-flex items-center gap-2">
          <Cpu size={14} className="animate-pulse" /> {t("common.loading")}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Mobile/tablet top bar with the menu button (hidden on desktop). */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-ink-border bg-ink-surface/95 backdrop-blur px-3 py-2">
        <button
          onClick={() => setNavOpen(true)}
          aria-label={t("nav.openMenu")}
          className="p-1.5 rounded text-ink-text2 hover:text-ink-text hover:bg-ink-surface2"
        >
          <Menu size={18} />
        </button>
        <span className="font-display truncate">{story?.title || t("common.untitled")}</span>
      </div>

      {/* Backdrop when the drawer is open (mobile only). */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-deep/55 backdrop-blur-[1px] lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:min-h-screen">
      <aside
        className={cn(
          "border-e border-ink-border bg-ink-surface flex flex-col overflow-hidden",
          // Desktop: static 260px grid column. Mobile/tablet: fixed off-canvas drawer.
          "fixed inset-y-0 start-0 z-50 w-[260px] max-w-[85vw] transition-transform duration-200 ease-out",
          "lg:static lg:z-auto lg:w-auto lg:max-w-none lg:transition-none lg:translate-x-0",
          navOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full",
        )}
      >
        <button
          onClick={() => setNavOpen(false)}
          aria-label={t("nav.closeMenu")}
          className="lg:hidden absolute top-3 end-3 p-1 rounded text-ink-text3 hover:text-ink-text z-10"
        >
          <X size={16} />
        </button>
        <div className="px-4 py-4 border-b border-ink-border">
          <Link href="/studio" className="text-xs text-ink-text2 hover:text-ink-goldLight inline-flex items-center gap-1.5">
            <ArrowLeftCircle size={14} className="rtl-flip"/> {t("common.allStories")}
          </Link>
          <h2 className="text-lg font-display mt-1 truncate">{story?.title || "…"}</h2>
          <p className="text-xs text-ink-text3">{genreLabel}</p>
          <label className="mt-2 flex items-center gap-2 text-[10px] text-ink-text3">
            <span className="uppercase tracking-[0.12em]">{t("studio.writingLanguage")}</span>
            <select
              value={story?.language || "en"}
              onChange={async (e) => {
                const language = e.target.value as "en" | "ar";
                await api.updateStory(params.storyId, { language });
                qc.invalidateQueries({ queryKey: ["story", params.storyId] });
                qc.invalidateQueries({ queryKey: ["stories"] });
              }}
              className="rounded border border-ink-border bg-ink-surface2 px-1 py-0.5 text-[10px] text-ink-text"
            >
              <option value="ar">{t("studio.languageArabic")}</option>
              <option value="en">{t("studio.languageEnglish")}</option>
            </select>
          </label>
        </div>

        <div className="px-4 py-3 border-b border-ink-border">
          <div className="grid grid-cols-3 gap-1 bg-ink-surface2 border border-ink-border rounded-md p-1">
            {([["flow", "Flow"], ["studio", "Studio"], ["voice", "Voice"]] as [ViewMode, string][]).map(([m]) => (
              <button
                key={m}
                onClick={() => switchView(m)}
                className={cn(
                  "text-xs py-1.5 px-1 rounded uppercase tracking-wide transition-colors",
                  viewMode === m ? "bg-ink-gold text-ink-deep" : "text-ink-text2 hover:text-ink-text",
                )}
              >{c.viewModes[m]}</button>
            ))}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {viewMode === "voice" ? (
            <div className="space-y-4">
              <Link href={`/studio/${params.storyId}/voice`} className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                onVoice ? "bg-ink-gold/10 text-ink-goldLight border border-ink-gold/30" : "text-ink-text2 hover:text-ink-text hover:bg-ink-surface2",
              )}>
                <Drama size={14}/> {c.voiceStudio}
              </Link>
              {VOICE_SECTIONS.map(s => (
                <div key={s.stage}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-text3 px-2 mb-1">{voiceStageLabel(s.stage)}</p>
                  <ul className="space-y-0.5">
                    {s.pages.map(p => {
                      const active = onVoice && voiceTab === p.tab;
                      const Icon = p.icon;
                      return (
                        <li key={p.tab}>
                          <Link href={`/studio/${params.storyId}/voice?tab=${p.tab}`} className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded text-sm",
                            active ? "bg-ink-gold/10 text-ink-goldLight" : "text-ink-text2 hover:text-ink-text",
                          )}>
                            <Icon size={12}/> {voiceTabLabel(p.tab)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : viewMode === "flow" ? (
            <ul className="space-y-1">
              {FLOW_TABS.map(tab => {
                const href = `/studio/${params.storyId}/${tab.href}`;
                const active = pathname === href;
                const Icon = tab.icon;
                return (
                  <li key={tab.href}>
                    <Link href={href} className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      active ? "bg-ink-gold/10 text-ink-goldLight border border-ink-gold/30" : "text-ink-text2 hover:text-ink-text hover:bg-ink-surface2",
                    )}>
                      <Icon size={14} /> {flowLabel(tab.href)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="space-y-4">
              {STUDIO_STAGES.map(s => (
                <div key={s.stage}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-text3 px-2 mb-1">{studioStageLabel(s.stage)}</p>
                  <ul className="space-y-0.5">
                    {s.pages.map(p => {
                      const href = p.href === "publish"
                        ? `/publish/${params.storyId}`
                        : `/studio/${params.storyId}/${p.href}`;
                      const active = pathname === href;
                      const Icon = p.icon;
                      return (
                        <li key={p.href}>
                          <Link href={href} className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded text-sm",
                            active ? "bg-ink-gold/10 text-ink-goldLight" : "text-ink-text2 hover:text-ink-text",
                          )}>
                            <Icon size={12}/> {studioTabLabel(p.href)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-ink-border text-xs space-y-0.5">
          <Link href="/" className="flex items-center gap-2 px-2 py-1.5 text-ink-text2 hover:text-ink-text">
            <BookOpen size={12}/> {c.browseStories}
          </Link>
          <Link href="/inbox" className="flex items-center gap-2 px-2 py-1.5 text-ink-text2 hover:text-ink-text">
            <Inbox size={12}/> {c.readerInbox}
          </Link>
          <Link href="/settings" className="flex items-center gap-2 px-2 py-1.5 text-ink-text2 hover:text-ink-text">
            <Settings size={12}/> {t("common.settings")}
          </Link>
          <ThemeToggle className="w-full justify-start" />
          <div className="border-t border-ink-border my-1" />
          <UsageMeter />
          <TokenCounter />
          <div className="flex items-center gap-2 px-2 py-1.5 text-ink-text3">
            <Cpu size={12}/>
            <span>{c.llm}: </span>
            {llmReachable === null && <span>…</span>}
            {llmReachable === true && <span className="text-ink-green">{c.reachable}</span>}
            {llmReachable === false && <span className="text-ink-red inline-flex items-center gap-1"><AlertTriangle size={10}/>{c.unreachable}</span>}
          </div>
          <div className="px-2 pt-1 pb-0.5">
            <span className="text-ink-gold uppercase tracking-[0.2em]">{t("studio.coWriter")}</span>
            <span className="text-ink-text3 mx-1">·</span>
            <span className="text-ink-text3 uppercase tracking-[0.15em]">G-Ink Studio</span>
          </div>
        </div>
      </aside>
      <main className="min-w-0 overflow-x-hidden p-4 sm:p-6 scrollbar-thin">{children}</main>
      </div>
    </>
  );
}

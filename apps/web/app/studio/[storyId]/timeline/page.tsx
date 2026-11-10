"use client";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Card, FG, PageHdr, Sel, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

type Order = "story" | "reading";
type Group = "none" | "pov" | "thread" | "location";

const COPY = {
  en: {
    title: "Memory Timeline",
    subtitle: "Scene chronology, story-time anchors, and continuity lanes.",
    order: "Order",
    group: "Group",
    storyTime: "Story time",
    readingOrder: "Reading order",
    none: "None",
    pov: "POV",
    plotThread: "Plot thread",
    location: "Location",
    noPov: "No POV",
    noLocation: "No location",
    noThread: "No thread",
    timelineGroup: "Timeline",
    empty: "No scene cards yet. Approve a Flow draft or add scenes manually.",
    chapterShort: "Ch",
    sceneShort: "Scene",
    untitled: "Untitled scene",
    povTag: "POV: {name}",
  },
  ar: {
    title: "الخط الزمني للذاكرة",
    subtitle: "تسلسل المشاهد ومراسي زمن القصة ومسارات الاتساق.",
    order: "الترتيب",
    group: "التجميع",
    storyTime: "زمن القصة",
    readingOrder: "ترتيب القراءة",
    none: "بلا",
    pov: "وجهة النظر",
    plotThread: "خيط الحبكة",
    location: "المكان",
    noPov: "بلا وجهة نظر",
    noLocation: "بلا مكان",
    noThread: "بلا خيط",
    timelineGroup: "الخط الزمني",
    empty: "لا توجد بطاقات مشاهد بعد. اعتمد مسودة من الكتابة المتدفقة أو أضف مشاهد يدويًا.",
    chapterShort: "ف",
    sceneShort: "مشهد",
    untitled: "مشهد بلا عنوان",
    povTag: "وجهة النظر: {name}",
  },
} as const;

export default function TimelinePage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [order, setOrder] = useState<Order>("story");
  const [group, setGroup] = useState<Group>("none");
  const { data: scenes } = useQuery({ queryKey: ["timeline", storyId, order], queryFn: () => api.listTimeline(storyId, order) });

  const groups = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const scene of scenes || []) {
      let key = c.timelineGroup;
      if (group === "pov") key = scene.pov_name || c.noPov;
      else if (group === "location") key = scene.location_name || c.noLocation;
      else if (group === "thread") key = (scene.plot_thread_names || [])[0] || c.noThread;
      map[key] = [...(map[key] || []), scene];
    }
    return Object.entries(map);
  }, [scenes, group, c]);

  return (
    <div className="max-w-5xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2">
          <FG label={c.order}>
            <Sel value={order} onChange={e => setOrder(e.target.value as Order)}>
              <option value="story">{c.storyTime}</option>
              <option value="reading">{c.readingOrder}</option>
            </Sel>
          </FG>
          <FG label={c.group}>
            <Sel value={group} onChange={e => setGroup(e.target.value as Group)}>
              <option value="none">{c.none}</option>
              <option value="pov">{c.pov}</option>
              <option value="thread">{c.plotThread}</option>
              <option value="location">{c.location}</option>
            </Sel>
          </FG>
        </div>
      </Card>

      {groups.length === 0 && <Card><p className="text-ink-text2">{c.empty}</p></Card>}
      <div className="space-y-6">
        {groups.map(([name, rows]) => (
          <section key={name}>
            {group !== "none" && <h2 className="font-display text-xl mb-3">{name}</h2>}
            <ol className="relative border-s border-ink-border ms-3 ps-6 space-y-4">
              {rows.map((s: any) => (
                <li key={s.id} className="relative">
                  <span className="absolute start-[-33px] top-2 w-3 h-3 rounded-full bg-ink-gold border border-ink-deep" />
                  <Card>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-ink-text3">{c.chapterShort} {s.chapter_number == null ? "?" : formatNumber(s.chapter_number)} · {c.sceneShort} {formatNumber(s.ordinal || 0)}</span>
                      <h3 className="font-display text-lg">{s.title || s.beat || c.untitled}</h3>
                    </div>
                    {s.summary && <p className="text-sm text-ink-text2 mb-2">{s.summary}</p>}
                    <div className="flex flex-wrap gap-1">
                      {s.time_anchor && <Tag color="gold">{s.time_anchor}</Tag>}
                      {s.duration_hint && <Tag color="muted">{s.duration_hint}</Tag>}
                      {s.pov_name && <Tag color="gold">{c.povTag.replace("{name}", s.pov_name)}</Tag>}
                      {s.location_name && <Tag color="rose">{s.location_name}</Tag>}
                      {(s.plot_thread_names || []).map((name: string) => <Tag key={name} color="green">{name}</Tag>)}
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Network } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, PageHdr, Tag } from "@/components/ui/Primitives";
import { StoryMap } from "@/components/graph/StoryMap";
import { useI18n } from "@/lib/i18n";

export default function MapPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar"
    ? {
        title: "خريطة القصة",
        subtitle: "ذهبي = الشخصيات · وردي = الفصول · أخضر = الموضوعات · سماوي = الأماكن · بنفسجي = التنظيمات. اسحب ومرّر للتكبير.",
        sourceFallback: "قاعدة البيانات (احتياطي)",
        reprojecting: "جارٍ إعادة الإسقاط…",
        reproject: "إعادة إسقاط الخريطة",
        loading: "جارٍ تحميل الخريطة…",
        empty: "لا توجد كيانات بعد. أضف شخصيات أو فصولًا لترى خريطتك تنبض بالحياة.",
      }
    : {
        title: "Story Map",
        subtitle: "Gold = characters · rose = chapters · green = themes · cyan = locations · purple = factions. Drag, scroll to zoom.",
        sourceFallback: "Postgres fallback",
        reprojecting: "Re-projecting…",
        reproject: "Re-project graph",
        loading: "Loading graph…",
        empty: "No entities yet. Add characters or chapters to see your map come alive.",
      };
  const { data, isLoading } = useQuery({ queryKey: ["graph", storyId], queryFn: () => api.graphView(storyId) });
  const reproject = useMutation({
    mutationKey: ["llm", "graph.reproject"],
    mutationFn: () => api.graphReproject(storyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["graph", storyId] }),
  });

  return (
    <div className="max-w-6xl">
      <PageHdr
        title={`🗺 ${c.title}`}
        subtitle={c.subtitle}
        right={
          <div className="flex items-center gap-2">
            {data && <Tag color="muted"><Network size={10}/> {data.source === "neo4j" ? "Neo4j" : c.sourceFallback}</Tag>}
            <Btn onClick={() => reproject.mutate()} disabled={reproject.isPending}>
              <RefreshCw size={14} className={reproject.isPending ? "animate-spin" : undefined} />
              {reproject.isPending ? c.reprojecting : c.reproject}
            </Btn>
          </div>
        }
      />
      {isLoading && <p className="text-ink-text2">{c.loading}</p>}
      {data && data.nodes.length === 0 && (
        <Card><p className="text-ink-text2">{c.empty}</p></Card>
      )}
      {data && data.nodes.length > 0 && <StoryMap data={data as any} />}
    </div>
  );
}

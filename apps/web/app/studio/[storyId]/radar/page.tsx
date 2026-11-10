"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Radar, Search } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    title: "Continuity Radar",
    subtitle:
      "What does the AI see for a given question? Inspect the Graph-RAG slice that gets fed into Story Check, Companion, and Flow Writing.",
    reindexing: "Reindexing…",
    reindex: "Reindex story vectors",
    query: "Query",
    queryPlaceholder: "e.g. Aiden and the broken pact",
    retrieving: "Retrieving…",
    showRetrieval: "Show retrieval",
    context: "Graph-RAG context",
    noRetrievalBefore:
      "No retrieval — either Qdrant/Neo4j are unreachable, or the story has no embedded content yet. Click ",
    reindexInline: "Reindex story vectors",
    noRetrievalAfter: " above.",
    qdrantBefore: "Qdrant is not running. Start it with ",
    qdrantAfter:
      " — it launches Qdrant automatically via Docker. Vector search will be unavailable until then.",
    indexFailed: "Indexing failed:",
    indexedSuccess: "Indexed {count} vectors successfully.",
  },
  ar: {
    title: "رادار الاتساق",
    subtitle:
      "ما الذي يراه الذكاء الاصطناعي عند طرح سؤال معيّن؟ افحص شريحة Graph-RAG التي تُغذّى إلى فحص القصة ورفيق الكتابة والكتابة المتدفقة.",
    reindexing: "جارٍ إعادة الفهرسة…",
    reindex: "إعادة فهرسة متجهات القصة",
    query: "الاستعلام",
    queryPlaceholder: "مثال: أيدن والميثاق المكسور",
    retrieving: "جارٍ الاسترجاع…",
    showRetrieval: "عرض الاسترجاع",
    context: "سياق Graph-RAG",
    noRetrievalBefore:
      "لا يوجد استرجاع — إما أن Qdrant أو Neo4j غير متاحين، أو أن القصة لا تحتوي على محتوى مُضمَّن بعد. اضغط ",
    reindexInline: "إعادة فهرسة متجهات القصة",
    noRetrievalAfter: " أعلاه.",
    qdrantBefore: "Qdrant لا يعمل. شغّله بالأمر ",
    qdrantAfter: " — فهو يُطلق Qdrant تلقائيًا عبر Docker. سيبقى البحث المتجهي غير متاح حتى ذلك الحين.",
    indexFailed: "فشلت الفهرسة:",
    indexedSuccess: "تمت فهرسة {count} من المتجهات بنجاح.",
  },
} as const;

export default function RadarPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [q, setQ] = useState("");
  const preview = useMutation({
    mutationKey: ["llm", "rag.preview"],
    mutationFn: (query: string) => api.ragPreview(storyId, query),
  });
  const reindex = useMutation({
    mutationKey: ["llm", "rag.reindex"],
    mutationFn: () => api.ragReindex(storyId),
  });

  return (
    <div className="max-w-3xl">
      <PageHdr
        title={c.title}
        subtitle={c.subtitle}
        right={<Btn onClick={() => reindex.mutate()} disabled={reindex.isPending}>{reindex.isPending ? c.reindexing : c.reindex}</Btn>}
      />
      <Card className="mb-4">
        <FG label={c.query}><Inp value={q} onChange={e => setQ(e.target.value)} placeholder={c.queryPlaceholder} onKeyDown={e => e.key === "Enter" && q.trim() && preview.mutate(q)} /></FG>
        <div className="flex justify-end"><Btn variant="primary" disabled={!q.trim() || preview.isPending} onClick={() => preview.mutate(q)}><Search size={14}/> {preview.isPending ? c.retrieving : c.showRetrieval}</Btn></div>
      </Card>
      {preview.data && (
        <Card>
          <h3 className="font-display text-lg mb-2 flex items-center gap-2"><Radar size={16}/> {c.context}</h3>
          {preview.data.block ? (
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-ink-text">{preview.data.block}</pre>
          ) : (
            <p className="text-sm text-ink-text2">{c.noRetrievalBefore}<em>{c.reindexInline}</em>{c.noRetrievalAfter}</p>
          )}
        </Card>
      )}
      {reindex.data && (
        <Card className="mt-4">
          {reindex.data.reason === "qdrant_unavailable" ? (
            <p className="text-sm text-ink-red">
              {c.qdrantBefore}<code className="font-mono bg-ink-surface2 px-1 rounded">./run.sh</code>{c.qdrantAfter}
            </p>
          ) : reindex.data.reason ? (
            <p className="text-sm text-ink-red">{c.indexFailed} {reindex.data.reason}</p>
          ) : (
            <p className="text-sm text-ink-green">{c.indexedSuccess.replace("{count}", formatNumber(reindex.data.indexed))}</p>
          )}
        </Card>
      )}
    </div>
  );
}

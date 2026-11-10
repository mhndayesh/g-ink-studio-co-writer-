"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import * as api from "@/lib/api";
import { Card, Inp, PageHdr, QueryError, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    title: "Search",
    subtitle: "Search the manuscript, cast, world bible, scenes, threads, and notes.",
    placeholder: "Type at least 2 characters…",
    empty: "No matches.",
    hint: "Try a character name, a place, a line of prose, or a thread.",
    kinds: { chapter: "Chapter", character: "Character", location: "Location", faction: "Faction", thread: "Thread", scene: "Scene", note: "Note" },
  },
  ar: {
    title: "بحث",
    subtitle: "ابحث في المخطوطة والشخصيات ودليل العالم والمشاهد والخيوط والملاحظات.",
    placeholder: "اكتب حرفين على الأقل…",
    empty: "لا توجد نتائج.",
    hint: "جرّب اسم شخصية أو مكانًا أو سطرًا من النص أو خيطًا.",
    kinds: { chapter: "فصل", character: "شخصية", location: "مكان", faction: "فصيل", thread: "خيط", scene: "مشهد", note: "ملاحظة" },
  },
} as const;

export default function SearchPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["search", storyId, query],
    queryFn: () => api.searchStory(storyId, query),
    enabled: query.length >= 2,
  });

  const hrefFor = (hit: any) => {
    switch (hit.kind) {
      case "chapter": return `/studio/${storyId}/chapters?chapter=${hit.id}`;
      case "scene": return `/studio/${storyId}/scenes?scene=${hit.id}`;
      case "character": return `/studio/${storyId}/characters?character=${hit.id}`;
      case "location": return `/studio/${storyId}/locations`;
      case "faction": return `/studio/${storyId}/factions`;
      case "thread": return `/studio/${storyId}/threads`;
      case "note": return `/studio/${storyId}/notes?note=${hit.id}`;
      default: return `/studio/${storyId}`;
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />
      <Card className="mb-4">
        <div className="relative">
          <SearchIcon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-text3" />
          <Inp
            autoFocus
            className="ps-9"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={c.placeholder}
          />
        </div>
        {isFetching && <p className="text-xs text-ink-text3 mt-2">{c.title}…</p>}
      </Card>

      {isError && <QueryError error={error} retry={refetch} what={c.title} />}

      {query.length < 2 && <p className="text-sm text-ink-text3">{c.hint}</p>}

      {query.length >= 2 && data && (
        <ul className="space-y-2">
          {data.hits.map((hit: any) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <Link href={hrefFor(hit)}>
                <Card className="hover:border-ink-gold/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag color={hit.kind === "chapter" ? "gold" : "muted"}>
                      {(c.kinds as Record<string, string>)[hit.kind] ?? hit.kind}
                    </Tag>
                    <strong>{hit.title}</strong>
                    {hit.kind === "chapter" && hit.meta?.number ? <span className="text-xs text-ink-text3">#{formatNumber(hit.meta.number)}</span> : null}
                  </div>
                  {hit.snippet && <p className="text-sm text-ink-text2 line-clamp-2">{hit.snippet}</p>}
                </Card>
              </Link>
            </li>
          ))}
          {data.hits.length === 0 && <li className="text-sm text-ink-text3">{c.empty}</li>}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/lib/auth";
import * as api from "@/lib/api";
import PublishingHub from "@/components/publishing/PublishingHub";
import ExportHub from "@/components/publishing/ExportHub";
import { useI18n, type Locale } from "@/lib/i18n";

const copyEn = {
  heading: "Publishing",
  manageFor: (title: string) => `Manage the public page for “${title}”`,
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    heading: "النشر",
    manageFor: (title: string) => `إدارة الصفحة العامة لقصة «${title}»`,
  },
};

export default function PublishPage() {
  const params = useParams<{ storyId: string }>();
  const { locale } = useI18n();
  const c = COPY[locale];
  useRequireAuth();

  const { data: story } = useQuery({
    queryKey: ["story", params.storyId],
    queryFn: () => api.getStory(params.storyId),
    enabled: !!params.storyId,
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", params.storyId],
    queryFn: () => api.listChapters(params.storyId),
    enabled: !!params.storyId,
  });

  if (!story) return null;

  const totalWords = (chapters as any[]).reduce(
    (s: number, c: any) => s + (c.word_count ?? 0),
    0
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-ink-text">{c.heading}</h1>
        <p className="text-ink-text2 text-sm mt-1">
          {c.manageFor(story.title)}
        </p>
      </div>

      <PublishingHub
        storyId={params.storyId}
        storyTitle={story.title}
        storyChapters={(chapters as any[]).map((c: any) => ({
          id: c.id,
          number: c.number,
          title: c.title,
          word_count: c.word_count,
        }))}
      />

      <div className="border-t border-ink-text2/10 pt-8">
        <ExportHub
          storyId={params.storyId}
          storyTitle={story.title}
          chapterCount={(chapters as any[]).length}
          wordCount={totalWords}
        />
      </div>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import ReadingView from "@/components/reader/ReadingView";
import { useIsAuthed } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: { invalidChapter: "Invalid chapter." },
  ar: { invalidChapter: "فصل غير صالح." },
} as const;

export default function ChapterPage() {
  const params = useParams<{ slug: string; chapter: string }>();
  const authed = useIsAuthed();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const chapterNum = parseInt(params.chapter, 10);

  if (isNaN(chapterNum) || chapterNum < 1) {
    return <p className="p-8 text-ink-text2">{c.invalidChapter}</p>;
  }

  return (
    <ReadingView
      slug={params.slug}
      chapterNumber={chapterNum}
      storyTitle=""
      authorName=""
      isAuthenticated={authed}
    />
  );
}

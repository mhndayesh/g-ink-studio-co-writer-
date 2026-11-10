"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Card, PageHdr } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    title: "Chapter Script",
    subtitle: "Manuscript view of every chapter, in order. Use Chapters tab to edit.",
    chapter: "Chapter",
    empty: "(empty)",
    noChapters: "No chapters yet. Write your first scene in Flow Writing.",
  },
  ar: {
    title: "نص الفصول",
    subtitle: "عرض مخطوطة كل فصل بالترتيب. استخدم تبويب الفصول للتحرير.",
    chapter: "الفصل",
    empty: "(فارغ)",
    noChapters: "لا توجد فصول بعد. اكتب مشهدك الأول في الكتابة المتدفقة.",
  },
} as const;

export default function ScriptPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { t, locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data: chapters } = useQuery({ queryKey: ["chapters", storyId], queryFn: () => api.listChapters(storyId) });

  return (
    <div className="max-w-4xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />
      {(chapters || []).map((chapter: any) => (
        <Card key={chapter.id} className="mb-4">
          <p className="text-xs text-ink-text2">{c.chapter} {formatNumber(chapter.number)}</p>
          <h2 className="font-display text-2xl mt-1 mb-3">{chapter.title || t("common.untitled")}</h2>
          {chapter.summary && <p className="italic text-ink-text2 mb-3">{chapter.summary}</p>}
          <pre className="whitespace-pre-wrap leading-relaxed text-base font-body text-ink-text">{chapter.content || c.empty}</pre>
        </Card>
      ))}
      {(!chapters || chapters.length === 0) && <Card><p className="text-ink-text2">{c.noChapters}</p></Card>}
    </div>
  );
}

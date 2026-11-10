"use client";
// apps/web/components/publishing/ExportHub.tsx
//
// Writer's export UI. Allows downloading PDF, EPUB, DOCX, and full submission package.

import { useState } from "react";
import { getToken } from "@/lib/auth";
import { useI18n, type Locale } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface ExportHubProps {
  storyId: string;
  storyTitle: string;
  chapterCount: number;
  wordCount: number;
}

interface ExportFormat {
  key: "pdf" | "epub" | "docx" | "package";
  label: string;
  description: string;
  icon: string;
  tag?: string;
  color: string;
}

const copyEn = {
  heading: "Export Hub",
  subtitle: (title: string, chapters: string, isOneChapter: boolean, words: string) =>
    `Download "${title}" — ${chapters} chapter${isOneChapter ? "" : "s"}, ${words}`,
  pdfDesc: "Styled reading copy. Cover page, serif body text, page numbers.",
  epubDesc: "For e-readers (Kindle, Kobo, Apple Books). Properly formatted with TOC.",
  docxLabel: "Word doc",
  docxDesc: "Shunn standard manuscript format — double-spaced Courier, 1″ margins, headers.",
  docxTag: "Agent-ready",
  packageLabel: "Submission package",
  packageDesc: "All three formats + auto-generated synopsis + README, zipped for agent submission.",
  packageTag: "All-in-one",
  done: "✓ Done",
  generating: "Generating…",
  download: "Download",
  note: "Exports include all chapters with content. The submission package contains a one-page auto-generated synopsis and a README with word count and metadata. Drafts with no content are skipped.",
  exportFailed: "Export failed",
  wordsSuffix: "words",
  thousandsSuffix: "k",
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    heading: "مركز التصدير",
    subtitle: (title: string, chapters: string, _isOneChapter: boolean, words: string) =>
      `تنزيل «${title}» — الفصول: ${chapters} · الكلمات: ${words}`,
    pdfDesc: "نسخة قراءة منسّقة: صفحة غلاف، ونص بأحرف مذيَّلة، وأرقام صفحات.",
    epubDesc: "للقارئات الإلكترونية (Kindle وKobo وApple Books)، منسّقة بعناوين فصول.",
    docxLabel: "مستند Word",
    docxDesc: "تنسيق Shunn القياسي للمخطوطات — Courier بتباعد مزدوج، وهوامش إنش واحد، وترويسات.",
    docxTag: "جاهز للوكلاء",
    packageLabel: "حزمة التقديم",
    packageDesc: "الصيغ الثلاث مع ملخص مُولَّد تلقائيًا وملف README، مضغوطة لتقديمها لوكيل أدبي.",
    packageTag: "شاملة",
    done: "✓ تم",
    generating: "جارٍ التوليد…",
    download: "تنزيل",
    note: "تشمل عمليات التصدير جميع الفصول التي تحتوي نصًّا. وتضم حزمة التقديم ملخصًا من صفحة واحدة مُولَّدًا تلقائيًا وملف README بعدد الكلمات والبيانات الوصفية. وتُستثنى المسودات الفارغة.",
    exportFailed: "تعذّر التصدير",
    wordsSuffix: "كلمة",
    thousandsSuffix: " ألف",
  },
};

export default function ExportHub({
  storyId, storyTitle, chapterCount, wordCount,
}: ExportHubProps) {
  const { locale, formatNumber } = useI18n();
  const c = COPY[locale];
  const [downloading, setDownloading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handleDownload = async (format: ExportFormat["key"]) => {
    setDownloading(format);
    try {
      // Attach the bearer token and hit the API host directly — this is a binary
      // download, so it bypasses the JSON `request()` helper in lib/api.
      const token = await getToken();
      const res = await fetch(`${API_BASE}/v1/export/${storyId}/${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(c.exportFailed);

      const disposition = res.headers.get("content-disposition") || "";
      const match       = disposition.match(/filename="([^"]+)"/);
      const filename    = match ? match[1] : `${storyTitle}.${format}`;

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setDone(format);
      setTimeout(() => setDone(null), 3000);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setDownloading(null);
    }
  };

  const formats: ExportFormat[] = [
    {
      key:         "pdf",
      label:       "PDF",
      description: c.pdfDesc,
      icon:        "📄",
      color:       "#E53E3E",
    },
    {
      key:         "epub",
      label:       "EPUB",
      description: c.epubDesc,
      icon:        "📱",
      color:       "#3182CE",
    },
    {
      key:         "docx",
      label:       c.docxLabel,
      description: c.docxDesc,
      icon:        "📝",
      tag:         c.docxTag,
      color:       "#2B6CB0",
    },
    {
      key:         "package",
      label:       c.packageLabel,
      description: c.packageDesc,
      icon:        "📦",
      tag:         c.packageTag,
      color:       "#C0974F",
    },
  ];

  const wordsDisplay =
    wordCount > 999
      ? `${formatNumber(Math.round(wordCount / 1000))}${c.thousandsSuffix} ${c.wordsSuffix}`
      : `${formatNumber(wordCount)} ${c.wordsSuffix}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-ink-text">{c.heading}</h3>
        <p className="text-sm text-ink-text2 mt-1">
          {c.subtitle(storyTitle, formatNumber(chapterCount), chapterCount === 1, wordsDisplay)}
        </p>
      </div>

      {/* Format cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {formats.map(fmt => {
          const isLoading = downloading === fmt.key;
          const isDone    = done === fmt.key;

          return (
            <div
              key={fmt.key}
              className="group bg-ink-bg2 rounded-xl border border-ink-text2/10 p-4 hover:border-ink-text2/25 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{fmt.icon}</span>
                    <span className="text-sm font-semibold text-ink-text">{fmt.label}</span>
                    {fmt.tag && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${fmt.color}18`,
                          color: fmt.color,
                          border: `1px solid ${fmt.color}30`,
                        }}
                      >
                        {fmt.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-text2 leading-relaxed">{fmt.description}</p>
                </div>

                <button
                  onClick={() => handleDownload(fmt.key)}
                  disabled={!!downloading}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition disabled:opacity-50"
                  style={
                    isDone
                      ? { background: "#22C55E15", color: "#22C55E", borderColor: "#22C55E30" }
                      : isLoading
                      ? { background: `${fmt.color}10`, color: fmt.color, borderColor: `${fmt.color}25` }
                      : {
                          background: "transparent",
                          color: fmt.color,
                          borderColor: `${fmt.color}35`,
                        }
                  }
                >
                  {isDone ? (
                    c.done
                  ) : isLoading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      {c.generating}
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {c.download}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <p className="text-xs text-ink-text2/60 leading-relaxed">
        {c.note}
      </p>
    </div>
  );
}

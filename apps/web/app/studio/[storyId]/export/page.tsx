"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Download, FileText, FileJson, FileType } from "lucide-react";
import * as api from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Btn, Card, PageHdr } from "@/components/ui/Primitives";
import { useI18n, type Locale } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const copyEn = {
  title: "Export",
  subtitle: "Pull your story out of the studio.",
  markdownDesc: "A clean manuscript with chapters, summaries, and cast.",
  docxDesc: "For Word, Google Docs, beta-reader review.",
  backupTitle: "Backup bundle (JSON)",
  backupDesc: "Story Forge-compatible snapshot. Re-importable.",
  download: "Download",
};

type Copy = typeof copyEn;

const COPY: Record<Locale, Copy> = {
  en: copyEn,
  ar: {
    title: "التصدير",
    subtitle: "أخرِج قصتك من الاستوديو.",
    markdownDesc: "مخطوطة نظيفة تتضمن الفصول والملخصات والشخصيات.",
    docxDesc: "لمراجعة القرّاء التجريبيين عبر Word وGoogle Docs.",
    backupTitle: "حزمة نسخ احتياطي (JSON)",
    backupDesc: "نسخة متوافقة مع Story Forge وقابلة لإعادة الاستيراد.",
    download: "تنزيل",
  },
};

export default function ExportPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { locale } = useI18n();
  const c = COPY[locale];
  const [busy, setBusy] = useState("");

  async function downloadBlob(path: string, filename: string) {
    setBusy(filename);
    try {
      const token = await getToken();
      const r = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setBusy(""); }
  }

  async function downloadBundle() {
    setBusy("bundle");
    try {
      const bundle = await api.exportBundle(storyId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `story_${storyId}.bundle.json`; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setBusy(""); }
  }

  return (
    <div className="max-w-2xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />
      <Card className="mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><h3 className="font-display text-lg"><FileText size={16} className="inline me-1"/> Markdown</h3><p className="text-sm text-ink-text2">{c.markdownDesc}</p></div>
          <Btn variant="primary" disabled={busy !== ""} onClick={() => downloadBlob(`/v1/stories/${storyId}/export/markdown`, `story_${storyId}.md`)}><Download size={14}/> {busy === `story_${storyId}.md` ? "…" : c.download}</Btn>
        </div>
      </Card>
      <Card className="mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><h3 className="font-display text-lg"><FileType size={16} className="inline me-1"/> DOCX</h3><p className="text-sm text-ink-text2">{c.docxDesc}</p></div>
          <Btn variant="primary" disabled={busy !== ""} onClick={() => downloadBlob(`/v1/stories/${storyId}/export/docx`, `story_${storyId}.docx`)}><Download size={14}/> {busy === `story_${storyId}.docx` ? "…" : c.download}</Btn>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><h3 className="font-display text-lg"><FileJson size={16} className="inline me-1"/> {c.backupTitle}</h3><p className="text-sm text-ink-text2">{c.backupDesc}</p></div>
          <Btn variant="primary" disabled={busy !== ""} onClick={downloadBundle}><Download size={14}/> {busy === "bundle" ? "…" : c.download}</Btn>
        </div>
      </Card>
    </div>
  );
}

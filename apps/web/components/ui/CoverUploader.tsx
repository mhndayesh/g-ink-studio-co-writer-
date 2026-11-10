"use client";
import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { uploadImage, mediaUrl } from "@/lib/api";
import { Btn } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

// Reusable cover-art picker: shows the current cover, uploads a new file (the API
// validates + re-encodes it), and reports the resulting URL via onChange. Used for
// project covers, chapter covers, and publication covers.
export function CoverUploader({
  value,
  onChange,
  label,
  aspect = "3 / 4",
  width = 88,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: string;
  width?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locale } = useI18n();
  const c = locale === "ar"
    ? {
        cover: "صورة الغلاف",
        replace: "استبدال",
        upload: "رفع",
        remove: "إزالة",
        hint: "PNG/JPG/WEBP/GIF، حتى 5 ميغابايت.",
        failed: "فشل الرفع",
        alt: "غلاف",
      }
    : {
        cover: "Cover image",
        replace: "Replace",
        upload: "Upload",
        remove: "Remove",
        hint: "PNG/JPG/WEBP/GIF, up to 5 MB.",
        failed: "Upload failed",
        alt: "cover",
      };

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const src = mediaUrl(value);
  return (
    <div>
      {(label ?? c.cover) && <label className="label">{label ?? c.cover}</label>}
      <div className="flex items-start gap-3 mt-1">
        <div
          className="relative rounded-md border border-ink-border bg-ink-surface2 overflow-hidden shrink-0"
          style={{ width, aspectRatio: aspect }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={c.alt} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-ink-text3">
              <ImagePlus size={20} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onPick}
          />
          <Btn variant="ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {src ? c.replace : c.upload}
          </Btn>
          {src && (
            <Btn variant="ghost" disabled={busy} onClick={() => onChange(null)}>
              <X size={14} /> {c.remove}
            </Btn>
          )}
          <p className="text-xs text-ink-text3">{c.hint}</p>
          {error && <p className="text-xs text-ink-red">{error}</p>}
        </div>
      </div>
    </div>
  );
}

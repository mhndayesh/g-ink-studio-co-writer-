"use client";
// Route-level error boundary. Without this, any render-time throw (e.g. an
// unexpected API response shape) crashes to React's blank screen with no recovery.
// Catches errors in the page tree below the root layout and offers a retry / home.
import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale } = useI18n();
  const c = locale === "ar"
    ? {
        title: "حدث خطأ ما",
        body: "قاطع هذا الخطأ غير المتوقع الصفحة. عملك المحفوظ آمن.",
        retry: "حاول مرة أخرى",
        home: "الرئيسية",
      }
    : {
        title: "Something went wrong",
        body: "An unexpected error interrupted this page. Your saved work is safe.",
        retry: "Try again",
        home: "Go home",
      };

  useEffect(() => {
    // Surface to the console (and any wired error reporter) so it isn't swallowed.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-2xl text-ink-text">{c.title}</h1>
      <p className="mt-2 text-sm text-ink-text2">{c.body}</p>
      {error?.message && (
        <p className="mt-2 break-words text-xs text-ink-text3">{error.message}</p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button className="btn btn-primary" onClick={() => reset()}>{c.retry}</button>
        <Link className="btn btn-ghost" href="/">{c.home}</Link>
      </div>
    </main>
  );
}

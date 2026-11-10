"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { locale } = useI18n();
  const c = locale === "ar"
    ? {
        title: "الصفحة غير موجودة",
        body: "قد يكون الرابط قديمًا أو أن الصفحة نُقلت. يمكنك العودة إلى الرئيسية.",
        home: "العودة إلى الرئيسية",
      }
    : {
        title: "Page not found",
        body: "The link may be outdated or the page may have moved. You can return to the hub.",
        home: "Back to the hub",
      };

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-ink-gold">404</p>
      <h1 className="font-display text-2xl text-ink-text">{c.title}</h1>
      <p className="mt-2 text-sm text-ink-text2">{c.body}</p>
      <Link className="btn btn-primary mt-6 inline-flex" href="/">{c.home}</Link>
    </main>
  );
}

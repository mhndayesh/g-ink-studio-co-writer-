"use client";
// Last-resort boundary for errors thrown in the ROOT layout itself (which the
// route-level app/error.tsx cannot catch). It replaces the whole document, so it
// must render its own <html>/<body>. Kept dependency-free (inline styles) so it
// works even if app CSS/providers are what failed.
import { useEffect, useState } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [isAr, setIsAr] = useState(false);
  useEffect(() => {
    console.error(error);
    setIsAr(document.documentElement.lang === "ar" || navigator.language.toLowerCase().startsWith("ar"));
  }, [error]);

  const c = isAr
    ? {
        title: "حدث خطأ ما",
        body: "واجه التطبيق خطأ غير متوقع. إعادة التحميل تحل المشكلة عادةً.",
        reload: "إعادة التحميل",
      }
    : {
        title: "Something went wrong",
        body: "The app hit an unexpected error. Reloading usually fixes it.",
        reload: "Reload",
      };

  return (
    <html lang={isAr ? "ar" : "en"} dir={isAr ? "rtl" : "ltr"}>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f0e0c", color: "#e8e3d8" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "64px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>{c.title}</h1>
          <p style={{ fontSize: 14, opacity: 0.8 }}>{c.body}</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 24, padding: "8px 18px", cursor: "pointer",
              background: "#c9a227", color: "#1a1813", border: "none", borderRadius: 8,
            }}
          >
            {c.reload}
          </button>
        </main>
      </body>
    </html>
  );
}

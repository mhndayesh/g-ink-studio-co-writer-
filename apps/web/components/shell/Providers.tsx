"use client";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { useState } from "react";
import { BusyOverlay } from "@/components/shell/BusyOverlay";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { TestModeBanner } from "@/components/billing/TestModeBanner";
import { useUI } from "@/lib/store";
import { ApiError, isAiGateError } from "@/lib/api";
import { I18nProvider, type Locale } from "@/lib/i18n";

export function Providers({ children, initialLocale = "en" }: { children: React.ReactNode; initialLocale?: Locale }) {
  // staleTime 0 so navigating between tabs always reflects the latest server
  // state (a chapter deleted on the Chapters tab is immediately reflected on
  // Flow). refetchOnWindowFocus still off — only re-fetch on remount.
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, staleTime: 0, refetchOnMount: "always" },
    },
    // One place to catch a blocked AI action from ANY mutation (every AI call is
    // tagged mutationKey ["llm", ...]). Per-mutation onError handlers still run.
    mutationCache: new MutationCache({
      onError: (err) => {
        if (isAiGateError(err)) {
          useUI.getState().openUpgrade(err.code as any);
        } else if (err instanceof ApiError && err.status === 409 && typeof window !== "undefined") {
          // Optimistic-lock / concurrent-change conflict (version_id_col). Surface
          // it instead of letting the autosave fail silently — non-destructive, so
          // the user's in-progress text isn't replaced; they choose when to reload.
          const isAr = typeof document !== "undefined" && document.documentElement.lang === "ar";
          window.alert(
            err.message ||
              (isAr
                ? "تغيّر هذا المحتوى في تبويب أو جلسة أخرى. أعد التحميل للحصول على أحدث نسخة، ثم أعد تطبيق تعديلك."
                : "This was changed in another tab or session. Reload to get the latest version, then reapply your edit."),
          );
        }
      },
    }),
  }));
  return (
    <I18nProvider initialLocale={initialLocale}>
      <QueryClientProvider client={client}>
        <TestModeBanner />
        {children}
        <BusyOverlay />
        <UpgradeModal />
      </QueryClientProvider>
    </I18nProvider>
  );
}

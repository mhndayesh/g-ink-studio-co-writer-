"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { login } from "@/lib/auth";
import { card, field, label, input, primaryButton, errorText, authShell } from "@/components/auth/styles";
import { useI18n } from "@/lib/i18n";

// Only honour same-origin absolute paths — never a protocol-relative `//evil.com`
// or an external URL — so the post-login redirect can't be an open redirect.
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/studio";
}

function LoginForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const redirect = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t, setLocale } = useI18n();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      if (user.locale) setLocale(user.locale);
      await qc.invalidateQueries();
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.failed"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={card}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, margin: 0, color: "var(--text)" }}>
        {t("auth.welcomeBack")}
      </h1>
      <p style={{ margin: "6px 0 4px", color: "var(--muted)", fontSize: 14 }}>{t("auth.signInSubtitle")}</p>

      <div style={field}>
        <label style={label} htmlFor="email">{t("auth.email")}</label>
        <input id="email" type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} style={input} />
      </div>
      <div style={field}>
        <label style={label} htmlFor="password">{t("auth.password")}</label>
        <input id="password" type="password" required autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} style={input} />
      </div>

      {error && <p style={errorText}>{error}</p>}

      <button type="submit" disabled={busy} style={primaryButton(busy)}>
        {busy ? t("auth.signingIn") : t("auth.signIn")}
      </button>

      <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
        {t("auth.newHere")}{" "}
        <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>{t("auth.createAccount")}</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main style={authShell}>
      {/* useSearchParams needs a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

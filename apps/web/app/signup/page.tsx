"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signup } from "@/lib/auth";
import { card, field, label, input, primaryButton, errorText, hint, authShell } from "@/components/auth/styles";
import { useI18n } from "@/lib/i18n";

// Only honour same-origin absolute paths — never a protocol-relative `//evil.com`
// or an external URL — so the post-signup redirect can't be an open redirect.
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/studio";
}

function SignupForm() {
  const router = useRouter();
  const qc = useQueryClient();
  // pricing → /signup?next=/pricing; carry that intent through so a paid-plan
  // signup lands back where they meant to go instead of always /studio.
  const redirect = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t, locale, setLocale } = useI18n();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    setBusy(true);
    try {
      const user = await signup(email.trim(), password, displayName.trim(), locale);
      if (user.locale) setLocale(user.locale);
      await qc.invalidateQueries();
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.signupFailed"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={card}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, margin: 0, color: "var(--text)" }}>
        {t("auth.createYourAccount")}
      </h1>
      <p style={{ margin: "6px 0 4px", color: "var(--muted)", fontSize: 14 }}>{t("auth.startWriting")}</p>

      <div style={field}>
        <label style={label} htmlFor="displayName">{t("auth.displayName")} <span style={{ fontWeight: 400 }}>({t("common.optional")})</span></label>
        <input id="displayName" type="text" autoComplete="nickname" value={displayName}
          onChange={(e) => setDisplayName(e.target.value)} style={input} />
      </div>
      <div style={field}>
        <label style={label} htmlFor="email">{t("auth.email")}</label>
        <input id="email" type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} style={input} />
      </div>
      <div style={field}>
        <label style={label} htmlFor="password">{t("auth.password")}</label>
        <input id="password" type="password" required minLength={6} autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} style={input} />
        <p style={hint}>{t("auth.passwordHint")}</p>
      </div>

      {error && <p style={errorText}>{error}</p>}

      <button type="submit" disabled={busy} style={primaryButton(busy)}>
        {busy ? t("auth.creatingAccount") : t("auth.createAccount")}
      </button>

      <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>{t("auth.signIn")}</Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <main style={authShell}>
      {/* useSearchParams needs a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </main>
  );
}

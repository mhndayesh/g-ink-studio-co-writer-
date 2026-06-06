// Client-side auth: email+password against the API's /v1/auth/* endpoints.
// Access + refresh tokens (HS256 JWTs) live in localStorage. The access token is
// short-lived and carries a `tv` token-version; this module refreshes it on
// demand (proactively before expiry, and reactively on a 401 in lib/api.ts).
//
// React components should use the hooks (useIsAuthed / useRequireAuth); plain
// async code (lib/api.ts) calls getToken() to attach the bearer header.
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const ACCESS_KEY = "gink_access_token";
const REFRESH_KEY = "gink_refresh_token";

// ── token storage ─────────────────────────────────────────────────────────────
function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(access: string | null, refresh: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (access) window.localStorage.setItem(ACCESS_KEY, access);
    else window.localStorage.removeItem(ACCESS_KEY);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
    else window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* private mode / storage disabled — auth simply won't persist */
  }
  emit();
}

type Tokens = { access_token: string; refresh_token: string };

function store(t: Tokens): void {
  write(t.access_token, t.refresh_token);
}

/** Clear all tokens locally (used on logout and on an unrecoverable refresh). */
function clear(): void {
  write(null, null);
}

// ── reactive auth state (for hooks) ─────────────────────────────────────────────
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Cross-tab: another tab logging in/out updates localStorage → "storage" event.
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}
function isAuthedSnapshot(): boolean {
  // A refresh token means the session can be renewed even if the access token
  // has expired, so treat its presence as "signed in".
  return !!read(REFRESH_KEY);
}

// ── JWT helpers (read-only; the server verifies signatures) ─────────────────────
function jwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function expired(token: string, skewSeconds = 30): boolean {
  const exp = jwtExp(token);
  if (exp == null) return false; // can't tell → let the server decide
  return Date.now() / 1000 >= exp - skewSeconds;
}

// ── refresh (single-flight so a burst of calls shares one network round-trip) ───
let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;
  const refresh = read(REFRESH_KEY);
  if (!refresh) return null;
  inflightRefresh = (async () => {
    try {
      const res = await fetch(`${BASE}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        clear(); // refresh token revoked / expired / reused → force re-login
        return null;
      }
      const tokens = body.data.tokens as Tokens;
      store(tokens);
      return tokens.access_token;
    } catch {
      // Network blip: keep the tokens (don't log the user out for a flaky request).
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();
  return inflightRefresh;
}

// ── public API ──────────────────────────────────────────────────────────────────

/** Current access token for the Authorization header, refreshing it first if it
 *  is missing or about to expire. Null when signed out (caller omits the header). */
export async function getToken(): Promise<string | null> {
  const access = read(ACCESS_KEY);
  if (access && !expired(access)) return access;
  return refreshAccessToken();
}

/** Force a refresh and return the new token — used by lib/api.ts to retry a 401. */
export async function forceRefresh(): Promise<string | null> {
  return refreshAccessToken();
}

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  [k: string]: unknown;
};

async function postAuth(path: string, payload: Record<string, unknown>): Promise<AuthUser> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    const msg = body?.error?.message || "Authentication failed";
    throw new Error(msg);
  }
  store(body.data.tokens as Tokens);
  return body.data.user as AuthUser;
}

export function login(email: string, password: string): Promise<AuthUser> {
  return postAuth("/v1/auth/login", { email, password });
}

export function signup(email: string, password: string, displayName?: string): Promise<AuthUser> {
  return postAuth("/v1/auth/signup", { email, password, display_name: displayName || "" });
}

/** Sign out: best-effort server-side revocation, then clear local tokens. */
export async function signOut(): Promise<void> {
  const access = read(ACCESS_KEY);
  try {
    if (access) {
      await fetch(`${BASE}/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}` },
      });
    }
  } catch {
    /* ignore — we still clear local state below */
  }
  clear();
}

// ── hooks ─────────────────────────────────────────────────────────────────────

/** Reactive sign-in state. SSR snapshot is false; corrects after hydration. */
export function useIsAuthed(): boolean {
  return useSyncExternalStore(subscribe, isAuthedSnapshot, () => false);
}

/** True once the client has mounted and localStorage is readable. Gate data
 *  fetching on this so queries don't fire (and 401) before the token exists. */
export function useAuthReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

/** Redirect to /login once mounted if the visitor is signed out. Returns the
 *  current auth state for conditional rendering. */
export function useRequireAuth(): boolean {
  const authed = useIsAuthed();
  const ready = useAuthReady();
  const router = useRouter();
  useEffect(() => {
    if (ready && !authed) router.replace("/login");
  }, [ready, authed, router]);
  return authed;
}

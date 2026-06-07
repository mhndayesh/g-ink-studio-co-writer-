import type { NextConfig } from "next";

// Content-Security-Policy. connect-src/img-src are scoped to the API + CDN origins,
// which are inlined at BUILD time (NEXT_PUBLIC_* are build args), so this is correct
// per-deployment without runtime nonces.
//
// script-src uses 'unsafe-inline'/'unsafe-eval' because the Next App Router injects
// inline hydration scripts and a nonce-strict CSP requires nonce middleware. This
// still blocks the highest-impact vector — loading an EXTERNAL attacker script
// (<script src=evil>) — plus framing, object/base/form abuse. Two follow-ups remain
// (tracked in the review): (1) nonce-based strict script-src via middleware, and
// (2) the real XSS→token-theft fix, moving the refresh token out of localStorage
// into an httpOnly cookie (see apps/web/lib/auth.ts).
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const cdn = process.env.NEXT_PUBLIC_CDN_URL || "";
const connectSrc = ["'self'", apiBase, cdn].filter(Boolean).join(" ");
const imgSrc = ["'self'", "data:", "blob:", apiBase, cdn].filter(Boolean).join(" ");

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc}`,
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const config: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || "",
  // Lint via the dedicated `npm run lint` (eslint.config.mjs); don't gate the
  // production build on it so a style warning can't break a deploy.
  eslint: { ignoreDuringBuilds: true },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS — Caddy used to add this; on Railway/other hosts the app must.
          // (No `preload` — that's a hard-to-reverse commitment to the HSTS list.)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default config;

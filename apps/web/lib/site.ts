// Branding / contact details surfaced in the footer and the Privacy & Terms
// pages. Override per-deployment with NEXT_PUBLIC_* env vars (they are baked into
// the client bundle at build time) instead of editing components. Defaults are
// neutral placeholders so a fresh fork ships nothing tied to one operator.
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "G-Ink Studio";
export const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || "example.com";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";

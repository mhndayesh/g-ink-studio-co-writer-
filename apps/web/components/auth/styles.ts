// Shared inline styles for the /login and /signup forms. Kept as plain CSSProperties
// so the auth pages match the rest of the app's theme variables without a CSS module.
import type { CSSProperties } from "react";

export const authShell: CSSProperties = {
  minHeight: "calc(100vh - 56px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 16px",
};

export const card: CSSProperties = {
  width: "100%",
  maxWidth: 380,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: "28px 26px",
  borderRadius: 14,
  background: "var(--card, var(--bg))",
  border: "1px solid var(--border)",
  boxShadow: "0 10px 40px -20px rgba(0,0,0,0.5)",
};

export const field: CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };

export const label: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--muted)",
};

export const input: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  outline: "none",
};

export const errorText: CSSProperties = {
  margin: 0,
  color: "var(--ink-red, #d9534f)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
};

export const hint: CSSProperties = {
  margin: "-4px 0 0",
  color: "var(--muted)",
  fontSize: 12,
  fontFamily: "var(--font-sans)",
};

export function primaryButton(busy: boolean): CSSProperties {
  return {
    marginTop: 4,
    padding: "10px 16px",
    borderRadius: 9,
    border: "none",
    background: "var(--accent)",
    color: "var(--accent-text)",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    fontWeight: 700,
    cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.7 : 1,
    transition: "filter 0.15s, opacity 0.15s",
  };
}

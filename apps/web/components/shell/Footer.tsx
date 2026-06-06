import Link from "next/link";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-ink-border mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-text3">
        <span>© 2026 {SITE_NAME}</span>
        <nav className="flex items-center gap-5">
          <Link href="/pricing" className="hover:text-ink-text transition-colors">Pricing</Link>
          <Link href="/privacy" className="hover:text-ink-text transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-ink-text transition-colors">Terms</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink-text transition-colors">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

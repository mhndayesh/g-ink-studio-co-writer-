"use client";
// Route-level error boundary. Without this, any render-time throw (e.g. an
// unexpected API response shape) crashes to React's blank screen with no recovery.
// Catches errors in the page tree below the root layout and offers a retry / home.
import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to the console (and any wired error reporter) so it isn't swallowed.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-2xl text-ink-text">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-text2">
        An unexpected error interrupted this page. Your saved work is safe.
      </p>
      {error?.message && (
        <p className="mt-2 break-words text-xs text-ink-text3">{error.message}</p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <Link className="btn btn-ghost" href="/">Go home</Link>
      </div>
    </main>
  );
}

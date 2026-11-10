import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// Debounced autosave keyed by a record id.
//
// Fixes two classes of data loss in the previous hook:
//   1. Switching chapters/scenes/characters changed `value` without unmounting,
//      so the cleanup cleared the pending timer and the previous record's last
//      <delay> ms of typing were never saved. Now the pending value is stored
//      per key and flushed the moment the key changes.
//   2. No save status existed. `status` (and `error`) are returned so pages can
//      show Saving / Saved / Failed instead of silently swallowing failures.
//
// Pending saves are also flushed on unmount and beforeunload.
export function useDebouncedSave<T>(
  value: T,
  delay: number,
  fn: (v: T) => void | Promise<unknown>,
  key: string = "default",
) {
  const pending = useRef<Map<string, T>>(new Map());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // The save callback is captured PER KEY. Without this, switching records
  // re-renders with a new callback closure (new activeId) before the old key
  // flushes, and the previous record's draft would be PATCHed onto the new one.
  const fns = useRef<Map<string, (v: T) => void | Promise<unknown>>>(new Map());
  const latestKey = useRef(key);
  const loadedKeys = useRef<Set<string>>(new Set());
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<unknown>(null);

  const flushKey = (k: string) => {
    const timer = timers.current.get(k);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(k);
    }
    if (!pending.current.has(k)) return;
    const v = pending.current.get(k) as T;
    pending.current.delete(k);
    setStatus("saving");
    const save = fns.current.get(k) ?? fnRef.current;
    Promise.resolve()
      .then(() => save(v))
      .then(() => {
        if (latestKey.current === k) setStatus("saved");
      })
      .catch((e) => {
        // Keep the value pending so the next edit/flush retries it.
        if (!pending.current.has(k)) pending.current.set(k, v);
        if (latestKey.current === k) {
          setStatus("error");
          setError(e);
        }
      });
  };

  const flush = () => {
    for (const k of Array.from(pending.current.keys())) flushKey(k);
  };

  useEffect(() => {
    const prev = latestKey.current;
    if (prev !== key) {
      // The record changed — save whatever was pending for the previous one.
      flushKey(prev);
      latestKey.current = key;
      loadedKeys.current.add(key);
      setStatus("idle");
      setError(null);
      return;
    }
    if (!loadedKeys.current.has(key)) {
      // First render for this record is a load, not an edit.
      loadedKeys.current.add(key);
      return;
    }
    pending.current.set(key, value);
    fns.current.set(key, fnRef.current);
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    timers.current.set(
      key,
      setTimeout(() => flushKey(key), delay),
    );
  }, [value, delay, key]);

  useEffect(() => {
    const onUnload = () => flush();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, error, flush };
}

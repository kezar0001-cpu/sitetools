"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Manages a map of per-key debounced callbacks.
 *
 * Scheduling a new callback for an existing key automatically cancels the
 * previous pending call for that key.  All pending timers are cancelled when
 * the host component unmounts.
 *
 * The `timersRef` is intentionally exposed so that sibling hooks (e.g.
 * `useConflictDetection`) can inspect or cancel individual pending saves
 * without needing to co-locate the timer logic.
 *
 * @param defaultDelayMs - Default debounce window in milliseconds (default 600 ms).
 */
export function useDebounceAsync(defaultDelayMs = 600) {
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Cleanup all pending timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach((id) => clearTimeout(id));
      timersRef.current = {};
    };
  }, []);

  /**
   * Schedule `fn` to run after `delayMs` milliseconds under `key`.
   * Any previously scheduled call for the same key is cancelled first.
   */
  const schedule = useCallback(
    (key: string, fn: () => void, delayMs?: number) => {
      if (timersRef.current[key]) clearTimeout(timersRef.current[key]);
      timersRef.current[key] = setTimeout(() => {
        delete timersRef.current[key];
        fn();
      }, delayMs ?? defaultDelayMs);
    },
    [defaultDelayMs]
  );

  /** Cancel the pending call for a single key (no-op if none). */
  const cancel = useCallback((key: string) => {
    if (timersRef.current[key]) {
      clearTimeout(timersRef.current[key]);
      delete timersRef.current[key];
    }
  }, []);

  /** Cancel all pending calls. */
  const cancelAll = useCallback(() => {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
  }, []);

  return { schedule, cancel, cancelAll, timersRef };
}

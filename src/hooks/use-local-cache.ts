"use client";

import { useEffect, useRef, useState } from "react";

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, reviveDates(nested)]),
    ) as T;
  }

  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    return new Date(value) as T;
  }

  return value;
}

/**
 * Stale-while-revalidate hook backed by localStorage.
 *
 * On mount, returns the cached value (if any) so the UI renders instantly.
 * When `serverData` arrives from the server component prop, the cache
 * is silently updated and the returned value switches to the fresh data.
 *
 * @param key - localStorage key (should be unique per data type)
 * @param serverData - fresh data passed from the server component
 * @param options.maxAge - max cache age in ms (default: 1 hour)
 */
export function useLocalCache<T>(
  key: string,
  serverData: T,
  options?: { maxAge?: number },
): { data: T; isFromCache: boolean } {
  const maxAge = options?.maxAge ?? 60 * 60 * 1000;
  const hasHydrated = useRef(false);

  const [state, setState] = useState<{ data: T; isFromCache: boolean }>(() => {
    if (typeof window === "undefined") {
      return { data: serverData, isFromCache: false };
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const cached = JSON.parse(raw) as { data: T; timestamp: number };
        const age = Date.now() - cached.timestamp;
        if (age < maxAge) {
          return { data: reviveDates(cached.data), isFromCache: true };
        }
      }
    } catch {
      // corrupt or missing cache — fall through
    }

    return { data: serverData, isFromCache: false };
  });

  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;

      // On first hydration, if we served from cache, the serverData prop
      // is already available — update to fresh immediately.
      if (state.isFromCache) {
        setState({ data: serverData, isFromCache: false });
      }
    } else {
      // Subsequent prop changes (e.g. revalidation)
      setState({ data: serverData, isFromCache: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverData]);

  // Persist fresh server data to localStorage
  useEffect(() => {
    if (state.isFromCache) return;

    try {
      const payload = JSON.stringify({
        data: state.data,
        timestamp: Date.now(),
      });
      window.localStorage.setItem(key, payload);
    } catch {
      // quota exceeded or private browsing — silently ignore
    }
  }, [key, state.data, state.isFromCache]);

  return state;
}

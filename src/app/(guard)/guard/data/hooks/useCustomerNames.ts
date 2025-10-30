"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseCustomerNamesOpts = {
  minChars?: number; // default 2
  debounceMs?: number; // default 300
  limit?: number; // default 10
};

export function useCustomerNames({
  minChars = 2,
  debounceMs = 300,
  limit = 10,
}: UseCustomerNamesOpts = {}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // stable setter
  const setQuery = useCallback((v: string) => setQ(v ?? ""), []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < minChars) {
      setNames([]);
      setError(null);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);

      // abort prior request
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const url = new URL(
          "/api/v1/guard/customer-names",
          window.location.origin
        );
        url.searchParams.set("q", term);
        url.searchParams.set("page", "1");
        url.searchParams.set("limit", String(limit));

        const res = await fetch(url.toString(), { signal: ac.signal });
        if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);

        const json = await res.json().catch(() => ({}));
        // backend returns { success, data: { data: string[], meta } } (per route file)
        const arr: string[] = json?.data?.data ?? json?.data ?? [];
        setNames(Array.isArray(arr) ? arr.slice(0, limit) : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to fetch names");
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(t);
  }, [q, minChars, debounceMs, limit]);

  const empty = useMemo(
    () => q.trim().length >= minChars && names.length === 0,
    [q, minChars, names.length]
  );

  return { query: q, setQuery, names, loading, error, empty, minChars, limit };
}

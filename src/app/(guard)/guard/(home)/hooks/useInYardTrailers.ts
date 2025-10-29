"use client";

/**
 * useInYardTrailers — unified with global refresh bus
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TTrailerDto, TTrailerUI } from "@/types/frontend/trailer.dto";
import { EYardId } from "@/types/yard.types";
import { mapTrailerDto } from "@/lib/mappers/mapTrailerDto";
import { refreshBus } from "@/lib/refresh/refreshBus";
import { apiFetch } from "@/lib/api/apiFetch";
import { TrailerDtoSchema } from "@/types/schemas/trailers.schema";
import { extractTrailersAndMeta } from "@/lib/api/normalize";

type Meta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: Record<string, any>;
};

type Result = {
  rows: TTrailerUI[];
  meta: Meta | null;
  loading: boolean;
  error: Error | null;
  setPage: (p: number) => void;
  setQuery: (q: string) => void;
  refetch: () => void;
};


export function useInYardTrailers(
  yardId: EYardId,
  opts?: { pageSize?: number; enabled?: boolean }
): Result {
  const pageSize = opts?.pageSize ?? 20;
  const enabled = opts?.enabled ?? true;

  const [page, setPage] = useState(1);
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [rows, setRows] = useState<TTrailerUI[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(rawQuery.trim()), 250);
    return () => window.clearTimeout(t);
  }, [rawQuery]);

  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL("/api/v1/guard/trailers", window.location.origin);
    u.searchParams.set("status", "IN");
    u.searchParams.set("yardId", yardId);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(pageSize));
    if (debouncedQuery) u.searchParams.set("q", debouncedQuery);
    return u.toString();
  }, [yardId, page, pageSize, debouncedQuery]);

  const doFetch = useCallback(async (endpoint: string, signal: AbortSignal) => {
    const json = await apiFetch<any>(endpoint, { signal, retries: 2 });

    // Pull out just what we need, regardless of envelope shape
    const { items, meta } = extractTrailersAndMeta(json);

    // Validate items individually (relaxed schema); log & skip invalid rows
    const valid: TTrailerDto[] = [];
    for (const it of items ?? []) {
      const parsed = TrailerDtoSchema.safeParse(it);
      if (parsed.success) {
        valid.push(parsed.data);
      } else if (process.env.NODE_ENV === "development") {
        // Optional: dev-time console to see why an item failed
        console.debug(
          "[trailers] dropped invalid item:",
          parsed.error.issues.map(i => i.path.join(".")).join(", ")
        );
      }
    }

    return { 
      data: valid, 
      meta: meta ? {
        page: meta.page ?? 1,
        pageSize: meta.pageSize ?? 20,
        total: meta.total ?? 0,
        totalPages: meta.totalPages ?? 1,
        hasPrev: meta.hasPrev,
        hasNext: meta.hasNext,
        sortBy: meta.sortBy,
        sortDir: meta.sortDir,
        filters: meta.filters,
      } : null
    };
  }, []);

  const load = useCallback(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, meta } = await doFetch(url, ac.signal);
        setRows(data.map(mapTrailerDto));
        setMeta(meta);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (
          err instanceof Error &&
          (err.message.includes("404") || err.message.includes("405"))
        ) {
          const u2 = new URL(url);
          u2.pathname = u2.pathname.replace(
            "/api/v1/guard/trailers",
            "/api/v1/trailers"
          );
          if (u2.pathname !== new URL(url).pathname) {
            try {
              const { data, meta } = await doFetch(u2.toString(), ac.signal);
              setRows(data.map(mapTrailerDto));
              setMeta(meta);
              return;
            } catch (err2: any) {
              if (err2?.name === "AbortError") return;
              setError(err2 as Error);
              return;
            }
          }
        }
        setError(err as Error);
      } finally {
        if (abortRef.current === ac) setLoading(false);
      }
    })();
  }, [url, doFetch]);

  // initial load
  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  // subscribe to the global refresh clock only when enabled (modal open)
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = refreshBus.subscribe(load);
    return () => unsubscribe();
  }, [enabled, load]);

  const setQuery = (q: string) => {
    setRawQuery(q);
    setPage(1);
  };

  return { rows, meta, loading, error, setPage, setQuery, refetch: load };
}

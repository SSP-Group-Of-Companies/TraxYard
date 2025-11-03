"use client";

/**
 * useInYardTrailers — unified with global refresh bus
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TTrailerDto, TTrailerUI } from "@/types/frontend/trailer.dto";
import { EYardId } from "@/types/yard.types";
import { mapTrailerDto } from "@/lib/mappers/mapTrailerDto";
// import { refreshBus } from "@/lib/refresh/refreshBus";
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
  page: number;
  setPage: (p: number) => void;
  setQuery: (q: string) => void;
  refetch: () => void;
};


export function useInYardTrailers(
  yardId: EYardId,
  opts?: { pageSize?: number; enabled?: boolean }
): Result {
  const pageSize = opts?.pageSize ?? 20;
  // const enabled = opts?.enabled ?? true; // reserved for future use

  const [page, setPage] = useState(1);
  const [rawQuery, setRawQuery] = useState("");
  const rawQueryRef = useRef<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [rows, setRows] = useState<TTrailerUI[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inflightUrlRef = useRef<string | null>(null);

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

    // Normalize meta with safe defaults and computed totals
    const m = meta ?? {};
    const mPage = m.page ?? page; // fall back to local state
    const mPageSize = m.pageSize ?? pageSize;
    const mTotal = m.total ?? (items?.length ?? 0);
    const mTotalPages = m.totalPages ?? Math.max(1, Math.ceil(mTotal / mPageSize));

    return {
      data: valid,
      meta: {
        page: mPage,
        pageSize: mPageSize,
        total: mTotal,
        totalPages: mTotalPages,
        hasPrev: m.hasPrev ?? mPage > 1,
        hasNext: m.hasNext ?? mPage < mTotalPages,
        sortBy: m.sortBy,
        sortDir: m.sortDir,
        filters: m.filters,
      },
    };
  }, [pageSize, page]);

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

    inflightUrlRef.current = url;
    (async () => {
      try {
        const { data, meta } = await doFetch(url, ac.signal);
        // Only apply if this response matches the latest requested url
        if (inflightUrlRef.current === url) {
          setRows(data.map(mapTrailerDto));
          setMeta(meta);
        }
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

  // Disabled: background refresh while typing causes mobile keyboards to flicker.
  // A manual refresh control can call `refetch` if needed.

  const setQuery = (q: string) => {
    const next = q ?? "";
    setRawQuery(next);
    if (next.trim() !== rawQueryRef.current.trim()) {
      setPage(1);
      rawQueryRef.current = next;
    }
  };

  return { rows, meta, loading, error, page, setPage, setQuery, refetch: load };
}

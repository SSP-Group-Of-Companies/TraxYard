"use client";

import { useEffect, useRef, useState } from "react";
import { refreshBus } from "@/lib/refresh/refreshBus";

export type TGuardDashboard = {
  yard: {
    id: string;
    name: string;
    capacity: { current: number; max: number };
    location?: {
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
  };
  stats: null | {
    inCount: number;
    outCount: number;
    inspectionCount: number;
    damageCount: number;
  };
  weather: any | null;
};

type Options = { refreshMs?: number };

export function useGuardDashboard(
  yardId: string | undefined,
  opts: Options = {}
) {
  const { refreshMs = 60_000 } = opts;

  const [data, setData] = useState<TGuardDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    if (!yardId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/guard/dashboard?yardId=${yardId}`, {
        cache: "no-store",
        signal: ctrl.signal,
        credentials: "include",
      });
      const json = await res.json();
      setData(json?.data ?? null);
      setLastUpdated(Date.now());
    } catch (e) {
      if ((e as any)?.name !== "AbortError") setError(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // set the global cadence once (last writer wins; same value across app)
    refreshBus.setCadence(refreshMs);

    // initial fetch + subscribe to global ticks
    load();
    const unsubscribe = refreshBus.subscribe(load);

    return () => {
      abortRef.current?.abort();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yardId, refreshMs]);

  return { data, isLoading, error, lastUpdated, refetch: load };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/apiFetch";

export type TPrevDamage = {
  location: string;
  type: string;
  comment?: string | null;
  photo?: { url?: string } | null; // we won't copy
};

export function useLastMovementDamages(trailerId?: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [damages, setDamages] = useState<TPrevDamage[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const onceRef = useRef(false);

  useEffect(() => {
    if (!trailerId || onceRef.current) return;
    onceRef.current = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<any>(`/api/v1/guard/trailers/${trailerId}/last-movement`);
        const d = Array.isArray(res?.data?.damages) ? res.data.damages : [];
        setDamages(d as TPrevDamage[]);
        // Use trailer condition (DAMAGED/ACTIVE) from the nested trailer object
        const condition = (res as any)?.data?.trailer?.condition as string | undefined;
        setStatus(condition ?? null);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [trailerId]);

  return { loading, error, damages, status };
}



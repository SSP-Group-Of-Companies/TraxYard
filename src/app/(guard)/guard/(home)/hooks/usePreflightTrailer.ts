"use client";

import { useCallback } from "react";
import { apiFetch } from "@/lib/api/apiFetch";
import { extractTrailersAndMeta } from "@/lib/api/normalize";
import { TrailerDtoSchema } from "@/types/schemas/trailers.schema";
import type { TTrailerDto } from "@/types/frontend/trailer.dto";

function isInspectionExpired(input: string | Date | null | undefined): boolean {
  if (!input) return false;
  const d = typeof input === "string" ? new Date(input) : input;
  return d instanceof Date && !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export function usePreflightTrailer() {
  return useCallback(async (trailerNumber: string) => {
    // Reuse the guard search endpoint shape-agnostically
    const url = new URL("/api/v1/guard/trailers", window.location.origin);
    url.searchParams.set("q", trailerNumber);
    url.searchParams.set("limit", "5"); // tiny for preflight

    const json = await apiFetch<any>(url.toString(), { retries: 1 });

    const { items } = extractTrailersAndMeta(json);
    // Find exact match and validate once
    const found = (items ?? []).find((x) => x?.trailerNumber === trailerNumber);
    if (!found) {
      return {
        exists: false as const,
        flags: { inspectionExpired: false, damaged: false },
        dto: null as TTrailerDto | null,
      };
    }

    const parsed = TrailerDtoSchema.safeParse(found);
    const dto = parsed.success ? parsed.data : (found as TTrailerDto);

    const inspectionExpired = isInspectionExpired(dto.safetyInspectionExpiryDate as any);
    const damaged = (dto as any)?.condition === "DAMAGED";

    return {
      exists: true as const,
      flags: { inspectionExpired, damaged },
      dto,
    };
  }, []);
}

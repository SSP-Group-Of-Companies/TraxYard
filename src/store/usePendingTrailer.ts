"use client";

import { create } from "zustand";
import type { TNewTrailer } from "@/types/schemas/newTrailer.schema";

type PendingTrailerState = {
  pending: TNewTrailer | null;
  set: (t: TNewTrailer) => void;
  clear: () => void;
};

export const usePendingTrailer = create<PendingTrailerState>((set) => ({
  pending: null,
  set: (t) => set({ pending: t }),
  clear: () => set({ pending: null }),
}));



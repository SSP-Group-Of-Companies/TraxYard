"use client";

import { create } from "zustand";

type GlobalLoadingState = {
  visible: boolean;
  message: string | null;
  shownAt: number | null;
  show: (message?: string) => void;
  hide: () => void;
};

export const useGlobalLoading = create<GlobalLoadingState>((set) => ({
  visible: false,
  message: null,
  shownAt: null,
  show: (message) => set({ visible: true, message: message ?? null, shownAt: Date.now() }),
  hide: () => set({ visible: false, message: null, shownAt: null }),
}));



"use client";

import { create } from "zustand";

type Mode = "IN" | "OUT" | "INSPECTION";

type GuardSelection = {
  mode: Mode;
  trailerNumber: string;
  flags: {
    inspectionExpired: boolean;
    damaged: boolean;
  };
};

type GuardFlowState = {
  selection: GuardSelection | null;
  setSelection: (s: GuardSelection | null) => void;
  clear: () => void;
};

export const useGuardFlowStore = create<GuardFlowState>((set) => ({
  selection: null,
  setSelection: (s) => set({ selection: s }),
  clear: () => set({ selection: null }),
}));

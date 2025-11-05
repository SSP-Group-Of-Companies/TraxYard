"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EYardId } from "@/types/yard.types";
import { yards } from "@/data/yards";

type YardState = {
  yardId: EYardId;
  setYardId: (id: EYardId) => void;
};

const defaultYard = (yards?.[0]?.id ?? "YARD1") as EYardId;

export const useYardStore = create<YardState>()(
  persist(
    (set) => ({
      yardId: defaultYard,
      setYardId: (yardId) => set({ yardId }),
    }),
    {
      name: "traxyard.yard", // localStorage key
      partialize: (state) => ({ yardId: state.yardId }),
    }
  )
);

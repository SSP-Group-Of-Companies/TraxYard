"use client";

import { create } from "zustand";

export type NoticeKind = "error" | "warning" | "info" | "success";

export type AppNotice = {
  id: number;
  kind: NoticeKind;
  title?: string;
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type NoticeState = {
  current: AppNotice | null;
  queue: AppNotice[];
  show: (notice: Omit<AppNotice, "id">) => void;
  hide: () => void;
};

let seq = 1;

export const useAppNotice = create<NoticeState>((set, get) => ({
  current: null,
  queue: [],
  show: (notice) => {
    const withId: AppNotice = { id: seq++, ...notice } as AppNotice;
    const { current, queue } = get();
    if (!current) {
      set({ current: withId });
    } else {
      set({ queue: [...queue, withId] });
    }
  },
  hide: () => {
    const { queue } = get();
    const next = queue[0] ?? null;
    set({ current: next, queue: next ? queue.slice(1) : [] });
  },
}));



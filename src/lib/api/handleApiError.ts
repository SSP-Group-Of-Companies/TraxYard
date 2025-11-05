"use client";

import { ApiError } from "./ApiError";
import { mapApiErrorToFriendly } from "./errorMessages";
import { useAppNotice } from "@/store/useAppNotice";

export function handleApiError(error: unknown, opts?: { retry?: () => void }) {
  // Only show UI on the client
  if (typeof window === "undefined") return;

  const show = useAppNotice.getState().show;

  if (error instanceof ApiError) {
    const { title, message } = mapApiErrorToFriendly(error);
    show({ kind: "error", title, message, actionLabel: opts?.retry ? "Retry" : undefined, onAction: opts?.retry });
    return;
  }
  const msg = (error as any)?.message || "Unexpected error";
  show({ kind: "error", title: "Unexpected error", message: msg });
}



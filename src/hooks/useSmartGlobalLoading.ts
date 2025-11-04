"use client";

import { useCallback, useRef } from "react";
import { useGlobalLoading } from "@/store/useGlobalLoading";

/**
 * Smart loader controller to prevent flicker on fast navigations.
 * - begin(): wait delayMs before showing
 * - end(): ensure at least minMs of visible time once shown
 */
export function useSmartGlobalLoading(
  opts: { delayMs?: number; minMs?: number } = {}
) {
  const { show, hide, visible, shownAt } = useGlobalLoading();
  const delayTimer = useRef<number | null>(null);
  const pendingBegin = useRef(false);

  const delayMs = opts.delayMs ?? 120;
  const minMs = opts.minMs ?? 480;

  const begin = useCallback(() => {
    // Avoid stacking begins
    if (pendingBegin.current || visible) return;
    pendingBegin.current = true;
    delayTimer.current = window.setTimeout(() => {
      show();
      pendingBegin.current = false;
      delayTimer.current = null;
    }, delayMs);
  }, [delayMs, show, visible]);

  const end = useCallback(() => {
    // If we haven't shown yet, cancel pending show
    if (pendingBegin.current && delayTimer.current != null) {
      window.clearTimeout(delayTimer.current);
      delayTimer.current = null;
      pendingBegin.current = false;
      return;
    }
    if (!visible) return;
    const elapsed = shownAt ? Date.now() - shownAt : minMs;
    if (elapsed >= minMs) {
      hide();
    } else {
      window.setTimeout(() => hide(), minMs - elapsed);
    }
  }, [hide, minMs, shownAt, visible]);

  return { begin, end };
}



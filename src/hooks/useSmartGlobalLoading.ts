"use client";

import { useCallback } from "react";
import { useGlobalLoading } from "@/store/useGlobalLoading";

/**
 * Smart, globally-coordinated loader controller to prevent flicker
 * and eliminate cross-component race conditions.
 *
 * - begin(): wait delayMs before showing (coalesced globally)
 * - end(): cancels pending shows, or hides after minMs when visible
 * - universal watchdog: auto-end after watchdogMs regardless of origin
 */

// Global, module-scoped coordination state (shared by all hook instances)
let gDelayTimer: number | null = null;
let gPendingBegin = false;
let gWatchdogTimer: number | null = null;

function clearDelayTimer() {
  if (gDelayTimer != null) {
    window.clearTimeout(gDelayTimer);
    gDelayTimer = null;
  }
  gPendingBegin = false;
}

function clearWatchdog() {
  if (gWatchdogTimer != null) {
    window.clearTimeout(gWatchdogTimer);
    gWatchdogTimer = null;
  }
}

export function useSmartGlobalLoading(
  opts: { delayMs?: number; minMs?: number; watchdogMs?: number } = {}
) {
  const { show, hide, visible, shownAt } = useGlobalLoading();

  const delayMs = opts.delayMs ?? 120;
  const minMs = opts.minMs ?? 480;
  const watchdogMs = opts.watchdogMs ?? 5000;

  const begin = useCallback(() => {
    // Avoid stacking begins (global)
    if (gPendingBegin || visible) return;
    gPendingBegin = true;
    // Arm a watchdog immediately so any pending show cannot leave us stuck
    clearWatchdog();
    gWatchdogTimer = window.setTimeout(() => {
      // Force end regardless of state
      clearDelayTimer();
      hide();
      clearWatchdog();
    }, watchdogMs);

    gDelayTimer = window.setTimeout(() => {
      show();
      // Keep watchdog running; end() will clear it
      clearDelayTimer();
    }, delayMs);
  }, [delayMs, hide, show, visible, watchdogMs]);

  const end = useCallback(() => {
    // If we haven't shown yet, cancel pending show globally
    if (gPendingBegin && gDelayTimer != null) {
      clearDelayTimer();
      clearWatchdog();
      return;
    }
    if (!visible) {
      clearWatchdog();
      return;
    }
    const elapsed = shownAt ? Date.now() - shownAt : minMs;
    if (elapsed >= minMs) {
      hide();
      clearWatchdog();
    } else {
      const remain = minMs - elapsed;
      window.setTimeout(() => {
        hide();
        clearWatchdog();
      }, remain);
    }
  }, [hide, minMs, shownAt, visible]);

  return { begin, end };
}



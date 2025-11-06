"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSmartGlobalLoading } from "@/hooks/useSmartGlobalLoading";

/**
 * Global navigation loader hook for Next.js App Router.
 * - Starts loader when internal links are clicked.
 * - Ends loader when pathname changes.
 * - Ignores modifier-key clicks and external links.
 */
export function useNavigationLoadingSmart() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const { begin, end } = useSmartGlobalLoading();
  const watchdogTimer = useRef<number | null>(null);
  const clearWatchdog = () => {
    if (watchdogTimer.current != null) {
      window.clearTimeout(watchdogTimer.current);
      watchdogTimer.current = null;
    }
  };

  // Intercept internal link clicks to begin loader
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Only consider primary button clicks without modifiers
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href") || "";
      // Ignore hash-only or same-path anchors
      if (href.startsWith("#")) return;
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return; // external
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      // Internal navigation -> begin loader
      begin();
      // Watchdog: in case the route doesn't commit (error/prevented), auto-end
      clearWatchdog();
      watchdogTimer.current = window.setTimeout(() => {
        end();
        watchdogTimer.current = null;
      }, 5000); // 5s safety cap
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as any);
  }, [begin]);

  // End loader when pathname changes
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      clearWatchdog();
      end();
    }
  }, [pathname, end]);

  // Defensive: stop loader if tab becomes hidden (navigation cancelled)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        clearWatchdog();
        end();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [end]);
}



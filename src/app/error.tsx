"use client";

import { useEffect } from "react";
import { useSmartGlobalLoading } from "@/hooks/useSmartGlobalLoading";
import Link from "next/link";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { end } = useSmartGlobalLoading();
  useEffect(() => {
    // Optional: log for observability (can be wired to Sentry here)
    console.error("Route error:", error);
    // Ensure any in-flight navigation loader is dismissed
    end();
  }, [error, end]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-4">An unexpected error occurred while rendering this page.</p>
        <div className="flex items-center justify-center gap-3">
          <button className="button-base" onClick={() => reset()}>Try again</button>
          <Link href="/guard" className="button-base button-ghost">Go to home</Link>
        </div>
      </div>
    </div>
  );
}



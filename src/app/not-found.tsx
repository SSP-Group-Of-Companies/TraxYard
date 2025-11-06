"use client";

import Link from "next/link";
import { useSmartGlobalLoading } from "@/hooks/useSmartGlobalLoading";
import { useEffect } from "react";

export default function NotFound() {
  const { end } = useSmartGlobalLoading();
  useEffect(() => {
    // Ensure loader isn't left visible when navigating to a missing route
    end();
  }, [end]);
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-gray-600 mb-4">The page you’re looking for doesn’t exist or has moved.</p>
        <Link href="/guard" className="button-base">Go to home</Link>
      </div>
    </div>
  );
}



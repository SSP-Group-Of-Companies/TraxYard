"use client";

import ErrorBoundary from "@/app/components/ui/ErrorBoundary";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundary error={error} reset={reset} context="login" />;
}

/**
 * @fileoverview Guard Error Component - TraxYard Guard Interface
 * 
 * Error boundary component for the guard section. Provides user-friendly
 * error handling with context-specific messaging and recovery options.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - ErrorBoundary: Shared error boundary component
 * - Next.js: Error boundary integration
 * 
 * @features
 * - Context-specific error messaging
 * - User-friendly error recovery
 * - Development vs production error handling
 * - Accessibility support for error states
 */

"use client";

import ErrorBoundary from "@/app/components/ui/ErrorBoundary";

/**
 * Guard Error Component
 * 
 * Error boundary wrapper for the guard section with guard-specific context.
 * Provides user-friendly error handling and recovery options.
 * 
 * @param {Object} props - Component properties
 * @param {Error & { digest?: string }} props.error - Error object with optional digest
 * @param {function} props.reset - Function to reset error state
 * 
 * @returns {JSX.Element} Error boundary with guard context
 * 
 * @accessibility
 * - Provides clear error messaging
 * - Offers recovery options
 * - Maintains navigation context
 * - Screen reader friendly error announcements
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundary error={error} reset={reset} context="guard" />;
}

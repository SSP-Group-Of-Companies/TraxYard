/**
 * @fileoverview LoadingStates Component - TraxYard UI Library
 * 
 * Comprehensive loading states component with contextual messaging and variants.
 * Features different loading presentations for various application contexts.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - LoadingSpinner: Core loading spinner component
 * - React: Core framework functionality
 * 
 * @features
 * - Context-specific loading messages
 * - Multiple loading variants (full, inline, skeleton)
 * - Responsive design for all screen sizes
 * - Accessibility support with proper ARIA attributes
 * - TypeScript support with full type safety
 */

"use client";

import LoadingSpinner from "./LoadingSpinner";

/**
 * LoadingStates component props interface
 * @interface LoadingStatesProps
 * @property {("login" | "guard" | "dashboard" | "data")} [context="data"] - Loading context
 * @property {("full" | "inline" | "skeleton")} [variant="full"] - Loading variant
 */
interface LoadingStatesProps {
  context?: "login" | "guard" | "dashboard" | "data";
  variant?: "full" | "inline" | "skeleton";
}

/**
 * LoadingStates Component
 * 
 * Comprehensive loading states with contextual messaging and variants.
 * Provides different loading presentations for various application contexts.
 * 
 * @param {LoadingStatesProps} props - Component properties
 * @returns {JSX.Element} Rendered loading state
 * 
 * @performance
 * - Optimized for fast rendering
 * - Minimal resource usage
 * - Efficient re-renders
 * 
 * @accessibility
 * - Proper loading indicators
 * - Screen reader announcements
 * - Context-specific messaging
 * - Focus management
 * 
 * @example
 * <LoadingStates 
 *   context="dashboard" 
 *   variant="skeleton"
 * />
 */
export default function LoadingStates({ 
  context = "data", 
  variant = "full" 
}: LoadingStatesProps) {
  const getContextualMessage = () => {
    switch (context) {
      case "login":
        return "Preparing your secure login...";
      case "guard":
        return "Loading guard interface...";
      case "dashboard":
        return "Loading dashboard data...";
      case "data":
        return "Loading data...";
      default:
        return "Loading...";
    }
  };

  if (variant === "skeleton") {
    return (
      <div className="space-y-4">
        <LoadingSpinner variant="skeleton" />
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <LoadingSpinner 
        size="sm" 
        message={getContextualMessage()}
        className="py-2"
      />
    );
  }

  // Full page loading
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner 
        size="lg" 
        message={getContextualMessage()}
        className="space-y-4"
      />
    </div>
  );
}

/**
 * @fileoverview ErrorBoundary Component - TraxYard UI Library
 * 
 * Comprehensive error boundary component with user-friendly error handling,
 * recovery options, and development vs production error display.
 * Features context-specific messaging and accessibility support.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - lucide-react: For consistent iconography
 * - next/link: For navigation
 * - errorLogger: For error logging and monitoring
 * - React: Core framework functionality
 * 
 * @features
 * - Context-specific error messaging
 * - Development vs production error display
 * - Error logging and monitoring
 * - Recovery options with retry functionality
 * - Navigation options (home button)
 * - Accessibility support with proper ARIA attributes
 * - TypeScript support with full type safety
 */

"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { errorLogger } from "@/lib/utils/errorLogger";
import { useEffect } from "react";

/**
 * ErrorBoundary component props interface
 * @interface ErrorBoundaryProps
 * @property {Error & { digest?: string }} error - Error object with optional digest
 * @property {function} reset - Function to reset error state
 * @property {string} [context="page"] - Error context for messaging
 * @property {boolean} [showHomeButton=true] - Whether to show home navigation button
 */
interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  context?: string;
  showHomeButton?: boolean;
}

/**
 * ErrorBoundary Component
 * 
 * Comprehensive error boundary with user-friendly error handling and recovery options.
 * Provides context-specific messaging and development vs production error display.
 * 
 * @param {ErrorBoundaryProps} props - Component properties
 * @returns {JSX.Element} Rendered error boundary
 * 
 * @features
 * - Context-specific error messaging
 * - Development vs production error display
 * - Error logging and monitoring
 * - Recovery options with retry functionality
 * - Navigation options (home button)
 * - Accessibility support with proper ARIA attributes
 * 
 * @accessibility
 * - Clear error messaging
 * - Recovery options
 * - Navigation support
 * - Screen reader friendly
 * 
 * @example
 * <ErrorBoundary 
 *   error={error} 
 *   reset={reset} 
 *   context="dashboard"
 *   showHomeButton={true}
 * />
 */
export default function ErrorBoundary({
  error,
  reset,
  context = "page",
  showHomeButton = true,
}: ErrorBoundaryProps) {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Log error for monitoring
  useEffect(() => {
    errorLogger.logError(error, context, {
      digest: error.digest,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }, [error, context]);
  
  const getErrorMessage = () => {
    if (isDevelopment) {
      return error.message || "An unexpected error occurred";
    }
    
    // User-friendly messages for production
    switch (context) {
      case "login":
        return "Unable to sign you in. Please check your credentials and try again.";
      case "guard":
        return "Unable to load the guard interface. Please try again.";
      case "dashboard":
        return "Unable to load dashboard data. Please try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const getErrorTitle = () => {
    switch (context) {
      case "login":
        return "Login Failed";
      case "guard":
        return "Guard Interface Error";
      case "dashboard":
        return "Dashboard Error";
      default:
        return "Something went wrong";
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Error Content */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {getErrorTitle()}
          </h2>
          <p className="text-sm text-gray-600">
            {getErrorMessage()}
          </p>
          
          {/* Development Error Details */}
          {isDevelopment && error.digest && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-gray-500 cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          
          {showHomeButton && (
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * @fileoverview LoadingSpinner Component - TraxYard UI Library
 * 
 * Reusable loading spinner component with multiple variants and sizes.
 * Features smooth animations, accessibility support, and contextual messaging.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - framer-motion: For smooth animations and transitions
 * - Custom utilities: cn for class name merging
 * - Custom animations: spinnerVariants, fadeInVariants
 * - React: Core framework functionality
 * 
 * @features
 * - Multiple spinner variants (default, minimal, skeleton)
 * - Different sizes (sm, md, lg)
 * - Contextual loading messages
 * - Accessibility support with proper ARIA attributes
 * - TypeScript support with full type safety
 * - Responsive design for all screen sizes
 */

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { spinnerVariants, fadeInVariants } from "@/lib/animations";

/**
 * LoadingSpinner component props interface
 * @interface LoadingSpinnerProps
 * @property {("sm" | "md" | "lg")} [size="md"] - Spinner size
 * @property {("default" | "minimal" | "skeleton")} [variant="default"] - Spinner variant
 * @property {string} [message] - Loading message to display
 * @property {string} [className] - Additional CSS classes
 */
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "skeleton";
  message?: string;
  className?: string;
}

/**
 * LoadingSpinner Component
 * 
 * Reusable loading spinner with multiple variants and sizes.
 * Supports contextual messaging and accessibility features.
 * 
 * @param {LoadingSpinnerProps} props - Component properties
 * @returns {JSX.Element} Rendered loading spinner
 * 
 * @performance
 * - Optimized animations with framer-motion
 * - Efficient re-renders with proper prop handling
 * - Minimal DOM updates
 * 
 * @accessibility
 * - Proper loading indicators
 * - Screen reader announcements
 * - ARIA live regions for dynamic content
 * - Focus management
 * 
 * @example
 * <LoadingSpinner 
 *   size="lg" 
 *   variant="default" 
 *   message="Loading data..."
 *   className="p-4"
 * />
 */
export default function LoadingSpinner({
  size = "md",
  variant = "default",
  message,
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  const variantClasses = {
    default: "text-blue-600",
    minimal: "text-gray-400",
    skeleton: "text-gray-300"
  };

  if (variant === "skeleton") {
    return (
      <div className={cn("animate-pulse space-y-3", className)}>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className={cn("flex flex-col items-center justify-center space-y-3", className)}
      role="status"
      aria-live="polite"
      aria-label={message || "Loading content"}
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className={cn(
          "rounded-full border-2 border-gray-300 border-t-current",
          sizeClasses[size],
          variantClasses[variant]
        )}
        variants={spinnerVariants}
        animate="animate"
        aria-hidden="true"
      />
      {message && (
        <motion.p 
          className="text-sm text-gray-600" 
          aria-live="polite"
          variants={fadeInVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}

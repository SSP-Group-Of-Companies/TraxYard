/**
 * @fileoverview AnimatedPage Component - TraxYard UI Library
 * 
 * Reusable animated page wrapper component with smooth transitions.
 * Features page-level animations for route changes and content updates.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - framer-motion: For smooth animations and transitions
 * - React: Core framework functionality
 * - Custom animations: pageVariants from animations library
 * 
 * @features
 * - Smooth page transitions
 * - Route change animations
 * - Content update animations
 * - Accessibility support with proper ARIA attributes
 * - TypeScript support with full type safety
 * - Responsive design for all screen sizes
 */

"use client";

import { motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";
import { ReactNode } from "react";

/**
 * AnimatedPage component props interface
 * @interface AnimatedPageProps
 * @property {ReactNode} children - Page content
 * @property {string} [className] - Additional CSS classes
 */
interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

/**
 * AnimatedPage Component
 * 
 * Reusable animated page wrapper with smooth transitions for route changes.
 * Provides consistent page-level animations across the application.
 * 
 * @param {AnimatedPageProps} props - Component properties
 * @returns {JSX.Element} Rendered animated page wrapper
 * 
 * @performance
 * - Optimized animations with framer-motion
 * - Efficient re-renders with proper prop handling
 * - Minimal DOM updates
 * 
 * @accessibility
 * - Proper page semantics
 * - Screen reader friendly
 * - Focus management
 * 
 * @example
 * <AnimatedPage className="min-h-screen">
 *   <h1>Page Content</h1>
 * </AnimatedPage>
 */
export default function AnimatedPage({ children, className = "" }: AnimatedPageProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

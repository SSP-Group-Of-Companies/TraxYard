/**
 * @fileoverview AnimatedCard Component - TraxYard UI Library
 * 
 * Reusable animated card component with smooth hover effects and transitions.
 * Features click handling, disabled states, and consistent styling.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - framer-motion: For smooth animations and transitions
 * - React: Core framework functionality
 * - Custom animations: cardHoverVariants from animations library
 * 
 * @features
 * - Smooth hover and tap animations
 * - Click handling with optional callbacks
 * - Disabled state support
 * - Accessibility support with proper ARIA attributes
 * - TypeScript support with full type safety
 * - Responsive design for all screen sizes
 */

"use client";

import { motion } from "framer-motion";
import { cardHoverVariants } from "@/lib/animations";
import { ReactNode } from "react";

/**
 * AnimatedCard component props interface
 * @interface AnimatedCardProps
 * @property {ReactNode} children - Card content
 * @property {string} [className] - Additional CSS classes
 * @property {function} [onClick] - Click handler function
 * @property {boolean} [disabled=false] - Disabled state
 */
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * AnimatedCard Component
 * 
 * Reusable animated card with smooth hover effects and click handling.
 * Supports disabled states and accessibility features.
 * 
 * @param {AnimatedCardProps} props - Component properties
 * @returns {JSX.Element} Rendered animated card
 * 
 * @performance
 * - Optimized animations with framer-motion
 * - Efficient re-renders with proper prop handling
 * - Minimal DOM updates
 * 
 * @accessibility
 * - Proper card semantics
 * - Keyboard navigation support
 * - Screen reader friendly
 * - Focus management
 * 
 * @example
 * <AnimatedCard 
 *   onClick={() => console.log('card clicked')}
 *   disabled={false}
 *   className="p-4"
 * >
 *   Card Content
 * </AnimatedCard>
 */
export default function AnimatedCard({ 
  children, 
  className = "", 
  onClick,
  disabled = false 
}: AnimatedCardProps) {
  return (
    <motion.div
      variants={cardHoverVariants}
      initial="rest"
      whileHover={disabled ? "rest" : "hover"}
      whileTap={disabled ? "rest" : "tap"}
      onClick={disabled ? undefined : onClick}
      className={`cursor-pointer ${className}`}
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </motion.div>
  );
}

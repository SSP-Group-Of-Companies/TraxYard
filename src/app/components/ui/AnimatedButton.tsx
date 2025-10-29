/**
 * @fileoverview AnimatedButton Component - TraxYard UI Library
 * 
 * Reusable animated button component with smooth transitions and hover effects.
 * Features multiple variants, accessibility support, and consistent styling.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - framer-motion: For smooth animations and transitions
 * - React: Core framework functionality
 * - Custom animations: buttonVariants from animations library
 * 
 * @features
 * - Multiple button variants (primary, secondary, ghost)
 * - Smooth hover and tap animations
 * - Accessibility support with proper ARIA attributes
 * - Disabled state handling
 * - TypeScript support with full type safety
 * - Responsive design for all screen sizes
 */

"use client";

import { motion } from "framer-motion";
import { buttonVariants } from "@/lib/animations";
import { ReactNode } from "react";

/**
 * AnimatedButton component props interface
 * @interface AnimatedButtonProps
 * @property {ReactNode} children - Button content
 * @property {function} [onClick] - Click handler function
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [disabled=false] - Disabled state
 * @property {("button" | "submit" | "reset")} [type="button"] - Button type
 * @property {("primary" | "secondary" | "ghost")} [variant="primary"] - Button variant
 */
interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "ghost";
}

/**
 * AnimatedButton Component
 * 
 * Reusable animated button with smooth transitions and hover effects.
 * Supports multiple variants and accessibility features.
 * 
 * @param {AnimatedButtonProps} props - Component properties
 * @returns {JSX.Element} Rendered animated button
 * 
 * @performance
 * - Optimized animations with framer-motion
 * - Efficient re-renders with proper prop handling
 * - Minimal DOM updates
 * 
 * @accessibility
 * - Proper button semantics
 * - Keyboard navigation support
 * - Screen reader friendly
 * - Focus management
 * 
 * @example
 * <AnimatedButton 
 *   variant="primary" 
 *   onClick={() => console.log('clicked')}
 *   disabled={false}
 * >
 *   Click Me
 * </AnimatedButton>
 */
export default function AnimatedButton({ 
  children, 
  onClick,
  className = "",
  disabled = false,
  type = "button",
  variant = "primary"
}: AnimatedButtonProps) {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
    ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:ring-gray-500"
  };

  return (
    <motion.button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      variants={buttonVariants}
      initial="rest"
      whileHover={disabled ? "rest" : "hover"}
      whileTap={disabled ? "rest" : "tap"}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </motion.button>
  );
}

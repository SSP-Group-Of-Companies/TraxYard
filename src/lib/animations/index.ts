/**
 * @fileoverview Animation Barrel - TraxYard Animation System
 * 
 * Single canonical source for all animation variants and primitives.
 * Consolidates animated.ts (design-system core) with component-specific variants
 * from Animations.ts for a unified import experience.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - framer-motion: For animation framework integration
 * 
 * @features
 * - Single import source for all animation variants
 * - Backward compatibility with existing imports
 * - Type-safe animation definitions
 * - Performance-optimized configurations
 * - Accessibility-aware motion preferences
 */

// Export all primitives from the canonical animated.ts
export * from "./animated";

// --- Compat shims and lifted variants formerly in Animations.ts ---
import type { Variants } from "framer-motion";
import { springConfigs, easings, durations } from "./animated";

/**
 * Page transition animations for route changes
 * @constant {Variants} pageVariants - Page transition animation variants
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: easings.easeOut }
  },
  exit: {
    opacity: 0, 
    y: -20, 
    scale: 0.98,
    transition: { duration: 0.3, ease: easings.easeIn }
  }
};

/**
 * Card hover animation variants
 * @constant {Variants} cardHoverVariants - Card hover animation variants
 */
export const cardHoverVariants: Variants = {
  rest: { 
    scale: 1, 
    y: 0, 
    transition: { duration: 0.2, ease: easings.easeOut } 
  },
  hover: { 
    scale: 1.02, 
    y: -2, 
    transition: { duration: 0.2, ease: easings.easeOut } 
  },
  tap: { 
    scale: 0.98, 
    transition: { duration: 0.1, ease: easings.easeIn } 
  }
};

/**
 * Button animation variants
 * @constant {Variants} buttonVariants - Button animation variants
 */
export const buttonVariants: Variants = {
  rest: { 
    scale: 1, 
    transition: { duration: 0.2, ease: easings.easeOut } 
  },
  hover: { 
    scale: 1.05, 
    transition: { duration: 0.2, ease: easings.easeOut } 
  },
  tap: { 
    scale: 0.95, 
    transition: { duration: 0.1, ease: easings.easeIn } 
  },
};

/**
 * Enhanced action button animation variants with shadow effects
 * @constant {Variants} actionButtonVariants - Action button animation variants
 */
export const actionButtonVariants: Variants = {
  rest: { 
    scale: 1, 
    y: 0, 
    boxShadow: "0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06)",
    transition: { duration: 0.3, ease: easings.easeOut } 
  },
  hover: { 
    scale: 1.08, 
    y: -4, 
    boxShadow: "0 20px 25px -5px rgba(0,0,0,.1), 0 10px 10px -5px rgba(0,0,0,.04)",
    transition: { duration: 0.3, ease: easings.easeOut } 
  },
  tap: { 
    scale: 0.98, 
    y: -1, 
    transition: { duration: 0.1, ease: easings.easeIn } 
  },
  active: { 
    scale: 1.05, 
    y: -2, 
    boxShadow: "0 0 0 4px rgba(59,130,246,.3), 0 20px 25px -5px rgba(0,0,0,.1)",
    transition: { duration: 0.2, ease: easings.easeOut } 
  }
};

/**
 * Icon animation variants
 * @constant {Variants} iconVariants - Icon animation variants
 */
export const iconVariants: Variants = {
  rest: { 
    rotate: 0, 
    scale: 1, 
    transition: { duration: 0.3, ease: easings.easeOut } 
  },
  hover: { 
    rotate: 5, 
    scale: 1.1, 
    transition: { duration: 0.3, ease: easings.easeOut } 
  },
  pulse: { 
    scale: [1, 1.1, 1], 
    transition: { duration: 2, repeat: Infinity, ease: easings.easeInOut } 
  },
  bounce: { 
    y: [0, -4, 0], 
    transition: { duration: 1.5, repeat: Infinity, ease: easings.easeInOut } 
  }
};

/**
 * Attention pulse animation for drawing focus
 * @constant {Variants} attentionPulse - Attention pulse animation variants
 */
export const attentionPulse: Variants = {
  animate: {
    scale: [1, 1.02, 1],
    boxShadow: [
      "0 4px 6px -1px rgba(0,0,0,.1)",
      "0 0 0 2px rgba(59,130,246,.2)",
      "0 4px 6px -1px rgba(0,0,0,.1)"
    ],
    transition: { duration: 3, repeat: Infinity, ease: easings.easeInOut }
  }
};

/**
 * Spinner rotation animation
 * @constant {Variants} spinnerVariants - Spinner animation variants
 */
export const spinnerVariants: Variants = {
  animate: { 
    rotate: 360, 
    transition: { duration: 1, repeat: Infinity, ease: "linear" } 
  }
};

/**
 * Simple fade-in animation
 * @constant {Variants} fadeInVariants - Fade-in animation variants
 */
export const fadeInVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.3, ease: easings.easeOut } 
  }
};

/**
 * Stagger container for animating children in sequence
 * @constant {Variants} staggerContainer - Stagger container animation variants
 */
export const staggerContainer: Variants = { 
  animate: { 
    transition: { staggerChildren: 0.1 } 
  } 
};

/**
 * Stagger item for individual elements in a staggered animation
 * @constant {Variants} staggerItem - Stagger item animation variants
 */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: easings.easeOut } 
  }
};

/**
 * Modal animation variants (compatibility with existing code)
 * @constant {Variants} modalVariants - Modal animation variants
 */
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { duration: durations.normal, ease: easings.easeOut } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: 20, 
    transition: { duration: durations.fast, ease: easings.easeIn } 
  }
};

/**
 * Backdrop animation variants (compatibility with existing code)
 * @constant {Variants} backdropVariants - Backdrop animation variants
 */
export const backdropVariants: Variants = {
  initial: { opacity: 0, backdropFilter: "blur(0px)" },
  animate: { 
    opacity: 1, 
    backdropFilter: "blur(8px)", 
    transition: { duration: durations.normal, ease: easings.easeOut } 
  },
  exit: { 
    opacity: 0, 
    backdropFilter: "blur(0px)", 
    transition: { duration: durations.fast, ease: easings.easeIn } 
  }
};

// Modal animations alias for consistent usage
export const modalAnimations = {
  content: modalVariants,
  backdrop: backdropVariants,
};

// Legacy compatibility exports (if needed)
export const easing = easings;
export { springConfigs as spring };

/**
 * @fileoverview Animations Library - TraxYard Animation System
 * 
 * Comprehensive animation library providing consistent motion design patterns
 * across the TraxYard application. Features optimized easing curves, page transitions,
 * component animations, and accessibility-friendly motion preferences.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - framer-motion: For smooth animations and transitions
 * 
 * @features
 * - Consistent easing curves for smooth animations
 * - Page transition animations
 * - Component hover and tap animations
 * - Loading spinner animations
 * - Stagger animations for lists
 * - Modal and overlay animations
 * - Accessibility-friendly motion preferences
 * - TypeScript support with full type safety
 */

// Animation presets for consistent UX
import { Variants } from 'framer-motion';

/**
 * Easing curves for consistent animation timing
 * @constant {Object} easing - Collection of easing functions
 * @property {number[]} easing.easeOut - Ease out cubic bezier curve
 * @property {number[]} easing.easeIn - Ease in cubic bezier curve
 * @property {number[]} easing.easeInOut - Ease in-out cubic bezier curve
 * @property {Object} easing.spring - Spring animation configuration
 */
export const easing = {
  easeOut: [0.25, 0.46, 0.45, 0.94] as const,
  easeIn: [0.55, 0.06, 0.68, 0.19] as const,
  easeInOut: [0.42, 0, 0.58, 1] as const,
  spring: { type: "spring" as const, damping: 20, stiffness: 300 }
};

/**
 * Page transition animations for route changes
 * @constant {Variants} pageVariants - Page transition animation variants
 * @property {Object} pageVariants.initial - Initial animation state
 * @property {Object} pageVariants.animate - Animate to state
 * @property {Object} pageVariants.exit - Exit animation state
 */
export const pageVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: easing.easeOut
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: easing.easeIn
    }
  }
};

/**
 * Card hover animations for interactive elements
 * @constant {Variants} cardHoverVariants - Card hover animation variants
 * @property {Object} cardHoverVariants.rest - Resting state
 * @property {Object} cardHoverVariants.hover - Hover state
 * @property {Object} cardHoverVariants.tap - Tap/press state
 */
export const cardHoverVariants: Variants = {
  rest: { 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: easing.easeOut
    }
  },
  hover: { 
    scale: 1.02,
    y: -2,
    transition: {
      duration: 0.2,
      ease: easing.easeOut
    }
  },
  tap: { 
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: easing.easeIn
    }
  }
};

/**
 * Button interaction animations for clickable elements
 * @constant {Variants} buttonVariants - Button animation variants
 * @property {Object} buttonVariants.rest - Resting state
 * @property {Object} buttonVariants.hover - Hover state
 * @property {Object} buttonVariants.tap - Tap/press state
 */
export const buttonVariants: Variants = {
  rest: { 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: easing.easeOut
    }
  },
  hover: { 
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: easing.easeOut
    }
  },
  tap: { 
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: easing.easeIn
    }
  }
};

/**
 * Loading spinner rotation animation
 * @constant {Variants} spinnerVariants - Spinner animation variants
 * @property {Object} spinnerVariants.animate - Continuous rotation animation
 */
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

/**
 * Fade in animations for content reveals
 * @constant {Variants} fadeInVariants - Fade in animation variants
 * @property {Object} fadeInVariants.initial - Initial hidden state
 * @property {Object} fadeInVariants.animate - Animate to visible state
 */
export const fadeInVariants: Variants = {
  initial: { 
    opacity: 0,
    y: 10
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easing.easeOut
    }
  }
};

/**
 * Stagger container for coordinated list animations
 * @constant {Variants} staggerContainer - Stagger container animation variants
 * @property {Object} staggerContainer.animate - Stagger children animation
 */
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

/**
 * Stagger item animations for list elements
 * @constant {Variants} staggerItem - Stagger item animation variants
 * @property {Object} staggerItem.initial - Initial hidden state
 * @property {Object} staggerItem.animate - Animate to visible state
 */
export const staggerItem: Variants = {
  initial: { 
    opacity: 0,
    y: 20
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easing.easeOut
    }
  }
};

/**
 * Modal and overlay animations for popups and dialogs
 * @constant {Variants} modalVariants - Modal animation variants
 * @property {Object} modalVariants.initial - Initial hidden state
 * @property {Object} modalVariants.animate - Animate to visible state
 * @property {Object} modalVariants.exit - Exit animation state
 */
export const modalVariants: Variants = {
  initial: { 
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  animate: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easing.easeOut
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
      ease: easing.easeIn
    }
  }
};

/**
 * Backdrop blur animations for overlays and modals
 * @constant {Variants} backdropVariants - Backdrop blur animation variants
 * @property {Object} backdropVariants.initial - Initial clear state
 * @property {Object} backdropVariants.animate - Animate to blurred state
 * @property {Object} backdropVariants.exit - Exit to clear state
 */
export const backdropVariants: Variants = {
  initial: { 
    opacity: 0,
    backdropFilter: "blur(0px)"
  },
  animate: { 
    opacity: 1,
    backdropFilter: "blur(8px)",
    transition: {
      duration: 0.3,
      ease: easing.easeOut
    }
  },
  exit: { 
    opacity: 0,
    backdropFilter: "blur(0px)",
    transition: {
      duration: 0.2,
      ease: easing.easeIn
    }
  }
};


/**
 * @fileoverview Animation Primitives - TraxYard Design System
 * 
 * Centralized animation definitions for consistent motion across the application.
 * Provides reusable spring configurations, transition variants, and easing functions.
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
 * - Consistent spring physics across components
 * - Reusable transition variants
 * - Responsive animation scaling
 * - Performance-optimized configurations
 * - Accessibility-aware motion preferences
 * - Type-safe animation definitions
 */

/**
 * Spring physics configurations for different interaction types
 */
export const springConfigs = {
  // Subtle, quick spring for micro-interactions
  subtle: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  },
  
  // Standard spring for most UI animations
  standard: {
    type: "spring" as const,
    stiffness: 340,
    damping: 28,
    mass: 0.6,
  },
  
  // Gentle spring for large elements
  gentle: {
    type: "spring" as const,
    stiffness: 280,
    damping: 25,
    mass: 0.8,
  },
  
  // Snappy spring for buttons and controls
  snappy: {
    type: "spring" as const,
    stiffness: 500,
    damping: 35,
    mass: 0.5,
  },
  
  // Bouncy spring for playful interactions
  bouncy: {
    type: "spring" as const,
    stiffness: 300,
    damping: 20,
    mass: 0.8,
  },
} as const;

/**
 * Easing functions for different animation types
 */
export const easings = {
  // Standard easing curves
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  
  // Custom easing for specific use cases
  smooth: [0.25, 0.46, 0.45, 0.94],
  snappy: [0.68, -0.55, 0.265, 1.55],
  gentle: [0.23, 1, 0.32, 1],
} as const;

/**
 * Common animation durations (in seconds)
 */
export const durations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

/**
 * Fade in animation variant
 * @param delay - Animation delay in seconds
 * @param duration - Animation duration in seconds
 * @returns Framer Motion variant object
 */
export const fadeIn = (delay = 0, duration = durations.normal) => ({
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { 
      ...springConfigs.standard, 
      delay,
      duration 
    } 
  },
  exit: { 
    opacity: 0, 
    transition: { 
      ...springConfigs.subtle, 
      duration: duration * 0.7 
    } 
  },
});

/**
 * Slide up animation variant
 * @param delay - Animation delay in seconds
 * @param distance - Slide distance in pixels
 * @param duration - Animation duration in seconds
 * @returns Framer Motion variant object
 */
export const slideUp = (delay = 0, distance = 12, duration = durations.normal) => ({
  initial: { opacity: 0, y: distance },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      ...springConfigs.standard, 
      delay,
      duration 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -distance, 
    transition: { 
      ...springConfigs.subtle, 
      duration: duration * 0.7 
    } 
  },
});

/**
 * Slide down animation variant
 * @param delay - Animation delay in seconds
 * @param distance - Slide distance in pixels
 * @param duration - Animation duration in seconds
 * @returns Framer Motion variant object
 */
export const slideDown = (delay = 0, distance = 12, duration = durations.normal) => ({
  initial: { opacity: 0, y: -distance },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      ...springConfigs.standard, 
      delay,
      duration 
    } 
  },
  exit: { 
    opacity: 0, 
    y: distance, 
    transition: { 
      ...springConfigs.subtle, 
      duration: duration * 0.7 
    } 
  },
});

/**
 * Scale in animation variant
 * @param delay - Animation delay in seconds
 * @param from - Initial scale value
 * @param duration - Animation duration in seconds
 * @returns Framer Motion variant object
 */
export const scaleIn = (delay = 0, from = 0.96, duration = durations.normal) => ({
  initial: { opacity: 0, scale: from },
  animate: { 
    opacity: 1, 
    scale: 1, 
    transition: { 
      ...springConfigs.standard, 
      delay,
      duration 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: from, 
    transition: { 
      ...springConfigs.subtle, 
      duration: duration * 0.7 
    } 
  },
});

/**
 * Slide in from left animation variant
 * @param delay - Animation delay in seconds
 * @param distance - Slide distance in pixels
 * @param duration - Animation duration in seconds
 * @returns Framer Motion variant object
 */
export const slideInLeft = (delay = 0, distance = 20, duration = durations.normal) => ({
  initial: { opacity: 0, x: -distance },
  animate: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      ...springConfigs.standard, 
      delay,
      duration 
    } 
  },
  exit: { 
    opacity: 0, 
    x: -distance, 
    transition: { 
      ...springConfigs.subtle, 
      duration: duration * 0.7 
    } 
  },
});

/**
 * Slide in from right animation variant
 * @param delay - Animation delay in seconds
 * @param distance - Slide distance in pixels
 * @param duration - Animation duration in seconds
 * @returns Framer Motion variant object
 */
export const slideInRight = (delay = 0, distance = 20, duration = durations.normal) => ({
  initial: { opacity: 0, x: distance },
  animate: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      ...springConfigs.standard, 
      delay,
      duration 
    } 
  },
  exit: { 
    opacity: 0, 
    x: distance, 
    transition: { 
      ...springConfigs.subtle, 
      duration: duration * 0.7 
    } 
  },
});

/**
 * Stagger container for animating children in sequence
 * @param delay - Base delay between children
 * @param staggerDelay - Additional delay per child
 * @returns Framer Motion variant object
 */
export const staggerContainer = (delay = 0, staggerDelay = 0.1) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: delay,
    },
  },
});

/**
 * Stagger item for use within stagger containers
 * @param variant - Animation variant to apply
 * @returns Framer Motion variant object
 */
export const staggerItem = (variant = fadeIn()) => ({
  ...variant,
});

/**
 * Modal-specific animations
 */
export const modalAnimations = {
  // Backdrop fade in/out
  backdrop: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1, 
      transition: { 
        ...springConfigs.gentle, 
        duration: durations.fast 
      } 
    },
    exit: { 
      opacity: 0, 
      transition: { 
        ...springConfigs.subtle, 
        duration: durations.fast 
      } 
    },
  },
  
  // Modal content scale and fade
  content: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { 
        ...springConfigs.standard, 
        duration: durations.normal 
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 10, 
      transition: { 
        ...springConfigs.subtle, 
        duration: durations.fast 
      } 
    },
  },
} as const;

/**
 * Button hover animations
 */
export const buttonAnimations = {
  hover: {
    scale: 1.02,
    transition: springConfigs.snappy,
  },
  tap: {
    scale: 0.98,
    transition: springConfigs.snappy,
  },
} as const;

/**
 * Table row animations
 */
export const tableAnimations = {
  row: {
    initial: { opacity: 0, y: 5 },
    animate: { 
      opacity: 1, 
      y: 0, 
      transition: springConfigs.subtle 
    },
    exit: { 
      opacity: 0, 
      y: -5, 
      transition: springConfigs.subtle 
    },
  },
} as const;

/**
 * @fileoverview Guard Home Loading Component - TraxYard Guard Interface
 * 
 * Loading component for the guard home page. Provides skeleton UI
 * and loading states while dashboard data is being fetched.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - LoadingStates: Shared loading component
 * - Next.js: Loading UI integration
 * 
 * @features
 * - Skeleton UI for better perceived performance
 * - Context-specific loading messaging
 * - Responsive design for all screen sizes
 * - Accessibility support with loading indicators
 */

import LoadingStates from "@/app/components/ui/LoadingStates";

/**
 * Guard Home Loading Component
 * 
 * Displays skeleton loading state for the guard dashboard.
 * Uses skeleton variant for better perceived performance.
 * 
 * @returns {JSX.Element} Loading skeleton with dashboard context
 * 
 * @performance
 * - Skeleton UI reduces perceived loading time
 * - Optimized for fast rendering
 * - Minimal resource usage
 * 
 * @accessibility
 * - Proper loading indicators
 * - Screen reader announcements
 * - Maintains layout structure
 */
export default function Loading() {
  return <LoadingStates context="dashboard" variant="skeleton" />;
}

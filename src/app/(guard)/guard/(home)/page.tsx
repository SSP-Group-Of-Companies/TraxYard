/**
 * @fileoverview Guard Home Page - TraxYard Guard Interface
 * 
 * Server component that renders the main guard dashboard page.
 * Provides metadata and serves as the entry point for guard operations.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - HomeClient: Client-side dashboard component
 * - Next.js: Server component architecture
 * 
 * @features
 * - Server-side rendering for SEO
 * - Metadata configuration
 * - Client component integration
 * - Performance optimization
 */

// Server component: renders the client view

import HomeClient from "./components/HomeClient";

/**
 * Page metadata configuration
 * @constant {Object} metadata - SEO and page information
 */
export const metadata = {
  title: "TraxYard Guard Dashboard",
  description: "Guard entry for IN / OUT / INSPECTION",
};

/**
 * Guard Home Page Component
 * 
 * Server component that renders the main guard dashboard interface.
 * Provides the entry point for guard operations and trailer management.
 * 
 * @returns {JSX.Element} Rendered guard dashboard
 * 
 * @performance
 * - Server-side rendering for faster initial load
 * - Optimized metadata for SEO
 * - Client component hydration
 * 
 * @accessibility
 * - Proper page structure
 * - Semantic HTML
 * - Screen reader support
 */
export default function Page() {
  return <HomeClient />;
}

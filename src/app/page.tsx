/**
 * @fileoverview Root Page - TraxYard Application Entry Point
 * 
 * This is the root page that serves as the entry point for the TraxYard application.
 * The middleware handles authentication redirects, so this page should rarely be rendered.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - Next.js: Server component architecture
 * - Middleware: Authentication handling
 * 
 * @features
 * - Fallback page for edge cases
 * - Middleware handles all authentication redirects
 * - SEO-friendly content
 */

/**
 * Root Page Component
 * 
 * Fallback page that should rarely be rendered due to middleware redirects.
 * Provides a loading state while authentication is being processed.
 * 
 * @returns {JSX.Element} Loading page
 * 
 * @performance
 * - Minimal rendering overhead
 * - Fast loading with simple content
 * - Middleware handles all redirects
 */
export default function RootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading TraxYard...</p>
      </div>
    </div>
  );
}

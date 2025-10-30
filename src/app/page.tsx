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
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  redirect("/guard");
}

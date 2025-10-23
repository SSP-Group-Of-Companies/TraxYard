/**
 * @fileoverview Root Page - TraxYard Application Entry Point
 * 
 * This is the root page that handles the initial routing logic for the TraxYard application.
 * It redirects unauthenticated users to the login page and authenticated users to the guard dashboard.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - Next.js: Server component architecture
 * - NextAuth: Authentication handling
 * 
 * @features
 * - Automatic redirect to login for unauthenticated users
 * - Automatic redirect to guard dashboard for authenticated users
 * - Server-side authentication check
 * - SEO-friendly redirects
 */

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

/**
 * Root Page Component
 * 
 * Handles the initial routing logic for the TraxYard application.
 * Redirects users based on their authentication status.
 * 
 * @returns {Promise<never>} Redirects to appropriate page
 * 
 * @logic
 * - If user is authenticated: redirect to guard dashboard (/guard)
 * - If user is not authenticated: redirect to login page (/login)
 * - Middleware handles the actual redirect logic
 * 
 * @performance
 * - Server-side authentication check
 * - Immediate redirect without rendering
 * - Optimized for fast user experience
 */
export default async function RootPage() {
  // Get the current session
  const session = await getServerSession(authOptions);
  
  // If user is authenticated, redirect to guard dashboard
  if (session) {
    redirect("/guard");
  }
  
  // If user is not authenticated, redirect to login
  redirect("/login");
}

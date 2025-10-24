/**
 * @fileoverview Guard Layout Component - TraxYard Guard Interface
 * 
 * Main layout wrapper for the guard section with green gradient background.
 * Features responsive design, watermark support, and proper z-index hierarchy.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - React: Core framework functionality
 * - Next.js: Layout component architecture
 * 
 * @features
 * - Green gradient background (from-white via-green-100 to-green-600)
 * - Watermark support with proper z-index hierarchy
 * - Responsive design for all screen sizes
 * - Fixed positioning for consistent background
 * - Non-interfering with existing watermark
 */

import type { ReactNode } from "react";
import Navbar from "@/app/components/shared/Navbar";
import Footer from "@/app/components/shared/Footer";

/**
 * Guard Layout Component
 * 
 * Main layout wrapper for the guard section with green gradient background.
 * Implements proper z-index hierarchy to ensure watermark visibility.
 * 
 * @param {Object} props - Component properties
 * @param {ReactNode} props.children - Child components to render
 * 
 * @returns {JSX.Element} Guard layout with green gradient background
 * 
 * @z-index-hierarchy
 * - Green gradient: z-0 (background layer)
 * - Watermark: z-index: 0 (middle layer, same as gradient)
 * - Content: z-10 (foreground layer)
 * 
 * @design
 * - Green gradient: from-white via-green-100 to-green-400
 * - 50% opacity for subtle background effect
 * - Fixed positioning for consistent coverage
 * - Non-interfering with watermark functionality
 */
export default function GuardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col guard-watermark relative">
      {/* Green gradient background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-white via-green-100 to-green-300 opacity-40" />
      <div className="relative z-10 flex flex-col min-h-dvh">
        <Navbar variant="guard" />
        <main className="guard-content flex-1 pt-16 sm:pt-16">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

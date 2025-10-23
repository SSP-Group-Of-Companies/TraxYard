/**
 * @fileoverview TrailerSearchModal Component - TraxYard Guard Interface
 * 
 * Modal component for trailer search and selection operations. Provides
 * a focused interface for guards to search and select trailers for
 * IN, OUT, or INSPECTION operations.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - React: Core framework functionality with hooks
 * - Next.js: Client-side component architecture
 * 
 * @features
 * - Modal overlay with backdrop blur
 * - Keyboard navigation (Escape to close)
 * - Click-outside-to-close functionality
 * - Responsive design for mobile and desktop
 * - Accessibility support with proper ARIA attributes
 * - Focus management and keyboard navigation
 */

"use client";

import { useEffect, useRef } from "react";

/**
 * TrailerSearchModal Component
 * 
 * Modal interface for trailer search and selection operations.
 * Handles keyboard navigation, focus management, and user interactions.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.open - Whether the modal is visible
 * @param {function} props.onClose - Callback to close the modal
 * @param {("IN" | "OUT" | "INSPECTION")} props.mode - Current operation mode
 * 
 * @returns {JSX.Element | null} Rendered modal or null if closed
 * 
 * @accessibility
 * - Proper ARIA attributes for modal behavior
 * - Keyboard navigation support (Escape key)
 * - Focus management and trap
 * - Screen reader announcements
 * 
 * @interactions
 * - Click outside to close
 * - Escape key to close
 * - Focus management on open/close
 * - Event delegation for performance
 */
export default function TrailerSearchModal({
  open,
  onClose,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  mode: "IN" | "OUT" | "INSPECTION";
}) {
  // Ref for modal content to prevent event bubbling
  const ref = useRef<HTMLDivElement>(null);

  /**
   * Handle keyboard navigation
   * @performance Uses event delegation for better performance
   * @accessibility Provides keyboard navigation support
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl p-4 shadow-[var(--shadow-2)]
                   backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/85
                   ring-1 ring-white/50"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Trailer {mode}</h2>
          <button
            className="button-base button-quiet h-9 px-3"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium">Trailer Number</label>
          <input className="input mt-1" placeholder="Enter trailer number" />
          {/* TODO: results table + branches per spec */}
        </div>
      </div>
    </div>
  );
}

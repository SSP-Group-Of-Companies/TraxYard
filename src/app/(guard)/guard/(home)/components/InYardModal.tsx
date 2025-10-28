/**
 * @fileoverview InYardModal Component - TraxYard Guard Interface
 * 
 * Modal component for displaying trailers currently IN the active yard.
 * Features search functionality, pagination, and accessible table interface.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - React: Core framework functionality with hooks
 * - lucide-react: For consistent iconography
 * - useYardStore: For accessing current yard information
 * - useInYardTrailers: For fetching and managing trailer data
 * 
 * @features
 * - Focused modal with backdrop blur
 * - Real-time search with debounced input
 * - Accessible table with proper ARIA attributes
 * - Pagination with navigation controls
 * - Keyboard navigation (Escape to close)
 * - Click-outside-to-close functionality
 * - Responsive design for mobile and desktop
 * - Loading states and error handling
 */

"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { useYardStore } from "@/store/useYardStore";
import { useInYardTrailers } from "../hooks/useInYardTrailers";
import Pager from "@/components/ui/Pager";
import { modalAnimations } from "@/lib/animations/animated";

/**
 * Component props interface
 */
interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * InYardModal Component
 * 
 * Modal interface for displaying trailers currently IN the active yard.
 * Provides search, filtering, and pagination capabilities with accessibility support.
 * 
 * @param {Props} props - Component properties
 * @param {boolean} props.open - Whether the modal is visible
 * @param {function} props.onClose - Callback to close the modal
 * 
 * @returns {JSX.Element | null} Rendered modal or null if closed
 * 
 * @accessibility
 * - Proper ARIA attributes for modal behavior
 * - Keyboard navigation support (Escape key)
 * - Focus management and trap
 * - Screen reader announcements
 * - Table headers with proper scope
 * 
 * @interactions
 * - Click outside to close
 * - Escape key to close
 * - Focus management on open/close
 * - Search input with real-time filtering
 * - Pagination controls
 */
export default function InYardModal({ open, onClose }: Props) {
  const { yardId } = useYardStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  // Fetch trailers with search and pagination
  const { rows, meta, loading, error, setPage, setQuery } = useInYardTrailers(yardId, {
    pageSize: 20,
  });

  /**
   * Handle modal open/close focus management and keyboard shortcuts
   * @accessibility Ensures proper focus management for screen readers
   */
  useEffect(() => {
    if (open) {
      // Store the currently focused element
      lastFocusedElement.current = document.activeElement as HTMLElement;
      
      // Focus search input on open
      setTimeout(() => inputRef.current?.focus(), 0);
      
      // Prevent background scroll
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      
      // Handle keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        } else if (e.key === "ArrowRight" && meta?.hasNext) {
          setPage(meta.page + 1);
        } else if (e.key === "ArrowLeft" && meta?.hasPrev) {
          setPage(meta.page - 1);
        }
      };
      
      window.addEventListener("keydown", handleKeyDown);
      
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    } else {
      // Restore focus when closing
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
        lastFocusedElement.current = null;
      }
    }
  }, [open, onClose, meta, setPage]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-2 sm:p-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="inyard-title"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={modalAnimations.backdrop}
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-hidden="true"
          />
          
          {/* Modal Content */}
          <motion.div
            ref={dialogRef}
            className="relative z-20 w-full max-w-[900px] rounded-2xl bg-white ring-1 ring-black/10 shadow-xl
                       max-h-[85vh] overflow-hidden flex flex-col"
            variants={modalAnimations.content}
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-black/10">
          <h2 id="inyard-title" className="text-lg sm:text-xl font-semibold text-gray-900">
            Trailers in Yard
          </h2>
          <button
            aria-label="Close modal"
            className="p-2 rounded-md hover:bg-black/5 active:scale-95 transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto">
          {/* Live region for screen readers */}
          <div className="sr-only" aria-live="polite">
            {loading ? "Loading trailers…" : 
             Array.isArray(rows) && rows.length ? `${rows.length} trailers loaded` : 
             "No trailers found"}
          </div>

          {/* Controls row: search (left) + pager (right) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search trailer # or truck #"
                className="w-full rounded-xl border border-gray-200 px-10 py-2.5 text-sm
                         outline-none focus:ring-2 focus:ring-[#0B63B6]/30 focus:border-[#0B63B6]
                         placeholder:text-gray-400"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Pager */}
            <div className="shrink-0 self-end sm:self-auto">
              <Pager
                page={meta?.page ?? 1}
                totalPages={meta?.totalPages ?? 1}
                onPage={(p) => setPage(p)}
                disabled={loading}
                compact={true}
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl ring-1 ring-black/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trailer #</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date &amp; Time (Entry)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && (
                    <tr>
                      <td className="px-3 py-4 text-center text-gray-500" colSpan={4}>
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0B63B6]"></div>
                          Loading trailers...
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {error && !loading && (
                    <tr>
                      <td className="px-3 py-4 text-center text-red-600" colSpan={4}>
                        {error.message || "Failed to load trailers."}
                      </td>
                    </tr>
                  )}
                  
                  {!loading && Array.isArray(rows) && rows.length === 0 && !error && (
                    <tr>
                      <td className="px-3 py-4 text-center text-gray-500" colSpan={4}>
                        No trailers found in this yard.
                      </td>
                    </tr>
                  )}
                  
                  {Array.isArray(rows) && rows.map((trailer, idx) => {
                    const seq = ((meta?.page ?? 1) - 1) * (meta?.pageSize ?? 20) + idx + 1;
                    return (
                      <tr
                        key={trailer.id || trailer.trailerNumber}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => console.log("Selected trailer:", trailer.trailerNumber)}
                      >
                        <td className="px-3 py-3 text-gray-700 tabular-nums">{seq}</td>
                        <td className="px-3 py-3 font-medium text-gray-900">{trailer.trailerNumber}</td>
                        <td className="px-3 py-3 text-gray-700">{trailer.loadState ?? "-"}</td>
                        <td className="px-3 py-3 text-gray-700">
                          {trailer.lastMoveIo?.ts ? trailer.lastMoveIo.ts.toLocaleString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

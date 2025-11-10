/**
 * @fileoverview Trailer Search Modal - TraxYard Global Trailer Search Interface
 * 
 * Provides a comprehensive trailer search interface with focus trap, inline status
 * labels, warning indicators, and seamless integration with the trailer search hook.
 * Supports three modes: IN (Coming IN), OUT (Going OUT), and INSPECTION.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - framer-motion - Animation library for smooth transitions
 * - lucide-react - Icon library for UI elements
 * - @/components/ui/Pager - Pagination component
 * - @/app/(guard)/guard/(home)/hooks/useTrailerSearch - Search functionality
 * - @/lib/animations - Animation variants and configurations
 * 
 * @features
 * - Global trailer search across all yards
 * - Focus trap for keyboard accessibility
 * - Inline status labels with warnings
 * - Safety inspection expiry warnings
 * - Damage status indicators
 * - "New Trailer" creation flow
 * - Responsive design with mobile optimization
 * - Smooth animations and transitions
 * - Comprehensive error handling
 * 
 * @accessibility
 * - Full keyboard navigation support
 * - Focus trap prevents focus from escaping modal
 * - ARIA labels and live regions for screen readers
 * - High contrast warning indicators
 * - Semantic HTML structure
 * 
 * @example
 * ```typescript
 * import TrailerSearchModal from "@/app/(guard)/guard/(home)/components/TrailerSearchModal";
 * 
 * function GuardActions() {
 *   const [searchOpen, setSearchOpen] = useState<false | "IN" | "OUT" | "INSPECTION">(false);
 * 
 *   return (
 *     <TrailerSearchModal
 *       open={!!searchOpen}
 *       mode={searchOpen || "IN"}
 *       onClose={() => setSearchOpen(false)}
 *       onContinue={(trailerNumber) => {
 *         // Route to guard data page
 *         router.push(`/guard/data?mode=${searchOpen}&trailer=${trailerNumber}`);
 *       }}
 *       onCreateNew={() => {
 *         // Open new trailer form
 *         setNewTrailerOpen(true);
 *       }}
 *     />
 *   );
 * }
 * ```
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, AlertTriangle } from "lucide-react";
import Pager from "@/components/ui/Pager";
import { useTrailerSearch } from "../hooks/useTrailerSearch";
import { modalAnimations } from "@/lib/animations";
import { refreshBus } from "@/lib/refresh/refreshBus";
import { useYardStore } from "@/store/useYardStore";
import PreflightWarnings from "./PreflightWarnings";
import NewTrailerModal from "./NewTrailerModal";
import { usePendingTrailer } from "@/store/usePendingTrailer";
import { yards } from "@/data/yards";

/**
 * Focus trap helper function
 * 
 * Retrieves all focusable elements within a container, excluding
 * disabled and hidden elements. Used for keyboard navigation
 * within the modal.
 * 
 * @param {HTMLElement} root - Container element to search within
 * @returns {HTMLElement[]} Array of focusable elements
 */
function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
}

/**
 * Search mode enumeration
 * 
 * Defines the three possible search modes based on the action
 * that opened the search modal.
 */
type Mode = "IN" | "OUT" | "INSPECTION";

/**
 * Component props interface
 * 
 * @interface Props
 * @property {boolean} open - Whether the modal is open
 * @property {Mode} mode - Search mode (IN/OUT/INSPECTION)
 * @property {() => void} onClose - Function to close the modal
 * @property {(trailerNumber: string) => void} onContinue - Function to continue with selected trailer
 * @property {() => void} [onCreateNew] - Optional function to create new trailer
 */
type Props = {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onContinue: (trailerNumber: string) => void;
};

/**
 * Inline status label type
 * 
 * Defines the different types of status labels that can appear
 * below the search input based on search results and trailer state.
 */
type StatusLabel = {
  kind: "new" | "existing" | "existingWarn";
  text: string;
};

/**
 * Trailer Search Modal Component
 * 
 * Provides a comprehensive interface for searching and selecting trailers
 * with support for different search modes, inline status indicators,
 * warning labels, and seamless integration with the trailer search system.
 * 
 * @param {Props} props - Component properties
 * @returns {JSX.Element} Modal component
 * 
 * @accessibility
 * - Full keyboard navigation with Tab/Shift+Tab
 * - Focus trap prevents focus from escaping modal
 * - Escape key closes modal
 * - ARIA labels and live regions for screen readers
 * - High contrast warning indicators
 * 
 * @performance
 * - Debounced search input prevents excessive API calls
 * - Efficient re-renders with proper memoization
 * - Optimized animation variants
 * - Lazy loading of search results
 */
export default function TrailerSearchModal({
  open,
  mode, 
  onClose,
  onContinue, 
}: Props) {
  // Refs for DOM manipulation and focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Local state for search input
  const [typed, setTyped] = useState("");
  const enabled = open === true;

  // Trailer search hook with configuration
  const { rows, meta, loading, error, page, setPage, setQuery } = useTrailerSearch({
    pageSize: 20,
    enabled,
    query: "",
  });
  const activeYardId = useYardStore(s => s.yardId);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockMsg, setBlockMsg] = useState<string>("");
  const yardNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const y of yards) m.set(y.id as unknown as string, y.name);
    return m;
  }, []);
  const setPending = usePendingTrailer(s => s.set);
  const [newOpen, setNewOpen] = useState(false);

  // Focus management and accessibility setup
  useEffect(() => {
    if (!open) return;

    // Store the previously focused element for restoration
    lastFocused.current = document.activeElement as HTMLElement;
    
    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the search input after modal opens
    setTimeout(() => inputRef.current?.focus(), 0);

    // Keyboard event handler for escape and focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close modal on escape
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap for Tab navigation
      if (e.key !== "Tab" || !dialogRef.current) return;
      
      const focusableElements = getFocusables(dialogRef.current);
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        // Shift+Tab: move to previous element
        if (activeElement === firstElement || !dialogRef.current.contains(activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move to next element
        if (activeElement === lastElement || !dialogRef.current.contains(activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup function
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      lastFocused.current?.focus();
      lastFocused.current = null;
    };
  }, [open, onClose]);

  // Note: Reset logic removed - now handled by key-based remounting in parent

  // Debounce search input via hook's setQuery
  useEffect(() => {
    setQuery(typed);
  }, [typed, setQuery]);

  // While the modal is open, pause global refresh ticks so mobile
  // virtual keyboards are not dismissed by background re-renders.
  useEffect(() => {
    if (!open) return;
    refreshBus.pause();
    return () => {
      refreshBus.resume();
    };
  }, [open]);

  /**
   * Determines inline status label based on search results and trailer state
   * 
   * Analyzes the current search query and results to determine what status
   * label should be displayed below the search input. Handles new trailers,
   * existing trailers, and warning states for expired inspections or damage.
   * 
   * @returns {StatusLabel | null} Status label object or null
   */
  const statusLabel = useMemo((): StatusLabel | null => {
    const query = typed.trim();
    if (!query) return null;

    // Normalize for case and formatting differences (e.g., hyphens/spaces)
    const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const nQuery = normalize(query);

    // Find normalized match for the typed trailer number
    const match = rows.find(row => normalize(row.trailerNumber ?? "") === nQuery);
    if (!match) {
      return { kind: "new", text: "New trailer (not found in DB)" };
    }

    // Check for warnings (expired inspection, damage)
    const warnings: string[] = [];
    const now = Date.now();
    
    // Check safety inspection expiry
    const inspectionDate = match.safetyInspectionExpiryDate;
    const inspectionExpired = inspectionDate instanceof Date 
      ? inspectionDate.getTime() < now
      : typeof inspectionDate === "string"
        ? Date.parse(inspectionDate) < now
        : false;
    
    if (inspectionExpired) {
      warnings.push("Expired safety inspection");
    }
    
    // Check for damage status
    if ((match as any).condition === "DAMAGED") {
      warnings.push("Damaged");
    }

    // Return appropriate status based on warnings
    if (warnings.length > 0) {
      return { kind: "existingWarn", text: warnings.join(" · ") };
    }
    
    return { kind: "existing", text: "Existing trailer" };
  }, [typed, rows]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-2 sm:p-4 overscroll-contain"
          style={{
            paddingTop: "calc(var(--nav-height,56px) + env(safe-area-inset-top) + 8px)",
          }}
      role="dialog"
      aria-modal="true"
          aria-labelledby="ts-title"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={modalAnimations.backdrop}
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={onClose} 
            aria-hidden="true" 
          />

          {/* Modal Panel */}
          <motion.div
            ref={dialogRef}
            role="document"
            className="relative w-full max-w-[900px] rounded-2xl bg-white ring-1 ring-black/10 shadow-xl
                       max-h-[85vh] overflow-hidden flex flex-col"
            style={{ maxHeight: "85dvh" }}
            variants={modalAnimations.content}
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-black/10">
              <div className="flex items-start justify-between gap-3">
                <h2 id="ts-title" className="text-base sm:text-lg font-semibold text-gray-900">
                Search Trailers {mode === "IN" ? "(Coming IN)" : mode === "OUT" ? "(Going OUT)" : "(Inspection)"}
              </h2>
          <button
                aria-label="Close modal"
                  className="p-2 rounded-md hover:bg-black/5 active:scale-95 transition-colors shrink-0"
            onClick={onClose}
          >
                <X className="h-5 w-5 text-gray-500" />
          </button>
              </div>
        </div>

            {/* Body */}
            <div className="p-3 sm:p-6 overflow-y-auto">
              {/* Search Controls */}
              <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4">
                {/* Pagination Controls (first) */}
                <div className="shrink-0 flex justify-end">
                  <Pager
                    page={page}
                    totalPages={meta?.totalPages ?? 1}
                    total={meta?.total ?? rows.length}
                    pageSize={meta?.pageSize ?? 20}
                    onPage={setPage}
                    disabled={loading}
                    showCount
                    countVariant="muted"
                  />
                </div>

                {/* Search */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search trailer number"
                    className="w-full rounded-xl border border-gray-200 px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B63B6]/30 focus:border-[#0B63B6] placeholder:text-gray-400"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="search"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const query = typed.trim();
                        if (query) {
                          const match = rows.find(row => row.trailerNumber === query);
                          if (match) {
                            const trailerYard = (match as any).yardId as string | undefined;
                            const status = (match as any).status as string | undefined;
                            if (status === "IN" && trailerYard && trailerYard !== activeYardId) {
                              setBlockMsg("This trailer is IN at a different yard. Switch your active yard to proceed.");
                              setBlockOpen(true);
                              return;
                            }
                            if (mode !== "INSPECTION") {
                              if ((mode === "IN" && status === "IN") || (mode === "OUT" && status === "OUT")) {
                                setBlockMsg(`The last movement for this trailer is ${status}. The next movement must be ${status === "IN" ? "OUT" : "IN"}.`);
                                setBlockOpen(true);
                                return;
                              }
                            }
                            onContinue(match.trailerNumber);
                          }
                        }
                      }
                    }}
                  />
                  {typed.length > 0 && (
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setTyped("")}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {statusLabel && (
                    <div
                      className={`mt-1 text-xs ${
                        statusLabel.kind === "new" ? "text-red-600" : statusLabel.kind === "existingWarn" ? "text-amber-600" : "text-[var(--color-green)]"}
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      {statusLabel.text}
                    </div>
                  )}
                </div>
              </div>

              {/* New Trailer CTA */}
              {typed.trim() && statusLabel?.kind === "new" && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setNewOpen(true)}
                    className="button-base button-solid"
                    style={{ background: "var(--color-green)" }}
                  >
                    + New Trailer
                  </button>
                </div>
              )}

              {/* Search Results Table */}
              <div className="rounded-xl ring-1 ring-black/10 overflow-hidden">
                <div className="overflow-x-auto min-h-[240px]"> {/* ~10 rows @ 24px */}
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trailer #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody aria-busy={loading ? "true" : "false"} className="bg-white divide-y divide-gray-200">
                      {/* Loading State */}
                      {loading && (
                        <tr>
                          <td className="px-3 py-4 text-center text-gray-500" colSpan={3}>
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-blue)]"></div>
                              Searching…
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Error State */}
                      {error && !loading && error.name !== "AbortError" && (
                        <tr>
                          <td className="px-3 py-4 text-center text-red-600" colSpan={3}>
                            {(error as any)?.message || "Failed to load trailers."}
                          </td>
                        </tr>
                      )}

                      {/* Empty State */}
                      {!loading && rows.length === 0 && !error && (
                        <tr>
                          <td className="px-3 py-4 text-center text-gray-500" colSpan={3}>
                            {typed.trim() ? "No matching trailers." : "Start typing to search trailers."}
                          </td>
                        </tr>
                      )}

                      {/* Search Results */}
                      {rows.map((trailer) => {
                        // Check for safety inspection expiry
                        const inspectionExpired = (() => {
                          const date = trailer.safetyInspectionExpiryDate;
                          return date instanceof Date ? date.getTime() < Date.now() : false;
                        })();
                        
                        // Check for damage status
                        const isDamaged = (trailer as any).condition === "DAMAGED";

                        return (
                          <tr
                            key={trailer.id || trailer.trailerNumber}
                            className="hover:bg-gray-50 cursor-pointer transition-colors focus:bg-gray-100 focus:outline-none"
                            tabIndex={0}
                            role="button"
                            aria-label={`Select trailer ${trailer.trailerNumber}`}
                            onClick={() => {
                              const trailerYard = (trailer as any).yardId as string | undefined;
                              const status = (trailer as any).status as string | undefined;
                              if (status === "IN" && trailerYard && trailerYard !== activeYardId) {
                                setBlockMsg("This trailer is IN at a different yard. Switch your active yard to proceed.");
                                setBlockOpen(true);
                                return;
                              }
                              if (mode !== "INSPECTION") {
                                if ((mode === "IN" && status === "IN") || (mode === "OUT" && status === "OUT")) {
                                  setBlockMsg(`The last movement for this trailer is ${status}. The next movement must be ${status === "IN" ? "OUT" : "IN"}.`);
                                  setBlockOpen(true);
                                  return;
                                }
                              }
                              onContinue(trailer.trailerNumber);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const trailerYard = (trailer as any).yardId as string | undefined;
                                const status = (trailer as any).status as string | undefined;
                                if (status === "IN" && trailerYard && trailerYard !== activeYardId) {
                                  setBlockMsg("This trailer is IN at a different yard. Switch your active yard to proceed.");
                                  setBlockOpen(true);
                                  return;
                                }
                                if (mode !== "INSPECTION") {
                                  if ((mode === "IN" && status === "IN") || (mode === "OUT" && status === "OUT")) {
                                    setBlockMsg(`The last movement for this trailer is ${status}. The next movement must be ${status === "IN" ? "OUT" : "IN"}.`);
                                    setBlockOpen(true);
                                    return;
                                  }
                                }
                                onContinue(trailer.trailerNumber);
                              }
                            }}
                          >
                            <td className="px-3 py-3 font-medium text-gray-900 flex items-center gap-2">
                              {trailer.trailerNumber}
                              {inspectionExpired && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                                  <AlertTriangle className="h-3 w-3" />
                                  Inspection due
                                </span>
                              )}
                              {isDamaged && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                                  <AlertTriangle className="h-3 w-3" />
                                  Damaged
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-gray-700">
                              {trailer.owner ?? "—"}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  background: trailer.status === "IN"
                                    ? "color-mix(in oklab,var(--color-green) 18%, transparent)"
                                    : "color-mix(in oklab,var(--color-blue) 18%, transparent)",
                                  color: trailer.status === "IN" 
                                    ? "var(--color-green)" 
                                    : "var(--color-blue)",
                                }}
                              >
                                {trailer.status ?? "—"}
                              </span>
                                {(() => {
                                  const lastYardId = (trailer as any).lastMoveIo?.yardId || (trailer as any).yardId;
                                  const name = lastYardId ? yardNameById.get(lastYardId as string) : undefined;
                                  return name ? <span className="text-xs text-gray-600 truncate max-w-[10rem]">{name}</span> : null;
                                })()}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
        </div>
      </div>

              {/* Footer Help Text */}
              <p className="mt-3 text-[11px] text-muted flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Selecting a trailer may show an info warning if safety inspection is expired or the trailer is reported damaged.
              </p>
    </div>
    {/* Blocking info modal for yard/movement mismatch */}
    <PreflightWarnings
      open={blockOpen}
      onClose={() => setBlockOpen(false)}
      onContinue={() => setBlockOpen(false)}
      showInspection={true}
      customInspectionText={blockMsg}
      showDamaged={false}
      title="Action not allowed"
      continueText="OK"
      hideCancel
    />
    <NewTrailerModal
      open={newOpen}
      onClose={() => setNewOpen(false)}
      onContinue={(t) => {
        setPending(t);
        setNewOpen(false);
        onClose();
        onContinue(t.trailerNumber);
      }}
      presetTrailerNumber={typed.trim() || undefined}
    />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

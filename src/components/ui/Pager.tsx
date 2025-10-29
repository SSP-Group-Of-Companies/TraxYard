/**
 * @fileoverview Pager Component - TraxYard UI Library
 * 
 * Reusable pagination component with accessible navigation controls.
 * Features windowed page numbers, keyboard navigation, and responsive design.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - lucide-react: For consistent iconography
 * - React: Core framework functionality
 * 
 * @features
 * - Windowed page number display (shows 5 pages around current)
 * - Ellipsis for large page ranges
 * - Keyboard navigation support
 * - Accessible ARIA labels and roles
 * - Responsive design with compact mode
 * - Smooth hover and focus transitions
 * - Type-safe props with comprehensive validation
 */

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pager component props interface
 */
interface PagerProps {
  /** Current page number (1-based) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPage: (page: number) => void;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode - shows only current page + arrows */
  compact?: boolean;
  /** Disable all interactions */
  disabled?: boolean;
  /** Total item count (enables "start–end of total" chip when showCount = true) */
  total?: number;
  /** Page size used to compute start/end (defaults to 20 if omitted) */
  pageSize?: number;
  /** Show result count */
  showCount?: boolean;
  /** Count display style */
  countVariant?: "chip" | "muted";
}

/**
 * Generate array of numbers in range [a, b]
 * @param a Start number (inclusive)
 * @param b End number (inclusive)
 * @returns Array of numbers
 */
function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

/**
 * Pager Component
 * 
 * Accessible pagination component with windowed page numbers and ellipsis.
 * Provides keyboard navigation and screen reader support.
 * 
 * @param {PagerProps} props - Component properties
 * @returns {JSX.Element} Rendered pagination controls
 * 
 * @accessibility
 * - Proper ARIA labels and roles for screen readers
 * - Keyboard navigation support (arrow keys, Enter, Space)
 * - Current page indication with aria-current
 * - Disabled state handling with proper attributes
 * 
 * @interactions
 * - Click to navigate to specific page
 * - Arrow keys for previous/next navigation
 * - Enter/Space to activate buttons
 * - Hover and focus states for visual feedback
 */
export default function Pager({
  page,
  totalPages,
  onPage,
  className,
  compact = false,
  disabled = false,
  total,
  pageSize = 20,
  showCount = false,
  countVariant = "chip",
}: PagerProps) {
  // Validation
  if (totalPages < 1) {
    return null;
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Windowed page numbers: up to 5 around current
  const window = 2;
  const start = Math.max(1, page - window);
  const end = Math.min(totalPages, page + window);
  const pages = compact ? [page] : range(start, end);

  const handlePageChange = (newPage: number) => {
    if (disabled || newPage === page || newPage < 1 || newPage > totalPages) {
      return;
    }
    onPage(newPage);
  };

  // Count chip numbers (only if we have a total)
  const showChip = showCount && typeof total === "number" && total >= 0;
  const startIndex = showChip ? (page - 1) * pageSize + 1 : undefined;
  const endIndex = showChip ? Math.min(page * pageSize, total!) : undefined;

  return (
    <nav
      className={[
        "inline-flex items-center gap-2",
        disabled ? "opacity-50 pointer-events-none" : "",
        className ?? "",
      ].join(" ")}
      aria-label="Pagination"
      role="navigation"
      tabIndex={0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowLeft" && hasPrev) { 
          e.preventDefault(); 
          onPage(page - 1); 
        }
        if (e.key === "ArrowRight" && hasNext) { 
          e.preventDefault(); 
          onPage(page + 1); 
        }
      }}
    >
      {/* Previous button */}
      <button
        className="h-8 w-8 grid place-items-center rounded-full ring-1 ring-black/10 text-sm
                   disabled:opacity-40 hover:bg-black/[0.04] focus:bg-black/[0.04]
                   focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in oklab,var(--color-blue) 30%,transparent)] transition-colors"
        onClick={() => handlePageChange(page - 1)}
        disabled={!hasPrev || disabled}
        aria-label="Previous page"
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* First page + ellipsis (when not in compact mode) */}
      {!compact && start > 1 && (
        <>
          <PageDot
            n={1}
            isCurrent={page === 1}
            onClick={() => handlePageChange(1)}
            disabled={disabled}
          />
          {start > 2 && <Ellipsis />}
        </>
      )}

      {/* Page numbers */}
      {pages.map((n) => (
        <PageDot
          key={n}
          n={n}
          isCurrent={n === page}
          onClick={() => handlePageChange(n)}
          disabled={disabled}
        />
      ))}

      {/* Last page + ellipsis (when not in compact mode) */}
      {!compact && end < totalPages && (
        <>
          {end < totalPages - 1 && <Ellipsis />}
          <PageDot
            n={totalPages}
            isCurrent={page === totalPages}
            onClick={() => handlePageChange(totalPages)}
            disabled={disabled}
          />
        </>
      )}

      {/* Next button */}
      <button
        className="h-8 w-8 grid place-items-center rounded-full ring-1 ring-black/10 text-sm
                   disabled:opacity-40 hover:bg-black/[0.04] focus:bg-black/[0.04]
                   focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in oklab,var(--color-blue) 30%,transparent)] transition-colors"
        onClick={() => handlePageChange(page + 1)}
        disabled={!hasNext || disabled}
        aria-label="Next page"
        type="button"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Count display */}
      {showChip && (
        countVariant === "chip" ? (
          <span
            className="ml-1 px-2 h-8 inline-flex items-center rounded-full text-xs tabular-nums
                       bg-black/[0.04] text-black/70 ring-1 ring-black/10"
            aria-live="polite"
            title={`${startIndex}–${endIndex} of ${total}`}
          >
            {totalPages > 1 ? `${startIndex}–${endIndex} of ${total}` : `${total} results`}
          </span>
        ) : (
          <span
            className="ml-2 text-xs text-black/50 tabular-nums"
            aria-live="polite"
          >
            {totalPages > 1 ? `${startIndex}–${endIndex} of ${total}` : `${total} results`}
          </span>
        )
      )}
    </nav>
  );
}

/**
 * Individual page number button component
 */
function PageDot({
  n,
  isCurrent,
  onClick,
  disabled = false,
}: {
  n: number;
  isCurrent: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={[
        "h-8 min-w-8 px-2 rounded-full text-sm font-medium tabular-nums",
        "ring-1 ring-black/10 transition-colors focus:outline-none focus:ring-2",
        isCurrent
          ? "bg-[var(--color-blue)] text-white ring-[var(--color-blue)] focus:ring-[color:color-mix(in oklab,var(--color-blue) 50%,transparent)]"
          : "bg-white hover:bg-black/[0.04] text-black/80 focus:ring-[color:color-mix(in oklab,var(--color-blue) 30%,transparent)]",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      aria-current={isCurrent ? "page" : undefined}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {n}
    </button>
  );
}

/**
 * Ellipsis indicator for large page ranges
 */
function Ellipsis() {
  return (
    <span 
      className="px-1.5 text-black/50 select-none"
      aria-hidden="true"
    >
      …
    </span>
  );
}

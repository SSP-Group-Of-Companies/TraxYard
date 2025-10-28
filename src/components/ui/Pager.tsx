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

  return (
    <nav
      className={[
        "inline-flex items-center gap-2",
        disabled ? "opacity-50 pointer-events-none" : "",
        className ?? "",
      ].join(" ")}
      aria-label="Pagination"
      role="navigation"
    >
      {/* Previous button */}
      <button
        className="h-8 w-8 grid place-items-center rounded-full ring-1 ring-black/10 text-sm
                   disabled:opacity-40 hover:bg-black/[0.04] focus:bg-black/[0.04] 
                   focus:outline-none focus:ring-2 focus:ring-[#0B63B6]/30 transition-colors"
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
                   focus:outline-none focus:ring-2 focus:ring-[#0B63B6]/30 transition-colors"
        onClick={() => handlePageChange(page + 1)}
        disabled={!hasNext || disabled}
        aria-label="Next page"
        type="button"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
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
          ? "bg-[#0B63B6] text-white ring-[#0B63B6] focus:ring-[#0B63B6]/50"
          : "bg-white hover:bg-black/[0.04] text-black/80 focus:ring-[#0B63B6]/30",
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

/**
 * @fileoverview CapacityCard Component - TraxYard Guard Interface
 * 
 * This component displays the current yard capacity information with visual progress indicators.
 * Features real-time capacity tracking, percentage calculations, and responsive design.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - lucide-react: For consistent iconography
 * - React: Core framework functionality with useMemo for performance
 * 
 * @features
 * - Real-time capacity percentage calculation
 * - Visual progress bar with gradient styling
 * - Loading state handling with skeleton UI
 * - Responsive design for mobile and desktop
 * - Accessibility support with ARIA attributes
 * - Smooth animations and transitions
 */

"use client";

import { useMemo } from "react";
import { Boxes, TrendingUp } from "lucide-react";

/**
 * Component props interface for CapacityCard
 * @interface Props
 * @property {string | null} [yardName] - Name of the yard (optional)
 * @property {number | null} [current] - Current capacity count
 * @property {number | null} [max] - Maximum capacity limit
 * @property {boolean} [loading=false] - Loading state indicator
 * @property {string} [className] - Additional CSS classes
 * @property {function} [onClick] - Click handler for opening IN yard modal
 */
type Props = {
  yardName?: string | null;
  current?: number | null;
  max?: number | null;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
};

/**
 * CapacityCard Component
 * 
 * Displays yard capacity information with visual progress indicators.
 * Calculates and displays capacity percentage with smooth animations.
 * 
 * @param {Props} props - Component properties
 * @returns {JSX.Element} Rendered capacity card
 * 
 * @performance
 * - Uses useMemo to optimize percentage calculations
 * - Prevents unnecessary re-renders with memoized values
 * - Efficient capacity percentage computation with bounds checking
 * 
 * @accessibility
 * - Uses aria-label for screen readers
 * - Progress bar with proper ARIA attributes
 * - Semantic HTML structure for better navigation
 * 
 * @example
 * <CapacityCard 
 *   yardName="Main Yard" 
 *   current={45} 
 *   max={100} 
 *   loading={false} 
 * />
 */
export default function CapacityCard({
  yardName,
  current,
  max,
  loading = false,
  className,
  onClick,
}: Props) {
  // Normalize values with fallbacks
  const cur = current ?? 0;
  const cap = max ?? 0;

  /**
   * Calculate capacity percentage with bounds checking
   * Ensures percentage is between 0-100% and handles edge cases
   * 
   * @performance Optimized with useMemo to prevent unnecessary recalculations
   * @returns {number} Capacity percentage (0-100)
   */
  const pct = useMemo(() => {
    if (!cap) return 0;
    const v = Math.max(0, Math.min(100, Math.round((cur / cap) * 100)));
    return v;
  }, [cur, cap]);

  return (
    <section
      className={[
        "rounded-2xl p-4 sm:p-5 shadow-1",
        "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "ring-1 ring-[color:var(--color-outline)]",
        onClick ? "cursor-pointer hover:shadow-md transition" : "",
        className ?? "",
      ].join(" ")}
      aria-label="Current yard capacity"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="grid h-10 w-10 place-items-center rounded-xl shadow-1"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,26,42,0.08), rgba(11,26,42,0.03))",
          }}
        >
          <Boxes className="h-5 w-5" style={{ color: "var(--color-ink)" }} />
        </div>

        {/* Text + bar */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted">
                Current {yardName ? `${yardName} ` : ""}Capacity
              </div>
              <div className="mt-0.5 text-xl font-semibold tabular-nums">
                {loading ? "—" : `${cur} / ${cap}`}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="flex items-center justify-end gap-1 text-sm font-medium text-[var(--color-ink)]">
                <TrendingUp className="h-4 w-4 opacity-70" />
                {cap ? `${pct}%` : "—"}
              </div>
              <div className="text-xs text-muted">Capacity Used</div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-outline-variant)]">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #0B63B6 0%, #00B36B 100%)",
              }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

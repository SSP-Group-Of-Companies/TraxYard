/**
 * @fileoverview ActionButtons Component - TraxYard Guard Interface
 * 
 * This component provides the primary action buttons for the guard interface,
 * allowing guards to select between different trailer operations (IN, OUT, INSPECTION).
 * Features glass-morphism design with hover effects and accessibility support.
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
 * - Glass-morphism button design with backdrop blur
 * - Hover and tap animations for better UX
 * - Accessibility support with aria-pressed
 * - Responsive grid layout (1 column mobile, 3 columns desktop)
 * - Visual feedback for active state
 * - Custom ring colors for each action type
 */

"use client";

import { ArrowDownToLine, ArrowUpFromLine, ClipboardList } from "lucide-react";

/**
 * Represents the available trailer operation modes
 * @typedef {("IN" | "OUT" | "INSPECTION")} Mode
 */
type Mode = "IN" | "OUT" | "INSPECTION";

/**
 * ActionButtons Component
 * 
 * Renders a grid of action buttons for trailer operations with glass-morphism design.
 * Each button represents a different trailer operation mode with distinct visual styling.
 * 
 * @param {Object} props - Component properties
 * @param {Mode | null} [props.active] - Currently active operation mode
 * @param {function} props.onSelect - Callback function when a mode is selected
 * @param {Mode} props.onSelect.m - The selected mode
 * 
 * @returns {JSX.Element} Rendered action buttons grid
 * 
 * @example
 * <ActionButtons 
 *   active="IN" 
 *   onSelect={(mode) => console.log(`Selected: ${mode}`)} 
 * />
 */
export default function ActionButtons({
  active,
  onSelect,
}: {
  active?: Mode | null;
  onSelect: (m: Mode) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <GlassButton
        label="Coming IN"
        icon={<ArrowDownToLine className="h-4 w-4 text-[#00B36B]" />}
        ring="ring-[#00B36B]/30"
        pressed={active === "IN"}
        onClick={() => onSelect("IN")}
      />
      <GlassButton
        label="Going OUT"
        icon={<ArrowUpFromLine className="h-4 w-4 text-[#0B63B6]" />}
        ring="ring-[#0B63B6]/30"
        pressed={active === "OUT"}
        onClick={() => onSelect("OUT")}
      />
      <GlassButton
        label="Inspection"
        icon={<ClipboardList className="h-4 w-4 text-[#0B1A2A]" />}
        ring="ring-black/15"
        pressed={active === "INSPECTION"}
        onClick={() => onSelect("INSPECTION")}
      />
    </div>
  );
}

/* ================================ PRIMITIVE COMPONENT ================================ */

/**
 * GlassButton Primitive Component
 * 
 * A reusable button component with glass-morphism design, featuring:
 * - Backdrop blur effects for modern glass appearance
 * - Hover and tap animations for enhanced user interaction
 * - Accessibility support with proper ARIA attributes
 * - Custom ring colors for visual distinction
 * - Responsive design with proper touch targets
 * 
 * @param {Object} props - Component properties
 * @param {string} props.label - Button text label
 * @param {React.ReactNode} props.icon - Icon component to display
 * @param {boolean} [props.pressed=false] - Whether the button is in pressed state
 * @param {string} props.ring - Tailwind CSS ring color utility class
 * @param {function} props.onClick - Click handler function
 * 
 * @returns {JSX.Element} Rendered glass button
 * 
 * @accessibility
 * - Uses aria-pressed for screen readers
 * - Proper focus management with focus-visible
 * - Keyboard navigation support
 * - Touch-friendly sizing (48px minimum)
 * 
 * @design
 * - Glass-morphism with backdrop-blur
 * - Subtle elevation with shadow effects
 * - Smooth transitions for all interactions
 * - Visual feedback for active states
 */
function GlassButton({
  label,
  icon,
  pressed = false,
  ring,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  pressed?: boolean;
  ring: string; // tailwind ring color utility
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={[
        "relative w-full h-12 px-4 rounded-xl",
        "inline-flex items-center justify-center gap-2 select-none cursor-pointer",
        // glass shell
        "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "ring-1 ring-[var(--color-outline)]", // base outline
        pressed ? `ring-2 ${ring}` : "", // brand ring when active
        // elevation + motion
        "shadow-sm hover:shadow-md active:shadow-sm",
        "transition-all duration-150",
        "hover:-translate-y-[1px] active:translate-y-0",
        "text-[var(--color-ink)] font-semibold",
      ].join(" ")}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* top sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-white/10"
        style={{ maskImage: "linear-gradient(to bottom, black, transparent)" }}
      />
      {/* inner faint border for definition */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/5"
      />
      <span className="relative flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
    </button>
  );
}

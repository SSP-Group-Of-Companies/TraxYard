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

import { ArrowDownToLine, ArrowUpFromLine, Wrench, Truck, ArrowRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { actionButtonVariants, iconVariants, attentionPulse } from "@/lib/animations";

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <EnhancedGlassButton
        label="Coming IN"
        icon={<Truck className="h-5 w-5 text-[var(--color-green)]" />}
        secondaryIcon={<ArrowDownToLine className="h-4 w-4 text-[color:color-mix(in oklab,var(--color-green) 70%,transparent)]" />}
        ring="ring-[color:color-mix(in oklab,var(--color-green) 30%,transparent)]"
        pressed={active === "IN"}
        onClick={() => onSelect("IN")}
        animationType="bounce"
        gradient="from-green-50 to-emerald-100"
      />
      <EnhancedGlassButton
        label="Going OUT"
        icon={<ArrowRight className="h-5 w-5 text-[var(--color-blue)]" />}
        secondaryIcon={<ArrowUpFromLine className="h-4 w-4 text-[color:color-mix(in oklab,var(--color-blue) 70%,transparent)]" />}
        ring="ring-[color:color-mix(in oklab,var(--color-blue) 30%,transparent)]"
        pressed={active === "OUT"}
        onClick={() => onSelect("OUT")}
        animationType="pulse"
        gradient="from-blue-50 to-sky-100"
      />
      <EnhancedGlassButton
        label="Inspection"
        icon={<Wrench className="h-5 w-5 text-[var(--color-ink)]" />}
        secondaryIcon={<CheckCircle className="h-4 w-4 text-[color:color-mix(in oklab,var(--color-ink) 70%,transparent)]" />}
        ring="ring-black/15"
        pressed={active === "INSPECTION"}
        onClick={() => onSelect("INSPECTION")}
        animationType="pulse"
        gradient="from-gray-50 to-slate-100"
      />
    </div>
  );
}

/* ================================ ENHANCED COMPONENT ================================ */

/**
 * Enhanced Glass Button Component with Advanced Animations
 * 
 * A premium button component featuring:
 * - Advanced Framer Motion animations for eye-catching effects
 * - Dual icon system with primary and secondary icons
 * - Gradient backgrounds with glass-morphism
 * - Continuous attention-grabbing animations
 * - Enhanced accessibility and user feedback
 * - Performance-optimized animations
 * 
 * @param {Object} props - Component properties
 * @param {string} props.label - Button text label
 * @param {React.ReactNode} props.icon - Primary icon component
 * @param {React.ReactNode} props.secondaryIcon - Secondary icon for visual depth
 * @param {boolean} [props.pressed=false] - Whether the button is in pressed state
 * @param {string} props.ring - Tailwind CSS ring color utility class
 * @param {function} props.onClick - Click handler function
 * @param {"pulse" | "bounce"} props.animationType - Type of continuous animation
 * @param {string} props.gradient - Tailwind gradient classes
 * 
 * @returns {JSX.Element} Rendered enhanced glass button
 * 
 * @accessibility
 * - Uses aria-pressed for screen readers
 * - Proper focus management with focus-visible
 * - Keyboard navigation support
 * - Touch-friendly sizing (56px minimum)
 * - Reduced motion support for accessibility
 * 
 * @design
 * - Enhanced glass-morphism with gradient backgrounds
 * - Advanced shadow effects with depth
 * - Smooth micro-interactions
 * - Visual hierarchy with dual icons
 * - Attention-grabbing continuous animations
 */
function EnhancedGlassButton({
  label,
  icon,
  secondaryIcon,
  pressed = false,
  ring,
  onClick,
  animationType = "pulse",
  gradient = "from-white/70 to-white/60",
}: {
  label: string;
  icon: React.ReactNode;
  secondaryIcon: React.ReactNode;
  pressed?: boolean;
  ring: string;
  onClick: () => void;
  animationType?: "pulse" | "bounce";
  gradient?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      variants={actionButtonVariants}
      initial="rest"
      animate={pressed ? "active" : "rest"}
      whileHover="hover"
      whileTap="tap"
      className={[
        "relative w-full h-14 px-6 rounded-2xl",
        "inline-flex items-center justify-center gap-3 select-none cursor-pointer",
        // enhanced glass shell with gradient
        `bg-gradient-to-br ${gradient}`,
        "backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-lg",
        "ring-1 ring-white/20", // base outline
        pressed ? `ring-2 ${ring}` : "", // brand ring when active
        // enhanced elevation
        "shadow-lg hover:shadow-2xl",
        "transition-all duration-300",
        "text-[var(--color-ink)] font-bold text-sm",
        "group overflow-hidden",
      ].join(" ")}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Enhanced top sheen with gradient */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/20 to-transparent"
      />
      
      {/* Animated background glow */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Inner content with enhanced layout */}
      <span className="relative flex items-center gap-3 z-10">
        {/* Primary icon with animation */}
        <motion.div
          variants={iconVariants}
          animate={animationType}
          whileHover="hover"
          className="flex items-center gap-1"
        >
          {icon}
          {secondaryIcon}
        </motion.div>
        
        {/* Label with enhanced typography */}
        <span className="font-bold tracking-wide">{label}</span>
      </span>
      
      {/* Attention pulse overlay */}
      {!pressed && (
        <motion.div
          variants={attentionPulse}
          animate="animate"
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "transparent",
            boxShadow: "0 0 0 0 rgba(59, 130, 246, 0.4)",
          }}
        />
      )}
      
      {/* Subtle glow effect for extra attention */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          background: "linear-gradient(45deg, rgba(255,255,255,0.1), transparent, rgba(255,255,255,0.1))",
        }}
        animate={{
          opacity: [0, 0.3, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.button>
  );
}

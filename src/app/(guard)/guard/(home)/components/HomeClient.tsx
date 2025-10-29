/**
 * @fileoverview HomeClient Component - TraxYard Guard Interface
 *
 * Main client component for the guard dashboard home page. Orchestrates all
 * dashboard components with animations, data fetching, and user interactions.
 * Features personalized greetings, real-time data, and modal management.
 *
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 *
 * @dependencies
 * - framer-motion: For smooth animations and transitions
 * - next-auth: For user session management
 * - zustand: For global state management
 * - Custom hooks: useGuardDashboard for data fetching
 * - Custom animations: staggerContainer, staggerItem, fadeInVariants
 *
 * @features
 * - Personalized time-based greetings
 * - Real-time dashboard data with auto-refresh
 * - Smooth animations with staggered reveals
 * - Modal state management for trailer operations
 * - Responsive design for all screen sizes
 * - Error handling and loading states
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  staggerContainer,
  staggerItem,
  fadeInVariants,
} from "@/lib/animations";
import { useYardStore } from "@/store/useYardStore";
import { useGuardDashboard } from "../hooks/useGuardDashboard";

import ActionButtons from "./ActionButtons";
import DailyCounts from "./DailyCounts";
import TrailerSearchModal from "./TrailerSearchModal";
import WeatherChip from "./WeatherChip";
import CapacityCard from "./CapacityCard";
import InYardModal from "./InYardModal";

/**
 * HomeClient Component
 *
 * Main dashboard component that orchestrates all guard interface functionality.
 * Manages state, data fetching, animations, and user interactions.
 *
 * @returns {JSX.Element} Complete guard dashboard interface
 *
 * @state
 * - mode: Tracks active trailer operation mode
 * - data: Real-time dashboard data from API
 * - isLoading: Loading state for data fetching
 *
 * @performance
 * - Memoized greeting calculation for time-based messages
 * - Optimized re-renders with proper state management
 * - Auto-refresh every 60 seconds for real-time data
 *
 * @accessibility
 * - Semantic HTML structure
 * - Proper ARIA labels and roles
 * - Keyboard navigation support
 * - Screen reader friendly content
 */
export default function HomeClient() {
  // Global state management
  const { yardId } = useYardStore();
  const { data: session } = useSession();

  // Centralized data fetching with auto-refresh
  const { data, isLoading } = useGuardDashboard(yardId);

  // Track active action mode for modal management
  const [mode, setMode] = useState<"IN" | "OUT" | "INSPECTION" | null>(null);
  
  // Track IN yard modal state
  const [showInYard, setShowInYard] = useState(false);

  /**
   * Generate time-based greeting message
   * @performance Memoized to prevent unnecessary recalculations
   * @returns {string} Personalized greeting based on current time
   */
  const greet = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Extract first name from user session for personalization
  const firstName =
    (session?.user?.name?.trim().split(/\s+/)[0] as string | undefined) ?? "";

  // Extract statistics data with fallback
  const counts = data?.stats ?? null;

  return (
    <motion.section
      className="container-guard"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* ================= Header ================= */}
      <motion.div
        className="flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:justify-between"
        variants={staggerItem}
      >
        <motion.div variants={fadeInVariants}>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greet}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Here&apos;s the latest for{" "}
            <span className="font-medium">{data?.yard?.name ?? yardId}</span>.
          </p>
        </motion.div>

        <motion.div variants={fadeInVariants}>
          <WeatherChip
            weather={data?.weather ?? null}
            loading={isLoading}
            location={data?.yard?.location ?? null}
          />
        </motion.div>
      </motion.div>

      {/* ================= Yard Capacity ================= */}
      <motion.div className="space-y-4 sm:space-y-6" variants={staggerItem}>
        <motion.div variants={fadeInVariants}>
          <CapacityCard
            yardName={data?.yard?.name ?? null}
            current={isLoading ? null : data?.yard?.capacity.current ?? 0}
            max={isLoading ? null : data?.yard?.capacity.max ?? 0}
            loading={isLoading}
            onClick={() => setShowInYard(true)}
          />
        </motion.div>

        {/* ================= Daily Stats ================= */}
        <motion.div variants={fadeInVariants}>
          <DailyCounts
            inCount={isLoading ? null : counts?.inCount ?? 0}
            outCount={isLoading ? null : counts?.outCount ?? 0}
            damageCount={isLoading ? null : counts?.damageCount ?? 0}
            inspectionCount={isLoading ? null : counts?.inspectionCount ?? 0}
          />
        </motion.div>

        {/* ================= Action Buttons ================= */}
        <motion.div className="mt-6" variants={fadeInVariants}>
          <ActionButtons active={mode} onSelect={(m) => setMode(m)} />
        </motion.div>
      </motion.div>

      {/* ================= Modals ================= */}
      <TrailerSearchModal
        key={mode ?? "none"}                 // Forces a clean mount per open
        open={mode !== null}
        mode={mode ?? "IN"}
        onClose={() => setMode(null)}
        onContinue={(trailerNumber) => {
          // TODO: Route to guard data page with selected trailer
          console.log(`Continue with trailer: ${trailerNumber} in mode: ${mode}`);
          setMode(null);
        }}
        onCreateNew={() => {
          // TODO: Open new trailer form
          console.log("Create new trailer");
          setMode(null);
        }}
      />
      
      <InYardModal
        open={showInYard}
        onClose={() => setShowInYard(false)}
      />
    </motion.section>
  );
}

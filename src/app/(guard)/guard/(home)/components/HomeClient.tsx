/**
 * @fileoverview HomeClient Component - TraxYard Guard Interface
 *
 * Main client component for the guard dashboard home page. Orchestrates all
 * dashboard components with animations, data fetching, and user interactions.
 * Features personalized greetings, real-time data, and modal management.
 *
 * @author Faruq
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.1.0
 *
 * @dependencies
 * - framer-motion: For smooth animations and transitions
 * - next-auth: For user session management
 * - zustand: For global state management
 * - next/navigation: For client-side routing
 * - Custom hooks: useGuardDashboard, usePreflightTrailer
 * - Custom animations: staggerContainer, staggerItem, fadeInVariants
 *
 * @features
 * - Personalized time-based greetings
 * - Real-time dashboard data with auto-refresh
 * - Smooth animations with staggered reveals
 * - Modal state management for trailer operations
 * - Preflight warning flow for damaged/expired trailers
 * - Responsive design and accessibility
 */
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  staggerContainer,
  staggerItem,
  fadeInVariants,
} from "@/lib/animations";
import { useYardStore } from "@/store/useYardStore";
import { useGuardDashboard } from "../hooks/useGuardDashboard";
import { usePreflightTrailer } from "../hooks/usePreflightTrailer";
import { useGuardFlowStore } from "@/store/useGuardFlowStore";

import ActionButtons from "./ActionButtons";
import DailyCounts from "./DailyCounts";
import TrailerSearchModal from "./TrailerSearchModal";
import WeatherChip from "./WeatherChip";
import CapacityCard from "./CapacityCard";
import InYardModal from "./InYardModal";
import PreflightWarnings from "./PreflightWarnings";

export default function HomeClient() {
  const { yardId } = useYardStore();
  const { data: session } = useSession();
  const router = useRouter();

  const { data, isLoading } = useGuardDashboard(yardId);
  const [mode, setMode] = useState<"IN" | "OUT" | "INSPECTION" | null>(null);
  const [showInYard, setShowInYard] = useState(false);

  const preflight = usePreflightTrailer();
  const { setSelection } = useGuardFlowStore();
  const [warn, setWarn] = useState<{
    open: boolean;
    flags: { inspectionExpired: boolean; damaged: boolean };
    trailer?: string;
    mode?: "IN" | "OUT" | "INSPECTION";
  }>({ open: false, flags: { inspectionExpired: false, damaged: false } });

  const greet = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName =
    (session?.user?.name?.trim().split(/\s+/)[0] as string | undefined) ?? "";
  const counts = data?.stats ?? null;

  return (
    <motion.section
      className="container-guard"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
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

        <motion.div variants={fadeInVariants}>
          <DailyCounts
            inCount={isLoading ? null : counts?.inCount ?? 0}
            outCount={isLoading ? null : counts?.outCount ?? 0}
            damageCount={isLoading ? null : counts?.damageCount ?? 0}
            inspectionCount={isLoading ? null : counts?.inspectionCount ?? 0}
          />
        </motion.div>

        <motion.div className="mt-6" variants={fadeInVariants}>
          <ActionButtons active={mode} onSelect={(m) => setMode(m)} />
        </motion.div>
      </motion.div>

      <TrailerSearchModal
        key={mode ?? "none"}
        open={mode !== null}
        mode={mode ?? "IN"}
        onClose={() => setMode(null)}
        onContinue={async (trailerNumber) => {
          if (!mode) return;
          const res = await preflight(trailerNumber);

          if (
            res.exists &&
            (res.flags.inspectionExpired || res.flags.damaged)
          ) {
            setWarn({
              open: true,
              flags: res.flags,
              trailer: trailerNumber,
              mode,
            });
            return;
          }

          setSelection({
            mode,
            trailerNumber,
            flags: {
              inspectionExpired: !!res.flags.inspectionExpired,
              damaged: !!res.flags.damaged,
            },
          });
          setMode(null);
          router.push(
            `/guard/data?mode=${mode}&trailer=${encodeURIComponent(
              trailerNumber
            )}`
          );
        }}
        onCreateNew={() => {
          if (!mode) return;
          setSelection({
            mode,
            trailerNumber: "",
            flags: { inspectionExpired: false, damaged: false },
          });
          setMode(null);
          router.push(`/guard/data?mode=${mode}&new=1`);
        }}
      />

      <PreflightWarnings
        open={warn.open}
        showInspection={warn.flags.inspectionExpired}
        showDamaged={warn.flags.damaged}
        onClose={() => setWarn((v) => ({ ...v, open: false }))}
        onContinue={() => {
          if (!warn.trailer || !warn.mode) return;
          setSelection({
            mode: warn.mode,
            trailerNumber: warn.trailer,
            flags: warn.flags,
          });
          setWarn((v) => ({ ...v, open: false }));
          setMode(null);
          router.push(
            `/guard/data?mode=${warn.mode}&trailer=${encodeURIComponent(
              warn.trailer
            )}`
          );
        }}
      />

      <InYardModal open={showInYard} onClose={() => setShowInYard(false)} />
    </motion.section>
  );
}

"use client";

import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";

function Card({
  label,
  value,
  icon,
  tint: _tint,
}: {
  label: string;
  value: number | null;
  icon: ReactNode;
  tint: string; // hex
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur
                 ring-1 ring-[color:var(--color-outline)] shadow-sm transition-all duration-150 hover:shadow-md"
      style={{ minHeight: 92 }}
    >
      <div className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <div className="text-sm text-muted font-medium whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
            {label}
          </div>
          <div className="mt-1 text-[22px] sm:text-[26px] font-semibold text-[var(--color-ink)] leading-none">
            {value ?? "—"}
          </div>
        </div>

        <div
          className="grid h-9 w-9 place-items-center rounded-xl shrink-0"
          style={{ backgroundColor: "color-mix(in oklab, currentColor 10%, transparent)" }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DailyCounts({
  inCount,
  outCount,
  damageCount,
  inspectionCount,
}: {
  inCount: number | null;
  outCount: number | null;
  damageCount: number | null;
  inspectionCount: number | null;
}) {
  return (
    // mobile/tablet: 2 per row; desktop: 4 per row
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Coming IN Today"
        value={inCount}
        tint="var(--color-green)"
        icon={<ArrowDownToLine className="h-4 w-4 text-[var(--color-green)]" />}
      />
      <Card
        label="Going OUT Today"
        value={outCount}
        tint="var(--color-blue)"
        icon={<ArrowUpFromLine className="h-4 w-4 text-[var(--color-blue)]" />}
      />
      <Card
        label="Inspections Today"
        value={inspectionCount}
        tint="var(--color-orange)"
        icon={<ClipboardCheck className="h-4 w-4 text-[var(--color-orange)]" />}
      />
      <Card
        label="Recent Damages"
        value={damageCount}
        tint="var(--color-red)"
        icon={<AlertTriangle className="h-4 w-4 text-[var(--color-red)]" />}
      />
    </div>
  );
}

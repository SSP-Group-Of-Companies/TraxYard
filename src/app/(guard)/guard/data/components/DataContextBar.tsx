"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

type Mode = "IN" | "OUT" | "INSPECTION" | string;

type Props = {
  mode: Mode;
  trailerNumber?: string | null;
  badge: "existing" | "new";
  owner?: string | null;
  lastStatus?: "IN" | "OUT" | string | null;
  lastYardName?: string | null;
  damaged?: boolean;
  onChangeTrailer?: () => void;
};

export default function DataContextBar({
  mode,
  trailerNumber,
  badge,
  owner,
  lastStatus,
  lastYardName,
  damaged,
  onChangeTrailer,
}: Props) {
  const modeLabel =
    mode === "IN" ? "Coming IN" : mode === "OUT" ? "Going OUT" : "Inspection";

  return (
    <div
      className="sticky z-30 top-[calc(var(--nav-height,56px)+env(safe-area-inset-top))]"
      aria-label="Work context"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 ring-1 ring-black/10 shadow-sm p-3 sm:p-4">
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
          {/* Left: Identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {trailerNumber || "—"}
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                  badge === "existing"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {badge === "existing" ? "Existing" : "New trailer"}
              </span>
            </div>
            {owner ? (
              <div className="text-xs text-gray-600 truncate">
                <span className="text-gray-500">Owner:</span>{" "}
                <span className="font-medium">{owner}</span>
              </div>
            ) : null}
          </div>

          {/* Middle: Movement + last status */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background:
                    mode === "IN"
                      ? "color-mix(in oklab,var(--color-green) 18%, transparent)"
                      : mode === "OUT"
                      ? "color-mix(in oklab,var(--color-blue) 18%, transparent)"
                      : "color-mix(in oklab,#6b7280 18%, transparent)",
                  color:
                    mode === "IN"
                      ? "var(--color-green)"
                      : mode === "OUT"
                      ? "var(--color-blue)"
                      : "#374151",
                }}
              >
                {modeLabel}
              </span>
              {lastStatus ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-gray-50 text-gray-700 border-gray-200">
                  Last: {lastStatus}
                  {lastYardName ? ` · ${lastYardName}` : ""}
                </span>
              ) : null}
              {damaged ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Damaged
                </span>
              ) : null}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
              {onChangeTrailer ? (
                <button
                  type="button"
                  onClick={onChangeTrailer}
                  className="text-xs text-[#0B63B6] hover:underline"
                >
                  Change trailer
                </button>
              ) : null}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}



"use client";

import * as React from "react";

export type SegmentOption<T extends string | number> = {
  label: string;
  value: T;
};

type Props<T extends string | number> = {
  value: T;
  onChange: (v: T) => void;
  options: readonly SegmentOption<T>[];
  className?: string;
};

export default function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  className = "",
}: Props<T>) {
  return (
    <div
      className={[
        "inline-flex w-full rounded-full border border-gray-200 overflow-hidden bg-white",
        className,
      ].join(" ")}
      role="tablist"
      aria-label="Segmented Control"
    >
      {options.map((opt, index) => {
        const active = opt.value === value && value !== "";
        const isLast = index === options.length - 1;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={[
              "flex-1 px-3 py-2 text-xs sm:text-sm transition-all duration-200 cursor-pointer relative",
              !isLast && "border-r border-gray-200",
              active
                ? "text-white font-medium"
                : "bg-white text-gray-700 hover:bg-[var(--color-red-hover)] hover:text-gray-900",
            ].join(" ")}
            style={active ? { background: "var(--weather-gradient)" } : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

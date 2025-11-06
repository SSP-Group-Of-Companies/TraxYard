"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronDown } from "lucide-react";
import { modalVariants, fadeInVariants } from "@/lib/animations";
import { EYardId } from "@/types/yard.types";
import { yards } from "@/data/yards";
import { useYardStore } from "@/store/useYardStore";

type Props = {
  variant?: "icon" | "full"; // icon = mobile; full = desktop
  className?: string;
};

export default function YardSwitcher({ variant = "full", className }: Props) {
  const { yardId, setYardId } = useYardStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = yards.find((y) => y.id === yardId);

  const base =
    "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm " +
    "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm " +
    "text-[var(--color-on-surface)] focus:outline-none focus-visible:ring-0";

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={base}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={variant === "icon" ? current?.name ?? yardId : undefined}
      >
        <MapPin className="h-4 w-4 shrink-0 text-[var(--color-blue)]" />
        {variant === "full" && (
          <span className="max-w-[11rem] truncate">
            {current?.name ?? yardId}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            className="absolute right-0 z-[60] mt-2 w-64 overflow-hidden rounded-2xl shadow-[var(--shadow-2)]"
            style={{
              backgroundColor: "white",
              border: "1px solid var(--color-outline)",
              boxShadow: "var(--shadow-2)",
            }}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
          {yards.map((y, index) => (
            <motion.button
              key={y.id}
              role="option"
              aria-selected={y.id === yardId}
              onClick={() => {
                setYardId(y.id as EYardId);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors rounded-md ${
                y.id === yardId ? "bg-[var(--color-green-hover)]" : "hover:bg-[var(--color-green-hover)] active:bg-[var(--color-green-hover)]"
              }`}
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{y.name}</span>
                <span className="ml-3 text-xs text-muted">{y.id}</span>
              </div>
            </motion.button>
          ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

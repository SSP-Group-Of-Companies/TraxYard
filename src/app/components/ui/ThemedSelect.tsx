"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  getLabel?: (v: string) => string;
  className?: string;
  placeholderLabel?: string; // shown when value === ''
  error?: boolean;
};

export default function ThemedSelect({ value, onChange, options, getLabel = (v) => v.replace(/_/g, " "), className = "", placeholderLabel = "-- Select --", error = false }: Props) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listId = React.useId();

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, options.findIndex((o) => o === value));
    setActiveIndex(idx);
  }, [open, options, value]);

  React.useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = document.getElementById(`${listId}-option-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, listId]);

  // Close dropdown if value changes externally (safety for edge cases)
  React.useEffect(() => {
    if (open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;
    switch (e.key) {
      case "ArrowDown":
        setActiveIndex((i) => (i + 1) % options.length);
        e.preventDefault();
        break;
      case "ArrowUp":
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        e.preventDefault();
        break;
      case "Enter":
        if (activeIndex >= 0 && activeIndex < options.length) {
          onChange(options[activeIndex]);
          setOpen(false);
        }
        e.preventDefault();
        break;
      case "Escape":
        setOpen(false);
        e.preventDefault();
        break;
    }
  }

  return (
    <div ref={wrapRef} className={["relative", className].join(" ")}> 
      <button
        type="button"
        className={["w-full rounded-md border pl-2 pr-8 py-1.5 text-sm bg-white text-left focus:ring-[var(--color-green)] focus:outline-none relative", error ? "border-red-300 ring-2 ring-red-200" : "border-gray-300"].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        {value === "" ? <span className="text-gray-500">{placeholderLabel}</span> : getLabel(value) || "Select"}
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
      </button>
      {open && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white p-1 shadow-[var(--shadow-2)] ring-1 ring-black/10">
          {options.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              id={`${listId}-option-${i}`}
              className={[
                "cursor-pointer rounded-md px-3 py-2 text-sm",
                i === activeIndex ? "bg-[var(--color-green-hover)]" : "hover:bg-[var(--color-green-hover)]",
              ].join(" ")}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                // Prevent focus from jumping back to the button and select immediately
                e.preventDefault();
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt === "" ? placeholderLabel : getLabel(opt)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



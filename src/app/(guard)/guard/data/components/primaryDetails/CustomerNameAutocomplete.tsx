"use client";

import * as React from "react";
import { useId, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useCustomerNames } from "@/app/(guard)/guard/data/hooks/useCustomerNames";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minChars?: number;
  debounceMs?: number;
  maxSuggestions?: number;
  className?: string;
};

export default function CustomerNameAutocomplete<T extends FieldValues>({
  control,
  name,
  label = "Customer name",
  placeholder = "Start typing…",
  disabled,
  required,
  minChars = 2,
  debounceMs = 300,
  maxSuggestions = 10,
  className = "",
}: Props<T>) {
  const { field, fieldState } = useController<T, Path<T>>({ control, name });

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const listId = useId(); // for listbox id
  const inputId = useId(); // for input id
  const liveId = useId(); // for aria-live status

  const { query, setQuery, names, loading, empty } = useCustomerNames({
    minChars,
    debounceMs,
    limit: maxSuggestions,
  });

  // Sync hook query with initial field value once
  useEffect(() => {
    const cur = (field.value ?? "") as string;
    if (cur && cur !== query) setQuery(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (
        open &&
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Reset activeIndex when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [names]);

  // Keep highlighted option visible
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = document.getElementById(`${listId}-option-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, listId]);

  const canOpen = (val: string) => val.trim().length >= minChars;

  const openMenu = () => {
    if (!disabled && canOpen((field.value ?? "") as string)) setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasOptions = names.length > 0;

    switch (e.key) {
      case "ArrowDown": {
        if (!open) {
          e.preventDefault();
          openMenu();
          if (names.length > 0) setActiveIndex(0);
          return;
        }
        if (hasOptions) {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % names.length);
        }
        return;
      }
      case "ArrowUp": {
        if (!open) return;
        if (hasOptions) {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + names.length) % names.length);
        }
        return;
      }
      case "Enter": {
        if (!open) {
          // commit free text
          return;
        }
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < names.length) {
          field.onChange(names[activeIndex]);
        }
        closeMenu();
        return;
      }
      case "Escape": {
        if (open) {
          e.preventDefault();
          closeMenu();
        }
        return;
      }
      case "Tab": {
        // close on tab navigation
        closeMenu();
        return;
      }
      case "Home": {
        if (open && hasOptions) {
          e.preventDefault();
          setActiveIndex(0);
        }
        return;
      }
      case "End": {
        if (open && hasOptions) {
          e.preventDefault();
          setActiveIndex(names.length - 1);
        }
        return;
      }
    }
  };

  const onChange = (val: string) => {
    field.onChange(val);
    setQuery(val);
    if (!open && canOpen(val)) {
      setOpen(true);
    }
    if (open && !canOpen(val)) {
      closeMenu();
    }
    // reset highlight whenever the user types
    setActiveIndex(-1);
  };

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-800"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div ref={wrapRef} className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox" // ARIA: combobox role on the input (fixes eslint warning)
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-activedescendant={
            open && activeIndex >= 0
              ? `${listId}-option-${activeIndex}`
              : undefined
          }
          aria-expanded={open}
          aria-busy={loading || undefined}
          aria-describedby={liveId}
          value={(field.value ?? "") as string}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (canOpen((field.value ?? "") as string)) setOpen(true);
          }}
          className="w-full rounded-md shadow-sm px-3 py-2 text-sm outline-none focus:ring-[var(--color-green)] focus:outline-none focus:shadow-md bg-white placeholder:text-gray-400"
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="sentences"
          disabled={disabled}
          data-field={String(name)}
        />

        <div className="absolute right-3 top-2.5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : null}
        </div>

        {/* Live region for SR users */}
        <p id={liveId} className="sr-only" aria-live="polite">
          {loading
            ? "Loading suggestions…"
            : open
            ? names.length > 0
              ? `${names.length} suggestion${
                  names.length > 1 ? "s" : ""
                } available. Use up and down arrows to navigate.`
              : "No suggestions. Press Enter to use the current text."
            : ""}
        </p>

        {/* Listbox */}
        <AnimatePresence>
          {open && (names.length > 0 || (!loading && !empty)) && (
            <motion.ul
            id={listId}
            ref={listRef}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white p-1 shadow-[var(--shadow-2)]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {names.length > 0 ? (
              names.map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  id={`${listId}-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors text-gray-900 ${
                    i === activeIndex
                      ? "bg-[var(--color-green-hover)]"
                      : "hover:bg-[var(--color-green-hover)]"
                  }`}
                  // prevent input blur so click selects properly
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    field.onChange(n);
                    closeMenu();
                  }}
                >
                  {n}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-xs text-gray-600">
                Press <span className="font-medium">Enter</span> to use “
                {(field.value ?? "") as string}”
              </li>
            )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {fieldState.error?.message && (
        <p className="mt-1 text-xs text-red-600">
          {String(fieldState.error.message)}
        </p>
      )}
    </div>
  );
}

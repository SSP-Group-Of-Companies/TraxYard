"use client";

import * as React from "react";
import { TIRE_BRAND_NAMES } from "@/data/tireBrandNames";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minChars?: number; // default 1
  maxSuggestions?: number; // default 10
  ariaInvalid?: boolean;
  dataField?: string;
};

export default function BrandAutocomplete({
  value,
  onChange,
  placeholder = "Start typing…",
  className = "",
  minChars = 1,
  maxSuggestions = 10,
  ariaInvalid,
  dataField,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = React.useState<string>(value || "");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listId = React.useId();
  const listRef = React.useRef<HTMLUListElement | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < minChars) return [] as string[];
    return TIRE_BRAND_NAMES.filter((b) => b.toLowerCase().startsWith(q)).slice(0, maxSuggestions);
  }, [query, minChars, maxSuggestions]);

  React.useEffect(() => setQuery(value || ""), [value]);
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Reset active index whenever menu opens or results change
  React.useEffect(() => {
    if (open && filtered.length > 0) setActiveIndex(0);
    else setActiveIndex(-1);
  }, [open, filtered.length]);

  // Keep the highlighted option visible while navigating with keyboard
  React.useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = document.getElementById(`${listId}-option-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, listId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const hasOptions = filtered.length > 0;
    switch (e.key) {
      case "ArrowDown":
        if (!open) { setOpen(true); if (hasOptions) setActiveIndex(0); e.preventDefault(); return; }
        if (hasOptions) { setActiveIndex((i) => (i + 1) % filtered.length); e.preventDefault(); }
        return;
      case "ArrowUp":
        if (!open || !hasOptions) return;
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        e.preventDefault();
        return;
      case "Enter":
        if (open && activeIndex >= 0 && activeIndex < filtered.length) {
          onChange(filtered[activeIndex]);
          setQuery(filtered[activeIndex]);
          setOpen(false);
          e.preventDefault();
        }
        return;
      case "Escape":
        if (open) { setOpen(false); e.preventDefault(); }
        return;
      case "Tab":
        setOpen(false);
        return;
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`} aria-invalid={ariaInvalid || undefined} data-field={dataField}>
      <input
        type="text"
        placeholder={placeholder}
        className={["w-full rounded-md shadow-sm px-3 py-2 text-sm outline-none focus:ring-[var(--color-green)] focus:outline-none focus:shadow-md bg-white border border-gray-200", ariaInvalid ? "ring-2 ring-red-300 border-red-300" : ""].join(" ")}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          onChange(v);
          if (!open && v.length >= minChars) setOpen(true);
          if (open && v.length < minChars) setOpen(false);
        }}
        onFocus={() => { if ((value || "").length >= minChars) setOpen(true); }}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCapitalize="words"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
      />
      {open && (
        <ul
          id={listId}
          ref={listRef}
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white p-1 shadow-[var(--shadow-2)]"
          role="listbox"
        >
          {filtered.length > 0 ? (
            filtered.map((n, i) => (
              <li
                key={n}
                role="option"
                aria-selected={i === activeIndex}
                id={`${listId}-option-${i}`}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === activeIndex ? "bg-[var(--color-green-hover)]" : "hover:bg-[var(--color-green-hover)]"}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => { onChange(n); setQuery(n); setOpen(false); }}
              >
                {n}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-gray-600">No suggestions</li>
          )}
        </ul>
      )}
    </div>
  );
}



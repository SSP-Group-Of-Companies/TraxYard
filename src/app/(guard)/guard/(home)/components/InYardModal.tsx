"use client";

/**
 * InYardModal - prod-ready with live polling while open
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { useYardStore } from "@/store/useYardStore";
import { yards } from "@/data/yards";
import { useInYardTrailers } from "../hooks/useInYardTrailers";
import Pager from "@/components/ui/Pager";
import { modalAnimations } from "@/lib/animations";

/**
 * Helper function to find all focusable elements within a container
 * @param root - The root element to search within
 * @returns Array of focusable elements
 */
function getFocusables(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden")
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function InYardModal({ open, onClose }: Props) {
  const { yardId } = useYardStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const { rows, meta, loading, error, page, setPage, setQuery } = useInYardTrailers(
    yardId,
    {
      pageSize: 20,
      enabled: open,
    }
  );

  // keep latest meta in a ref without re-wiring listeners
  const metaRef = useRef<typeof meta | null>(null);
  useEffect(() => { metaRef.current = meta; }, [meta]);

  useEffect(() => {
    if (!open) return;
    lastFocusedElement.current = document.activeElement as HTMLElement;

    setTimeout(() => inputRef.current?.focus(), 0);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Arrow navigation with latest meta via ref
      const m = metaRef.current as typeof meta | null;
      if (!m) return;
      if (e.key === "ArrowRight" && m.hasNext) setPage(m.page + 1);
      else if (e.key === "ArrowLeft" && m.hasPrev) setPage(m.page - 1);
    };

    // Focus trap for Tab cycling (stable)
    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const nodes = getFocusables(dialogRef.current);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (active === last || !dialogRef.current.contains(active)) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleTrap);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleTrap);
      document.body.style.overflow = prevOverflow;
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
        lastFocusedElement.current = null;
      }
    };
  }, [open, onClose, setPage]);

  const yardName = yards.find((y) => y.id === yardId)?.name ?? yardId;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-2 sm:p-4 overscroll-contain"
          style={{
            paddingTop: "calc(var(--nav-height,56px) + env(safe-area-inset-top) + 8px)",
          }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="inyard-title"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={modalAnimations.backdrop}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={dialogRef}
            role="document"
            className="relative w-full max-w-[900px] rounded-2xl bg-white ring-1 ring-black/10 shadow-xl
                      max-h-[85vh] overflow-hidden flex flex-col"
            style={{ maxHeight: "85dvh" }}
            variants={modalAnimations.content}
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-black/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="inyard-title" className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    All Trailers Currently IN Yard
                  </h2>
                  <div className="mt-0.5 text-xs text-gray-500 truncate" aria-label="Yard name">
                    {yardName}
                  </div>
                </div>
                <button
                  aria-label="Close modal"
                  className="p-2 rounded-md hover:bg-black/5 active:scale-95 transition-colors shrink-0"
                  onClick={onClose}
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-3 sm:p-6 overflow-y-auto">
              {/* Controls */}
              <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="shrink-0 flex justify-end">
                  <Pager
                    page={page}
                    totalPages={meta?.totalPages ?? 1}
                    onPage={(p) => setPage(p)}
                    disabled={loading}
                    showCount
                    total={meta?.total ?? rows.length}
                    pageSize={meta?.pageSize ?? 20}
                    countVariant="muted"
                  />
                </div>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search trailer # or truck #"
                    className="w-full rounded-xl border border-gray-200 px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B63B6]/30 focus:border-[#0B63B6] placeholder:text-gray-400"
                    aria-label="Search trailers in yard by trailer or truck number"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl ring-1 ring-black/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trailer #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Load
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date &amp; Time (Entry)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200" aria-busy={loading ? "true" : "false"}>
                      {loading && (
                        <tr>
                          <td
                            className="px-3 py-4 text-center text-gray-500"
                            colSpan={4}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0B63B6]"></div>
                              Loading trailers...
                            </div>
                          </td>
                        </tr>
                      )}

                      {error && !loading && (
                        <tr>
                          <td
                            className="px-3 py-4 text-center text-red-600"
                            colSpan={4}
                          >
                            {typeof (error as any)?.message === "string"
                              ? (error as any).message
                              : "Failed to load trailers."}
                          </td>
                        </tr>
                      )}

                      {!loading &&
                        Array.isArray(rows) &&
                        rows.length === 0 &&
                        !error && (
                          <tr>
                            <td
                              className="px-3 py-4 text-center text-gray-500"
                              colSpan={4}
                            >
                              No trailers found in this yard.
                            </td>
                          </tr>
                        )}

                      {Array.isArray(rows) &&
                        rows.map((trailer, idx) => {
                          const seq =
                            ((meta?.page ?? 1) - 1) * (meta?.pageSize ?? 20) +
                            idx +
                            1;
                          return (
                            <tr
                              key={trailer.id || trailer.trailerNumber}
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-3 text-gray-700 tabular-nums">
                                {seq}
                              </td>
                              <td className="px-3 py-3 font-medium text-gray-900">
                                {trailer.trailerNumber}
                              </td>
                              <td className="px-3 py-3 text-gray-700">
                                {trailer.loadState ?? "-"}
                              </td>
                              <td className="px-3 py-3 text-gray-700">
                                {trailer.lastMoveIo?.ts
                                  ? trailer.lastMoveIo.ts.toLocaleString(
                                      undefined,
                                      {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      }
                                    )
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import SegmentedControl from "@/app/components/ui/SegmentedControl";
import { AnimatePresence, motion } from "framer-motion";
import { modalAnimations } from "@/lib/animations";
import Image from "next/image";

export default function PreviousDamageModal({ open, rows, onClose, onConfirmYes, onConfirmNo }: { open: boolean; rows: Array<{ location: string; type: string; comment?: string | null; photoUrl?: string | null; }>; onClose: () => void; onConfirmYes: (selected: number[]) => void; onConfirmNo: () => void; }) {
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [answer, setAnswer] = useState<"YES" | "NO" | null>(null);

  if (!open) return null;

  const indices = Object.entries(selected).filter(([,v])=>v).map(([k])=> Number(k));

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[95] grid place-items-center" role="dialog" aria-modal="true" initial="initial" animate="animate" exit="exit">
        <motion.button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" variants={modalAnimations.backdrop as any} />
        <motion.div className="relative w-[min(880px,95vw)] bg-white rounded-2xl shadow-xl ring-1 ring-black/10 p-4 sm:p-6" variants={modalAnimations.content as any}>
          <button aria-label="Close" className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white shadow ring-1 ring-black/10 hover:shadow-md" onClick={onClose}>×</button>
          <div className="text-center mb-4">
            <div className="text-base font-semibold">Previous Damages</div>
            <p className="text-sm text-gray-700">This trailer had a previous damage report. Select any damages that still exist. Click a photo to view it in a new tab, then press Continue.</p>
          </div>
          <div className="max-w-xs mx-auto mb-4">
            <SegmentedControl value={answer ?? "" as any} onChange={(v)=> setAnswer(v as any)} options={[{ label: "Yes", value: "YES" }, { label: "No", value: "NO" }]} />
          </div>
          <div className="rounded-lg ring-1 ring-black/10 overflow-hidden">
            <div className="grid [grid-template-columns:minmax(9rem,1fr)_minmax(8rem,1fr)_1fr_minmax(6rem,auto)_4rem] bg-gray-50 text-xs font-medium text-gray-600">
              <div className="px-3 py-2">Location</div>
              <div className="px-3 py-2">Type</div>
              <div className="px-3 py-2">Comments</div>
              <div className="px-3 py-2">Photo</div>
              <div className="px-3 py-2 text-right">Present</div>
            </div>
            <div>
              {rows.map((r, idx) => (
                <div key={idx} className="grid [grid-template-columns:minmax(9rem,1fr)_minmax(8rem,1fr)_1fr_minmax(6rem,auto)_4rem] items-center border-t text-sm">
                  <div className="px-3 py-2 break-words min-w-0">{r.location}</div>
                  <div className="px-3 py-2 break-words min-w-0">{r.type}</div>
                  <div className="px-3 py-2 break-words min-w-0">{r.comment || "—"}</div>
                  <div className="px-3 py-2">
                    {r.photoUrl ? (
                      <a href={r.photoUrl} target="_blank" rel="noreferrer" title="Open photo in new tab" className="inline-block align-top">
                        <span className="relative block w-16 h-12 rounded-md border-2 border-dashed bg-white">
                          <span className="absolute inset-0.5">
                            <Image src={r.photoUrl} alt="Previous damage" fill sizes="64px" unoptimized className="object-contain" />
                          </span>
                        </span>
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  <div className="px-3 py-2 text-right"><input type="checkbox" className="accent-[var(--color-green)]" checked={!!selected[idx]} onChange={(e)=> setSelected({ ...selected, [idx]: e.target.checked })} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="button-solid px-3 py-2 disabled:opacity-50" disabled={!answer} onClick={()=>{ if (answer === "YES") onConfirmYes(indices); else onConfirmNo(); }}>Continue</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



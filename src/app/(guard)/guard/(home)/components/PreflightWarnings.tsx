"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { modalAnimations } from "@/lib/animations";

type Props = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  showInspection: boolean;
  showDamaged: boolean;
  title?: string;
  customInspectionText?: string;
  continueText?: string;
  hideCancel?: boolean;
};

export default function PreflightWarnings({
  open, onClose, onContinue, showInspection, showDamaged, title = "Heads up", customInspectionText, continueText = "Continue", hideCancel
}: Props) {
  const hasAny = showInspection || showDamaged;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="initial" animate="animate" exit="exit" variants={modalAnimations.backdrop}
          role="dialog" aria-modal="true" aria-labelledby="warn-title"
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true"
          />
          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-white ring-1 ring-black/10 shadow-xl p-6"
            variants={modalAnimations.content}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="warn-title" className="text-lg font-semibold">{title}</h3>
              <button className="p-2 rounded-md hover:bg-black/5" onClick={onClose} aria-label="Close">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {hasAny ? (
              <div className="space-y-2 text-sm">
                {showInspection && (
                  <p className="flex items-start gap-2 text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    {customInspectionText || "This trailer’s safety inspection appears to be expired."}
                  </p>
                )}
                {showDamaged && (
                  <p className="flex items-start gap-2 text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    This trailer has a reported damage on record.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-700">No warnings. You can proceed.</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              {!hideCancel && (<button className="button-base" onClick={onClose}>Cancel</button>)}
              <button className="button-base button-solid" style={{ background: "var(--color-blue)" }} onClick={onContinue}>
                {continueText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

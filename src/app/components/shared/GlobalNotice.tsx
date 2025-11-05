"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { modalAnimations } from "@/lib/animations";
import { useAppNotice } from "@/store/useAppNotice";

export default function GlobalNotice() {
  const { current, hide } = useAppNotice();

  const iconByKind = {
    error: <AlertTriangle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    info: <Info className="h-5 w-5 text-sky-600" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  } as const;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          className="fixed inset-0 z-[95] grid place-items-center"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={modalAnimations.backdrop}
        >
          <motion.button
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={hide}
          />
          <motion.div
            className="relative w-[min(560px,92vw)] rounded-2xl bg-white shadow-xl ring-1 ring-black/10 p-5"
            variants={modalAnimations.content}
          >
            <button
              aria-label="Close"
              className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white shadow ring-1 ring-black/10 hover:shadow-md"
              onClick={hide}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="mt-1">{iconByKind[current.kind]}</div>
              <div className="flex-1">
                {current.title && (
                  <h3 className="text-base font-semibold text-gray-900">
                    {current.title}
                  </h3>
                )}
                <p className="text-sm text-gray-700 whitespace-pre-line">{current.message}</p>
                {current.detail && (
                  <p className="mt-2 text-xs text-gray-500 whitespace-pre-line">
                    {current.detail}
                  </p>
                )}
              </div>
            </div>
            {current.onAction && current.actionLabel && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="button-base"
                  onClick={() => {
                    try { current.onAction?.(); } finally { hide(); }
                  }}
                >
                  {current.actionLabel}
                </button>
                <button className="button-base button-ghost" onClick={hide}>Close</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



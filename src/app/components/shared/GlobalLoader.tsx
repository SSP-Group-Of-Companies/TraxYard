"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useGlobalLoading } from "@/store/useGlobalLoading";

export default function GlobalLoader() {
  const { visible, message } = useGlobalLoading();

  // Colors tuned for TraxYard guard theme
  const backgroundColor = "rgba(255,255,255,0.7)";
  const textColor = "#6b7280"; // gray-500
  const primaryColor = "#005BAA"; // blue
  const secondaryColor = "#00B36B"; // green

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor }}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28">
              {/* Background glow */}
              <motion.div
                className="absolute inset-0 rounded-full blur-xl"
                style={{
                  background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                  opacity: 0.25,
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Breathing container */}
              <motion.div
                className="relative w-full h-full"
                animate={{ scale: [0.96, 1.04, 0.96], rotate: [-1, 1, -1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Base icon muted */}
                <Image
                  src="/logos/Favicon.png"
                  alt="Loading"
                  fill
                  className="object-contain opacity-30 saturate-50"
                  priority
                />
                {/* Color reveal overlay */}
                <div className="absolute inset-0 origin-center animate-star-reveal-radial">
                  <Image
                    src="/logos/Favicon.png"
                    alt="Loading"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </motion.div>

              {/* Subtle floating particles */}
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    backgroundColor: secondaryColor,
                    opacity: 0.4,
                    width: 3 + ((i % 2) * 2),
                    height: 3 + ((i % 2) * 2),
                    left: `${20 + ((i * 15) % 60)}%`,
                    top: `${15 + ((i * 20) % 70)}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, delay: i * 0.3, ease: "easeInOut" }}
                />
              ))}
            </div>

            {message && (
              <p className="text-sm animate-pulse" style={{ color: textColor }}>
                {message}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



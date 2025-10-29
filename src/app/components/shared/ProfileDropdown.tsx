"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { modalVariants } from "@/lib/animations";
import { NEXT_PUBLIC_PORTAL_BASE_URL } from "@/config/env";
import ProfileAvatar from "./ProfileAvatar";
import { useSession } from "next-auth/react";

type ProfileDropdownProps = {
  /** Where this menu is used. "dashboard" uses base URL, "guard" forces relative logout */
  context: "dashboard" | "guard";
  className?: string;
};

export default function ProfileDropdown({ context, className }: ProfileDropdownProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Build logout URL
  const base = NEXT_PUBLIC_PORTAL_BASE_URL || "";
  const isDashboard = context === "dashboard";
  const logoutHref = isDashboard ? (base ? new URL("/api/auth/logout", base).toString() : "/api/auth/logout") : "/api/auth/logout"; // guard: always relative

  const userName = user?.name || "User";
  if (!user) return null;

  return (
    <div className={`ml-auto flex items-center gap-2 relative ${className ?? ""}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-lg px-2 py-1 transition-colors hover:bg-[var(--color-sidebar-hover)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ProfileAvatar user={user} size={32} />
        <span className="hidden sm:inline text-xs sm:text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>
          {userName}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: "var(--color-on-surface-variant)" }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-12 mt-1 w-48 rounded-xl shadow-lg py-2 z-[60]"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--color-outline)",
              boxShadow: "var(--shadow-2), 0 0 0 1px rgba(255, 255, 255, 0.8)",
            }}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="menu"
          >
          <div className="px-4 py-2 border-b" style={{ borderBottomColor: "var(--color-outline)" }}>
            <div className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>
              {userName}
            </div>
            <div className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
              {user.email}
            </div>
          </div>

          <a
            href={logoutHref}
            className="block w-full px-4 py-3 text-sm transition-colors cursor-pointer active:scale-95 hover:bg-gray-100 active:bg-gray-200"
            style={{ color: "var(--color-on-surface)" }}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Logout
          </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

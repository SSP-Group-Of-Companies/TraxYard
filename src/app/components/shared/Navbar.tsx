"use client";

/**
 * @fileoverview Navbar (Guard/Dashboard)
 * - Left: logo linking to the section home (guard or dashboard)
 * - Right: yard switcher and profile dropdown
 * - Accessible, responsive, blur + elevation per design tokens
 */

import Link from "next/link";
import Image from "next/image";
import ProfileDropdown from "./ProfileDropdown";
import YardSwitcher from "./YardSwitcher";

type Props = { variant: "guard" | "dashboard"; className?: string };

export default function Navbar({ variant, className }: Props) {
  return (
    <header
      role="banner"
      className={[
        "fixed inset-x-0 top-0 z-50",
        "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center px-3 sm:px-4">
        {/* LEFT: Logo */}
        <Link
          href={variant === "guard" ? "/guard" : "/dashboard"}
          aria-label="TraxYard home"
          className="inline-flex items-center"
        >
          <Image
            src="/logos/SSP-Truck-LineFullLogo.png"
            alt="navbar image"
            width={0}
            height={0}
            sizes="100vw"
            className="w-[80px] sm:w-[100px] md:w-[120px] h-auto object-contain"
            priority
          />
        </Link>

        {/* RIGHT: controls */}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {/* icon-only on md-; full on lg+ */}
          <div className="md:hidden">
            <YardSwitcher variant="icon" />
          </div>
          <div className="hidden md:block lg:hidden">
            <YardSwitcher variant="icon" />
          </div>
          <div className="hidden lg:block">
            <YardSwitcher variant="full" />
          </div>

          <ProfileDropdown
            context={variant === "guard" ? "guard" : "dashboard"}
          />
        </div>
      </div>
    </header>
  );
}

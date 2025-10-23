// src/app/(guard)/guard/layout.tsx
import type { ReactNode } from "react";
import Navbar from "@/app/components/shared/Navbar";
import Footer from "@/app/components/shared/Footer";

export default function GuardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col guard-watermark">
      <Navbar variant="guard" />
      <main className="guard-content flex-1 pt-16 sm:pt-16">{children}</main>
      <Footer />
    </div>
  );
}

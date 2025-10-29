"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useGuardFlowStore } from "@/store/useGuardFlowStore";

export default function GuardDataPage() {
  const qp = useSearchParams();
  const mode = (qp.get("mode") as "IN" | "OUT" | "INSPECTION" | null) ?? null;
  const trailer = qp.get("trailer");
  const isNew = qp.get("new") === "1";
  const { selection } = useGuardFlowStore();

  useEffect(() => {
    // (Optional) soft assert we have selection for richer UX
    // If not, we still can render by reading query params alone.
    // console.debug("Guard selection:", selection);
  }, [selection]);

  return (
    <section className="container-guard py-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode ? `Movement: ${mode}` : "Movement"}
          </h1>
          <p className="text-sm text-muted">
            {isNew ? "New trailer" : trailer ? `Trailer: ${trailer}` : "No trailer selected"}
            {selection?.flags?.inspectionExpired && " · Safety inspection expired"}
            {selection?.flags?.damaged && " · Reported damage"}
          </p>
        </div>
        {/* TODO: Save/Submit buttons will live here */}
      </header>

      {/* ===== Section 1: Primary details (scaffold) ===== */}
      <div className="rounded-2xl ring-1 ring-black/10 p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">Primary details</h2>
        {/* TODO: Carrier Info, Trip Info, Load, Bound, Documents uploader, etc. */}
        <p className="text-sm text-gray-600">
          Build out the Primary section here (Carrier Info, Trip Info, Load/Bound, Documents) per spec.
        </p>
      </div>

      {/* TODO: Sections: Photo Angles, Tires, Damages… */}
    </section>
  );
}

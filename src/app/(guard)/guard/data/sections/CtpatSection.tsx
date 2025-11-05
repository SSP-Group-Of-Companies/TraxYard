"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { TMovementForm } from "@/types/frontend/form/movement.form";
// Schema is used upstream in page-level submit; local ring uses RHF errors
import { ECtpatItem, CTPAT_LABELS } from "@/types/movement.types";

export default function CtpatSection({ onSubmit, submitting }: { onSubmit?: () => void; submitting?: boolean; }) {
  const { control, setValue, formState: { errors } } = useFormContext<TMovementForm>();
  const ctpat = useWatch({ control, name: "ctpat" }) as TMovementForm["ctpat"] | undefined;

  // Keep computed value if you want to show completion state somewhere in UI
  useMemo(() => ctpat, [ctpat]);

  return (
    <section id="ctpat-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-white/80 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center mb-2">
          <h2 className="text-lg font-semibold text-center">C‑TPAT Inspection</h2>
        </div>
        <p className="text-sm text-gray-600 text-center mb-4">Confirm each C‑TPAT checklist item. All must be checked to submit.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(ECtpatItem).map((key) => (
            <label key={key as string} className={`flex items-center gap-2 rounded-md ring-1 px-3 py-2 bg-white ${(errors as any)?.ctpat?.[key] ? "ring-red-300" : "ring-black/10"}`}>
              <input type="checkbox" className="accent-[var(--color-green)]" checked={Boolean((ctpat as any)?.[key])} onChange={(e)=> setValue(`ctpat.${key}` as any, e.target.checked, { shouldDirty: true, shouldValidate: true })} />
              <span className="text-sm">{CTPAT_LABELS[key as keyof typeof CTPAT_LABELS] ?? key}</span>
            </label>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => onSubmit?.()}
            disabled={!!submitting}
            className={`px-6 py-3 rounded-full bg-[var(--color-primary-action)] text-gray-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-green)] focus:ring-offset-2 ${submitting ? "opacity-60 cursor-wait" : "hover:shadow-md hover:bg-[var(--color-primary-action-hover)]"}`}
          >
            {submitting ? "Submitting…" : "Submit Movement"}
          </button>
        </div>
      </div>
    </section>
  );
}



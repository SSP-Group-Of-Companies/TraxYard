"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { TMovementForm } from "@/types/frontend/form/movement.form";
import { CtpatSchema } from "@/types/schemas/ctpat.schema";
import { ECtpatItem, CTPAT_LABELS } from "@/types/movement.types";

export default function CtpatSection({ onNext }: { onNext?: () => void; }) {
  const { control, setValue } = useFormContext<TMovementForm>();
  const ctpat = useWatch({ control, name: "ctpat" }) as TMovementForm["ctpat"] | undefined;

  const allChecked = useMemo(() => {
    const obj = ctpat || {} as Record<string, boolean>;
    return Object.values(ECtpatItem).every((k) => (obj as any)[k] === true);
  }, [ctpat]);

  return (
    <section id="ctpat-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-white/80 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center mb-2">
          <h2 className="text-lg font-semibold text-center">C‑TPAT Inspection</h2>
        </div>
        <p className="text-sm text-gray-600 text-center mb-4">Confirm each C‑TPAT checklist item before continuing.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(ECtpatItem).map((key) => (
            <label key={key as string} className="flex items-center gap-2 rounded-md ring-1 ring-black/10 px-3 py-2 bg-white">
              <input type="checkbox" className="accent-[var(--color-green)]" checked={Boolean((ctpat as any)?.[key])} onChange={(e)=> setValue(`ctpat.${key}` as any, e.target.checked, { shouldDirty: true, shouldValidate: true })} />
              <span className="text-sm">{CTPAT_LABELS[key as keyof typeof CTPAT_LABELS] ?? key}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 lg:mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const ok = CtpatSchema.safeParse(ctpat || {} as any).success && allChecked;
              if (ok) onNext?.();
            }}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-md hover:shadow-lg transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--color-green)] focus:ring-offset-2 ${allChecked ? "hover:scale-[1.03] active:scale-[.98]" : "opacity-50 cursor-not-allowed"}`}
            aria-label="Continue to next section"
            title="Continue"
            disabled={!allChecked}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m0 0 5-5m-5 5-5-5"/></svg>
          </button>
        </div>
      </div>
    </section>
  );
}



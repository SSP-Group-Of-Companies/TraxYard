"use client";

import { useForm } from "react-hook-form";
import { zodRHFResolver } from "@/lib/validation/zodRHFResolver";
import { NewTrailerSchema, type TNewTrailer } from "@/types/schemas/newTrailer.schema";
import { modalAnimations } from "@/lib/animations";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ETrailerType } from "@/types/Trailer.types";
import { scrollToFirstInvalid } from "@/lib/utils/scrollToError";
import TextField from "@/app/components/ui/TextField";
import DateField from "@/app/components/ui/DateField";
import ThemedSelect from "@/app/components/ui/ThemedSelect";
import { apiFetch } from "@/lib/api/apiFetch";
import { extractTrailersAndMeta } from "@/lib/api/normalize";

type Props = {
  open: boolean;
  onClose: () => void;
  onContinue: (t: TNewTrailer) => void;
  presetTrailerNumber?: string;
};

export default function NewTrailerModal({ open, onClose, onContinue, presetTrailerNumber }: Props) {
  const methods = useForm<TNewTrailer>({
    resolver: zodRHFResolver(NewTrailerSchema) as any,
    defaultValues: {
      trailerNumber: presetTrailerNumber || "",
      owner: "",
      make: "",
      model: "",
      year: "" as any,
      vin: "",
      licensePlate: "",
      stateOrProvince: "",
      trailerType: "" as any,
      safetyInspectionExpiryDate: "",
      comments: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { control, register, handleSubmit, formState: { errors }, setError } = methods;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[95] grid place-items-center pt-[calc(var(--nav-height,56px)+env(safe-area-inset-top)+8px)] pb-6 overflow-y-auto" initial="initial" animate="animate" exit="exit" variants={modalAnimations.backdrop}>
          <motion.button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
          <motion.div id="new-trailer-modal" className="relative w-[min(760px,95vw)] bg-white rounded-2xl shadow-xl ring-1 ring-black/10 p-5" variants={modalAnimations.content}>
            <button aria-label="Close" className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white shadow ring-1 ring-black/10 hover:shadow-md" onClick={onClose}><X className="h-4 w-4" /></button>
            <h3 className="text-lg font-semibold text-center mb-3">New Trailer</h3>
            <form
              noValidate
              onSubmit={handleSubmit(async (v) => {
                // Duplicate checks: trailerNumber, licensePlate+state, VIN (optional)
                const normalizeAlphaNum = (s: string) => (s || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                const upperTrim = (s: string) => (s || "").trim().toUpperCase();

                // 1) Trailer number uniqueness (guard search)
                try {
                  const json = await apiFetch<any>(`/api/v1/guard/trailers?q=${encodeURIComponent(v.trailerNumber)}&limit=5`);
                  const { items } = extractTrailersAndMeta(json);
                  const exists = (items ?? []).some((it: any) => normalizeAlphaNum(it.trailerNumber ?? "") === normalizeAlphaNum(v.trailerNumber));
                  if (exists) {
                    setError("trailerNumber" as any, { type: "duplicate", message: "This trailer number already exists. Close this form and search for it." });
                    const container = document.getElementById("new-trailer-modal");
                    scrollToFirstInvalid(container as HTMLElement);
                    return;
                  }
                } catch {
                  setError("trailerNumber" as any, { type: "validate", message: "Could not verify uniqueness. Check connection and try again." });
                  const container = document.getElementById("new-trailer-modal");
                  scrollToFirstInvalid(container as HTMLElement);
                  return;
                }

                // 2) License plate + jurisdiction combination (admin search supports licensePlate)
                try {
                  const lp = v.licensePlate || "";
                  const sp = v.stateOrProvince || "";
                  if (lp && sp) {
                    const json2 = await apiFetch<any>(`/api/v1/admin/trailers?q=${encodeURIComponent(lp)}&limit=10`);
                    const { items: adminItems } = extractTrailersAndMeta(json2);
                    const existsLpCombo = (adminItems ?? []).some((it: any) => upperTrim(it.licensePlate) === upperTrim(lp) && upperTrim(it.stateOrProvince) === upperTrim(sp));
                    if (existsLpCombo) {
                      setError("licensePlate" as any, { type: "duplicate", message: "A trailer with the same license plate and jurisdiction already exists." });
                      setError("stateOrProvince" as any, { type: "duplicate", message: "Select a different jurisdiction or verify the existing trailer." });
                      const container = document.getElementById("new-trailer-modal");
                      scrollToFirstInvalid(container as HTMLElement);
                      return;
                    }
                  }
                } catch {
                  setError("licensePlate" as any, { type: "validate", message: "Could not verify plate uniqueness. Check connection and try again." });
                  const container = document.getElementById("new-trailer-modal");
                  scrollToFirstInvalid(container as HTMLElement);
                  return;
                }

                // 3) VIN uniqueness (optional)
                try {
                  const vinNorm = (v.vin || "").trim();
                  if (vinNorm) {
                    const json3 = await apiFetch<any>(`/api/v1/admin/trailers?q=${encodeURIComponent(vinNorm)}&limit=5`);
                    const { items: adminVin } = extractTrailersAndMeta(json3);
                    const existsVin = (adminVin ?? []).some((it: any) => normalizeAlphaNum(it.vin ?? "") === normalizeAlphaNum(vinNorm));
                    if (existsVin) {
                      setError("vin" as any, { type: "duplicate", message: "A trailer with this VIN already exists." });
                      const container = document.getElementById("new-trailer-modal");
                      scrollToFirstInvalid(container as HTMLElement);
                      return;
                    }
                  }
                } catch {
                  setError("vin" as any, { type: "validate", message: "Could not verify VIN uniqueness. Check connection and try again." });
                  const container = document.getElementById("new-trailer-modal");
                  scrollToFirstInvalid(container as HTMLElement);
                  return;
                }

                onContinue(v);
              }, () => {
                const container = document.getElementById("new-trailer-modal");
                scrollToFirstInvalid(container as HTMLElement);
              })}
            >
              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-3">
                <TextField control={control} name="trailerNumber" label="Trailer Number" required />
                <TextField control={control} name="owner" label="Owner" required />
                <TextField control={control} name="make" label="Make" required />
                <TextField control={control} name="model" label="Model" required />
                <TextField control={control} name="year" label="Year" placeholder="YYYY" />
                <TextField control={control} name="vin" label="VIN (optional)" />
                <TextField control={control} name="licensePlate" label="License Plate" required />
                <TextField control={control} name="stateOrProvince" label="State/Province" required />

                {/* Trailer Type themed dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trailer Type</label>
                  {/* RHF Controller inline to reuse themed select */}
                  <ThemedSelect value={methods.getValues("trailerType") as any} onChange={(v)=> methods.setValue("trailerType", v as any, { shouldDirty: true, shouldValidate: true })} options={Object.values(ETrailerType)} placeholderLabel="-- Trailer Type --" error={!!errors.trailerType} />
                </div>

                <DateField control={control} name="safetyInspectionExpiryDate" label="Safety Inspection Expiry" required />

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Comments (optional)</label>
                  <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[100px]" {...register("comments")} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" className="button-base button-solid" style={{ background: "var(--color-green)" }}>Continue</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



"use client";

/**
 * PrimaryDetailsSection
 * - Carrier info, trip info, documents, and load/bound status controls
 * - Uses RHF control with Zod resolver at the form level
 * - Required indicators are visual; validation messages come from RHF fieldState
 */

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { TPrimaryDetailsForm } from "@/types/frontend/form/primaryDetails.form";
import { ETrailerBound } from "@/types/movement.types";
import TextField from "@/app/components/ui/TextField";
import DateField from "@/app/components/ui/DateField";
import SegmentedControl from "@/app/components/ui/SegmentedControl";
import CustomerNameAutocomplete from "../components/primaryDetails/CustomerNameAutocomplete";
import DocumentsField from "../components/primaryDetails/DocumentsField";
import PreflightWarnings from "@/app/(guard)/guard/(home)/components/PreflightWarnings";

export default function PrimaryDetailsSection({ onNext }: { onNext?: () => void }) {
  const { control, setValue, formState: { errors } } = useFormContext<TPrimaryDetailsForm>();

  const isLoaded = useWatch({ control, name: "trip.isLoaded" });
  const trailerBound = useWatch({ control, name: "trip.trailerBound" });
  const safetyDate = useWatch({ control, name: "trip.safetyInspectionExpiry" });

  const isLoadedErrMsg = (errors as any)?.trip?.isLoaded?.message as string | undefined;
  const trailerBoundErrMsg = (errors as any)?.trip?.trailerBound?.message as string | undefined;

  const goToAngles = () => onNext?.();

  // Intercept changes to safety inspection date: confirm before accepting changes from initial value
  const initialSafetyRef = useRef<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingSafetyRef = useRef<string | null>(null);

  useEffect(() => {
    if (safetyDate && !initialSafetyRef.current) {
      // First non-empty value becomes the baseline
      initialSafetyRef.current = safetyDate;
      return;
    }
    if (
      safetyDate &&
      initialSafetyRef.current &&
      safetyDate !== initialSafetyRef.current &&
      !confirmOpen
    ) {
      pendingSafetyRef.current = safetyDate;
      setConfirmOpen(true);
    }
  }, [safetyDate, confirmOpen]);

  return (
    <section id="primary-details" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Parent white card */}
      <div className="rounded-2xl bg-white/80 shadow-sm p-4 sm:p-6 lg:p-8">
        {/* Safety change confirmation dialog */}
        <PreflightWarnings
          open={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            // Revert to initial value
            if (initialSafetyRef.current) {
              setValue("trip.safetyInspectionExpiry", initialSafetyRef.current, { shouldDirty: false, shouldValidate: true });
            }
          }}
          onContinue={() => {
            setConfirmOpen(false);
            if (pendingSafetyRef.current) {
              initialSafetyRef.current = pendingSafetyRef.current;
              setValue("trip.safetyInspectionExpiry", pendingSafetyRef.current, { shouldDirty: true, shouldValidate: true });
            }
          }}
          showInspection
          showDamaged={false}
          title="Confirm change"
          customInspectionText="You're about to update the last safety inspection date. Confirm a new inspection was completed."
          continueText="Yes, update"
        />
        {/* Tablet-first responsive layout */}
        <div className="space-y-6 lg:space-y-8">
          {/* Carrier Info - Full width row */}
          <fieldset className="relative rounded-lg bg-white/80 p-4 sm:p-6 shadow-sm">
            <legend className="absolute -top-3 left-3">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-900 uppercase tracking-wide">
                Carrier Information
              </span>
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              <TextField<TPrimaryDetailsForm>
                control={control}
                name="carrier.carrierName"
                label="Carrier Name"
                placeholder="Acme Logistics"
                required
              />
              <TextField<TPrimaryDetailsForm>
                control={control}
                name="carrier.truckNumber"
                label="Tractor Number (Optional)"
                placeholder="T-778"
              />
              <TextField<TPrimaryDetailsForm>
                control={control}
                name="carrier.driverName"
                label="Driver Name"
                placeholder="Jane Doe"
                required
              />
            </div>
          </fieldset>

          {/* Trip Info - Full width row */}
          <fieldset className="relative rounded-lg bg-white/80 p-4 sm:p-6 shadow-sm">
            <legend className="absolute -top-3 left-3">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-900 uppercase tracking-wide">
                Trip Information
              </span>
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <DateField<TPrimaryDetailsForm>
                control={control}
                name="trip.safetyInspectionExpiry"
                label="Safety Inspection Expiry"
                required
              />
              <CustomerNameAutocomplete<TPrimaryDetailsForm>
                control={control}
                name="trip.customerName"
                label="Customer Name"
                placeholder="Start typing…"
                minChars={2}
                debounceMs={300}
                maxSuggestions={10}
                required
              />
              <TextField<TPrimaryDetailsForm>
                control={control}
                name="trip.orderNumber"
                label="Order Number"
                placeholder="SO-8891"
                required
              />
              <TextField<TPrimaryDetailsForm>
                control={control}
                name="trip.destination"
                label="Destination"
                placeholder="Toronto"
                required
              />
            </div>
          </fieldset>

          {/* Documents and Segments - 6x6 Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Documents - Left side of 6x6 */}
            <div className="lg:col-span-1">
              <DocumentsField name="documents" label="Documents" maxDocs={10} />
            </div>

            {/* Segments - Right side of 6x6 */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              <fieldset
                className={`relative rounded-lg bg-white/80 p-4 sm:p-6 shadow-sm ${isLoadedErrMsg ? "ring-2 ring-red-300" : ""}`}
                aria-invalid={isLoadedErrMsg ? true : undefined}
                data-field="trip.isLoaded"
              >
                <legend className="absolute -top-3 left-3">
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Trailer Status
                  </span>
                </legend>

                <SegmentedControl<string>
                  value={isLoaded === undefined ? "" : (isLoaded ? "1" : "0")}
                  onChange={(v) =>
                    setValue("trip.isLoaded", v === "1", { shouldDirty: true, shouldValidate: true })
                  }
                  options={[
                    { label: "LOADED", value: "1" },
                    { label: "EMPTY", value: "0" },
                  ]}
                />
                {isLoadedErrMsg && (
                  <p className="mt-2 text-xs text-red-600">{isLoadedErrMsg}</p>
                )}
              </fieldset>

              <fieldset
                className={`relative rounded-lg bg-white/80 p-4 sm:p-6 shadow-sm ${trailerBoundErrMsg ? "ring-2 ring-red-300" : ""}`}
                aria-invalid={trailerBoundErrMsg ? true : undefined}
                data-field="trip.trailerBound"
              >
                <legend className="absolute -top-3 left-3">
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Trailer Direction
                  </span>
                </legend>

                <SegmentedControl<ETrailerBound | "">
                  value={trailerBound ?? ""}
                  onChange={(v) =>
                    setValue("trip.trailerBound", v === "" ? undefined : v, { shouldDirty: true, shouldValidate: true })
                  }
                  options={[
                    { label: "South Bound", value: ETrailerBound.SOUTH_BOUND },
                    { label: "North Bound", value: ETrailerBound.NORTH_BOUND },
                    { label: "Local", value: ETrailerBound.LOCAL },
                  ]}
                />
                {trailerBoundErrMsg && (
                  <p className="mt-2 text-xs text-red-600">{trailerBoundErrMsg}</p>
                )}
              </fieldset>
            </div>
          </div>
        </div>

        {/* Down arrow instead of Next */}
        <div className="mt-6 lg:mt-8 flex justify-end">
          <button
            type="button"
            onClick={goToAngles}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            aria-label="Go to Angles section"
            title="Go to Angles"
          >
            ⌄
          </button>
        </div>
      </div>
    </section>
  );
}

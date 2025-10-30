"use client";

/**
 * GuardDataPage — one-pager container for movement capture
 * - Zod-resolved RHF form; sections are snap-scrolled cards
 * - Submit wiring is added later; this page currently logs a snapshot
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import type { TPrimaryDetailsForm } from "@/types/frontend/form/primaryDetails.form";
import PrimaryDetailsSection from "./sections/PrimaryDetailsSection";
import AnglesSection from "./sections/AnglesSection";
import { PrimaryDetailsFormSchema } from "@/types/schemas/primaryDetails.schema";
import { zodRHFResolver } from "@/lib/validation/zodRHFResolver";
import AnimatedPage from "@/app/components/ui/AnimatedPage";
import { scrollToFirstInvalid } from "@/lib/utils/scrollToError";
import { usePreflightTrailer } from "../(home)/hooks/usePreflightTrailer";

export default function GuardDataPage() {
  const sp = useSearchParams();
  const initialMode = sp.get("mode") || "IN";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [unlocked, setUnlocked] = useState<{ primary: boolean; angles: boolean }>({ primary: true, angles: false });

  const methods = useForm<TPrimaryDetailsForm>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: zodRHFResolver(PrimaryDetailsFormSchema),
    defaultValues: {
      carrier: { carrierName: "", driverName: "", truckNumber: "" },
      trip: {
        safetyInspectionExpiry: "",
        customerName: "",
        destination: "",
        orderNumber: "",
        isLoaded: undefined,
        trailerBound: undefined,
      },
      documents: [],
    },
  });

  // Prefill safety inspection expiry from selected trailer when available
  const preflight = usePreflightTrailer();
  useEffect(() => {
    const trailerNumber = sp.get("trailer");
    if (!trailerNumber) return;

    (async () => {
      try {
        const res = await preflight(trailerNumber);
        const dateLike = res?.dto?.safetyInspectionExpiryDate as any;
        if (!dateLike) return;
        // Normalize to date-only string without timezone to avoid +/-1 shifts
        let ymd = "";
        if (typeof dateLike === "string") {
          const m = dateLike.match(/^\d{4}-\d{2}-\d{2}/);
          if (m) ymd = m[0];
          else {
            const d = new Date(dateLike);
            if (d instanceof Date && !Number.isNaN(d.getTime())) {
              ymd = d.toISOString().slice(0, 10);
            }
          }
        } else if (dateLike instanceof Date && !Number.isNaN(dateLike.getTime())) {
          ymd = dateLike.toISOString().slice(0, 10);
        }
        if (!ymd) return;
        methods.setValue("trip.safetyInspectionExpiry", ymd, { shouldDirty: false, shouldValidate: true });
      } catch {
        // best-effort prefill; ignore failures
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = methods.handleSubmit((values) => {
    const payload = {
      ...values,
      trip: {
        ...values.trip,
        safetyInspectionExpiry: values.trip.safetyInspectionExpiry
          ? new Date(values.trip.safetyInspectionExpiry)
          : null,
      },
    };
    console.log("Primary Details snapshot:", payload, { initialMode });
  });

  const sections = useMemo(() => {
    const list: Array<{ id: string; node: React.ReactNode }> = [
      {
        id: "primary",
        node: (
          <PrimaryDetailsSection
            onNext={async () => {
              // Use handleSubmit to run the resolver and populate field-level errors exactly like a real submit
              const ok = await new Promise<boolean>((resolve) => {
                methods.handleSubmit(
                  () => resolve(true),
                  () => resolve(false)
                )();
              });
              if (!ok) {
                // scroll to first invalid field within this section
                requestAnimationFrame(() => {
                  const sectionEl = document.getElementById("primary");
                  scrollToFirstInvalid(sectionEl as HTMLElement);
                });
                return;
              }
              setUnlocked((u: { primary: boolean; angles: boolean }) => ({ ...u, angles: true }));
              setTimeout(() => {
                document.getElementById("angles-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 0);
            }}
          />
        ),
      },
    ];
    if (unlocked.angles) list.push({ id: "angles", node: <AnglesSection /> });
    return list;
  }, [methods, unlocked.angles]);

  return (
    <FormProvider {...methods}>
      <AnimatedPage>
        <form onSubmit={onSubmit}>
          <div ref={containerRef} className="px-4 py-6 sm:px-6">
            <div className="space-y-8">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-20">
                  {s.node}
                </section>
              ))}
            </div>
          </div>

          <button type="submit" className="hidden">
            Submit
          </button>
        </form>
      </AnimatedPage>
    </FormProvider>
  );
}

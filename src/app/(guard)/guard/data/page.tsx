"use client";

/**
 * GuardDataPage — one-pager container for movement capture
 * - Zod-resolved RHF form; sections are snap-scrolled cards
 * - Submit wiring is added later; this page currently logs a snapshot
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import type { TMovementForm } from "@/types/frontend/form/movement.form";
import PrimaryDetailsSection from "./sections/PrimaryDetailsSection";
import AnglesSection from "./sections/AnglesSection";
import TiresSection from "./sections/TiresSection";
import DamageChecklistSection from "./sections/DamageChecklistSection";
import CtpatSection from "./sections/CtpatSection";
import { PrimaryDetailsFormSchema } from "@/types/schemas/primaryDetails.schema";
import { zodRHFResolver } from "@/lib/validation/zodRHFResolver";
import AnimatedPage from "@/app/components/ui/AnimatedPage";
import { scrollToFirstInvalid } from "@/lib/utils/scrollToError";
import { usePreflightTrailer } from "../(home)/hooks/usePreflightTrailer";
import { TiresFormSchema } from "@/types/schemas/tires.schema";
import { DamagesFormSchema } from "@/types/schemas/damages.schema";
import { CtpatSchema } from "@/types/schemas/ctpat.schema";
import { useYardStore } from "@/store/useYardStore";
import { useGlobalLoading } from "@/store/useGlobalLoading";
import { useRouter } from "next/navigation";
import { usePendingTrailer } from "@/store/usePendingTrailer";
import { apiFetch } from "@/lib/api/apiFetch";
import { handleApiError } from "@/lib/api/handleApiError";
import { EMovementType } from "@/types/movement.types";
import { useSmartGlobalLoading } from "@/hooks/useSmartGlobalLoading";

export default function GuardDataPage() {
  const sp = useSearchParams();
  const initialMode = sp.get("mode") || "IN";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [unlocked, setUnlocked] = useState<{
    primary: boolean;
    angles: boolean;
    tires: boolean;
    damages: boolean;
    ctpat: boolean;
  }>({
    primary: true,
    angles: false,
    tires: false,
    damages: false,
    ctpat: false,
  });

  const methods = useForm<TMovementForm>({
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
      angles: {
        FRONT: { photo: null },
        LEFT_FRONT: { photo: null },
        LEFT_REAR: { photo: null },
        REAR: { photo: null },
        RIGHT_REAR: { photo: null },
        RIGHT_FRONT: { photo: null },
        TRAILER_NUMBER_VIN: { photo: null },
        LANDING_GEAR_UNDERCARRIAGE: { photo: null },
      },
      damageChecklist: {} as any,
      damages: [],
      ctpat: {} as any,
      axles: [
        {
          axleNumber: 1,
          type: "DUAL" as any,
          left: {
            photo: null,
            outer: {
              brand: "",
              psi: undefined as any,
              condition: undefined as any,
            },
            inner: {
              brand: "",
              psi: undefined as any,
              condition: undefined as any,
            },
          },
          right: {
            photo: null,
            outer: {
              brand: "",
              psi: undefined as any,
              condition: undefined as any,
            },
            inner: {
              brand: "",
              psi: undefined as any,
              condition: undefined as any,
            },
          },
        },
        {
          axleNumber: 2,
          type: "DUAL" as any,
          left: {
            photo: null,
            outer: {
              brand: "",
              psi: undefined as any,
              condition: undefined as any,
            },
            inner: {
              brand: "",
              psi: undefined as any,
              condition: undefined as any,
            },
          },
          right: {
            photo: null,
            outer: {
              brand: "",
              psi: undefined as any,
              condition: undefined as any,
            },
            inner: {
              brand: "",
              psi: undefined as any,
              condition: undefined as any,
            },
          },
        },
      ],
    },
  });

  // Prefill safety inspection expiry from selected trailer when available
  const preflight = usePreflightTrailer();
  const [preflightMeta, setPreflightMeta] = useState<{
    id?: string | null;
    condition?: string | null;
  } | null>(null);
  const yardId = useYardStore((s) => s.yardId);
  const [submitting, setSubmitting] = useState(false);
  const { show, hide } = useGlobalLoading();
  const router = useRouter();
  const pendingTrailer = usePendingTrailer((s) => s.pending);
  const clearPendingTrailer = usePendingTrailer((s) => s.clear);
  const { end: endNavLoader } = useSmartGlobalLoading();
  useEffect(() => {
    // End any navigation loader once the data page mounts
    endNavLoader();
    const trailerNumber = sp.get("trailer");
    if (!trailerNumber) return;

    (async () => {
      try {
        const res = await preflight(trailerNumber);
        const dto = res?.dto as any;
        const dateLike = dto?.safetyInspectionExpiryDate as any;
        const trailerId = (dto?.id || dto?._id || dto?.trailerId) as
          | string
          | undefined;
        const trailerCondition = dto?.condition as string | undefined;
        setPreflightMeta({
          id: trailerId ?? null,
          condition: trailerCondition ?? null,
        });
        // If this is an existing trailer, drop any pending new-trailer data immediately
        if (trailerId) {
          try { clearPendingTrailer(); } catch {}
        }
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
        } else if (
          dateLike instanceof Date &&
          !Number.isNaN(dateLike.getTime())
        ) {
          ymd = dateLike.toISOString().slice(0, 10);
        }
        if (!ymd) return;
        methods.setValue("trip.safetyInspectionExpiry", ymd, {
          shouldDirty: false,
          shouldValidate: true,
        });
      } catch {
        // best-effort prefill; ignore failures
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from pending new trailer ONLY when it's confirmed not an existing trailer
  useEffect(() => {
    // Wait until preflight meta is determined
    if (preflightMeta === null) return;
    // If an existing trailer was selected, never prefill from pending
    if (preflightMeta?.id) return;
    const ymd = pendingTrailer?.safetyInspectionExpiryDate;
    if (!ymd) return;
    const current = methods.getValues("trip.safetyInspectionExpiry");
    if (!current) {
      methods.setValue("trip.safetyInspectionExpiry", ymd, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTrailer?.safetyInspectionExpiryDate, preflightMeta?.id]);

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
            completed={unlocked.angles}
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
              setUnlocked((u) => ({ ...u, angles: true }));
              setTimeout(() => {
                document
                  .getElementById("angles-section")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 0);
            }}
          />
        ),
      },
    ];
    if (unlocked.angles)
      list.push({
        id: "angles",
        node: (
          <AnglesSection
            completed={unlocked.tires}
            onNext={() => {
              setUnlocked((u) => ({ ...u, tires: true }));
              setTimeout(() => {
                document
                  .getElementById("tires-section")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 0);
            }}
          />
        ),
      });
    if (unlocked.tires)
      list.push({
        id: "tires",
        node: (
          <TiresSection
            onNext={() => {
              setUnlocked((u) => ({ ...u, damages: true }));
              setTimeout(() => {
                document
                  .getElementById("damage-checklist")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 0);
            }}
          />
        ),
      });
    if (unlocked.damages)
      list.push({
        id: "damages",
        node: (
          <DamageChecklistSection
            trailerId={preflightMeta?.id || undefined}
            trailerCondition={preflightMeta?.condition || undefined}
            onNext={() => {
              setUnlocked((u) => ({ ...u, ctpat: true }));
              setTimeout(
                () =>
                  document
                    .getElementById("ctpat-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                0
              );
            }}
          />
        ),
      });
    if (unlocked.ctpat)
      list.push({
        id: "ctpat",
        node: (
          <CtpatSection
            submitting={submitting}
            onSubmit={async () => {
              setSubmitting(true);
              show("Submitting movement…");
              // Final submit: validate all sections and, if valid, POST
              const values = methods.getValues();

              // 1) Primary details via handleSubmit to populate errors
              const primaryOk = await new Promise<boolean>((resolve) => {
                methods.handleSubmit(
                  () => resolve(true),
                  () => resolve(false)
                )();
              });

              // 2) Angles — ensure all photos present
              let anglesOk = true;
              const angleKeys = [
                "FRONT",
                "LEFT_FRONT",
                "LEFT_REAR",
                "REAR",
                "RIGHT_REAR",
                "RIGHT_FRONT",
                "TRAILER_NUMBER_VIN",
                "LANDING_GEAR_UNDERCARRIAGE",
              ] as const;
              for (const k of angleKeys) {
                const photo = (values.angles as any)?.[k]?.photo;
                if (!photo?.s3Key) {
                  (methods.setError as any)(`angles.${k}.photo`, {
                    type: "manual",
                    message: "Upload a photo.",
                  });
                  anglesOk = false;
                }
              }

              // 3) Tires
              const tiresRes = TiresFormSchema.safeParse({
                axles: values.axles,
              });
              if (!tiresRes.success) {
                for (const issue of tiresRes.error.issues) {
                  const path = issue.path?.join(".");
                  if (path)
                    (methods.setError as any)(path, {
                      type: "manual",
                      message: issue.message || "Required",
                    });
                }
              }

              // 4) Damages + checklist
              const damagesRes = DamagesFormSchema.safeParse({
                damageChecklist: values.damageChecklist,
                damages: values.damages,
              });
              if (!damagesRes.success) {
                for (const issue of damagesRes.error.issues) {
                  const path = issue.path?.join(".");
                  if (path)
                    (methods.setError as any)(path, {
                      type: "manual",
                      message: issue.message || "Required",
                    });
                }
              }

              // 5) CTPAT
              const ctpatRes = CtpatSchema.safeParse(
                values.ctpat || ({} as any)
              );
              if (!ctpatRes.success) {
                for (const issue of ctpatRes.error.issues) {
                  const path = issue.path?.join(".");
                  if (path)
                    (methods.setError as any)(`ctpat.${path}`, {
                      type: "manual",
                      message: issue.message || "Required",
                    });
                }
              }

              const ok =
                primaryOk &&
                anglesOk &&
                tiresRes.success &&
                damagesRes.success &&
                ctpatRes.success;
              if (!ok) {
                requestAnimationFrame(() =>
                  scrollToFirstInvalid(containerRef.current as HTMLElement)
                );
                hide();
                setSubmitting(false);
                return;
              }

              // Build payload and POST
              const requestId =
                globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}`;
              const sanitizedTrailer = preflightMeta?.id
                ? undefined
                : (pendingTrailer
                    ? {
                        ...pendingTrailer,
                        vin:
                          pendingTrailer.vin && pendingTrailer.vin.trim()
                            ? pendingTrailer.vin.trim()
                            : undefined,
                      }
                    : undefined);

              const payload: any = {
                type: initialMode as string as EMovementType,
                requestId,
                yardId,
                trailerId: preflightMeta?.id ?? undefined,
                trailer: sanitizedTrailer,
                carrier: values.carrier,
                trip: {
                  ...values.trip,
                  safetyInspectionExpiry: new Date(
                    values.trip.safetyInspectionExpiry
                  ),
                },
                documents: values.documents,
                angles: values.angles,
                axles: values.axles,
                damageChecklist: values.damageChecklist,
                damages: values.damages,
                ctpat: values.ctpat,
              };

              try {
                await apiFetch("/api/v1/guard/movements", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(payload),
                });
                hide();
                setSubmitting(false);
                clearPendingTrailer();
                router.replace("/guard");
              } catch (e: any) {
                hide();
                setSubmitting(false);
                handleApiError(e, {
                  retry: async () => {
                    await apiFetch("/api/v1/guard/movements", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                  },
                });
                // Surface the first invalid again
                requestAnimationFrame(() =>
                  scrollToFirstInvalid(containerRef.current as HTMLElement)
                );
              }
            }}
          />
        ),
      });
    return list;
  }, [
    methods,
    unlocked.angles,
    unlocked.tires,
    unlocked.damages,
    unlocked.ctpat,
    preflightMeta,
    initialMode,
    yardId,
    submitting,
    show,
    hide,
    router,
    pendingTrailer,
    clearPendingTrailer,
  ]);

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

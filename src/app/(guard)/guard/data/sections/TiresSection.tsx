"use client";

import * as React from "react";
import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import type { TMovementForm } from "@/types/frontend/form/movement.form";
import { EAxleType } from "@/types/movement.types";
import UploadPicker from "@/app/components/media/UploadPicker";
import { deleteTempFile, uploadToS3Presigned } from "@/lib/utils/s3Helper";
import type { IFileAsset } from "@/types/shared.types";
import SegmentedControl from "@/app/components/ui/SegmentedControl";
import { Camera, ArrowDownToDot } from "lucide-react";
import BrandAutocomplete from "@/app/(guard)/guard/data/components/TiresSection/BrandAutocomplete";
import { ES3Namespace, ES3Folder } from "@/types/aws.types";
import { scrollToFirstInvalid } from "@/lib/utils/scrollToError";
import { TiresFormSchema } from "@/types/schemas/tires.schema";

type SideKey = "left" | "right";

export default function TiresSection({
  onNext,
  completed,
}: {
  onNext?: () => void;
  completed?: boolean;
}) {
  const {
    control,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<TMovementForm>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "axles" as const,
  });

  const axles = (watch("axles") ?? []) as NonNullable<TMovementForm["axles"]>;

  const canAdd = fields.length < 6;
  const canRemove = fields.length > 2;

  async function onPick(axleIdx: number, side: SideKey, file: File | null) {
    if (!file) return;
    const current = (axles?.[axleIdx] as any)?.[side]?.photo as
      | IFileAsset
      | null
      | undefined;
    try {
      if (current) {
        try {
          await deleteTempFile(current);
        } catch {}
      }
      const res = await uploadToS3Presigned({
        file,
        namespace: ES3Namespace.MOVEMENTS,
        folder: ES3Folder.TIRES,
      });
      const asset: IFileAsset = {
        s3Key: res.s3Key,
        url: res.url,
        mimeType: res.mimeType,
        sizeBytes: res.sizeBytes,
        originalName: res.originalName,
      };
      setValue(`axles.${axleIdx}.${side}.photo` as const, asset, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch {
      /* ignore */
    }
  }

  function onRemovePhoto(axleIdx: number, side: SideKey) {
    const current = (axles?.[axleIdx] as any)?.[side]?.photo as
      | IFileAsset
      | null
      | undefined;
    (async () => {
      try {
        if (current) await deleteTempFile(current);
      } catch {}
    })();
    setValue(`axles.${axleIdx}.${side}.photo` as const, null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function renumberAxles() {
    const current = (watch("axles") ?? []) as any[];
    current.forEach((_, idx) =>
      setValue(`axles.${idx}.axleNumber` as const, idx + 1, {
        shouldDirty: true,
      })
    );
  }

  function addAxle() {
    if (!canAdd) return;
    const axleNumber = fields.length + 1;
    append({
      axleNumber,
      type: EAxleType.DUAL,
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
    } as any);
    setTimeout(renumberAxles, 0);
  }

  function validateTiresSection(): boolean {
    const axles = (watch("axles") ?? []) as any[];
    const parsed = TiresFormSchema.safeParse({
      axles: axles.map((a) => ({
        ...a,
        // coerce empty inputs to undefined so schema fails correctly
        left: {
          ...a.left,
          outer: {
            ...a.left?.outer,
            psi: a.left?.outer?.psi === "" ? undefined : a.left?.outer?.psi,
          },
          inner: a.left?.inner
            ? {
                ...a.left.inner,
                psi: a.left.inner.psi === "" ? undefined : a.left.inner.psi,
              }
            : a.left?.inner,
        },
        right: {
          ...a.right,
          outer: {
            ...a.right?.outer,
            psi: a.right?.outer?.psi === "" ? undefined : a.right?.outer?.psi,
          },
          inner: a.right?.inner
            ? {
                ...a.right.inner,
                psi: a.right.inner.psi === "" ? undefined : a.right.inner.psi,
              }
            : a.right?.inner,
        },
      })),
    });

    // Clear previous errors first
    clearErrors("axles" as any);

    if (parsed.success) return true;

    // Map zod errors to RHF setError
    parsed.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (!path) return;
      setError(path as any, { type: "zod", message: issue.message });
    });
    return false;
  }

  return (
    <section
      id="tires-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl bg-white/80 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center mb-2">
          <h2 className="text-lg font-semibold text-center">Axles & Tires</h2>
        </div>
        <p className="text-sm text-gray-600 text-center mb-4">
          Capture axle photos and tire specs. Default shows two axles; add up to
          six.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {fields.map((field, axIdx) => {
            const axle = axles?.[axIdx] as any;
            const isDual =
              axle?.type === EAxleType.DUAL || axle?.type === "DUAL";
            return (
              <div
                key={field.id}
                className="rounded-xl bg-white/70 shadow-sm ring-1 ring-black/5 p-3 sm:p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Axle {axIdx + 1}</div>
                  <div className="w-56">
                    <SegmentedControl<string>
                      value={isDual ? "DUAL" : "SINGLE"}
                      onChange={(v) => {
                        setValue(`axles.${axIdx}.type` as const, v as any, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        if (v === "SINGLE") {
                          setValue(
                            `axles.${axIdx}.left.inner` as const,
                            null as any,
                            { shouldDirty: true }
                          );
                          setValue(
                            `axles.${axIdx}.right.inner` as const,
                            null as any,
                            { shouldDirty: true }
                          );
                        } else {
                          // Ensure objects exist when switching to dual (no defaults selected)
                          setValue(
                            `axles.${axIdx}.left.inner` as const,
                            (axle?.left?.inner ?? {
                              brand: "",
                              psi: undefined,
                              condition: undefined,
                            }) as any,
                            { shouldDirty: true }
                          );
                          setValue(
                            `axles.${axIdx}.right.inner` as const,
                            (axle?.right?.inner ?? {
                              brand: "",
                              psi: undefined,
                              condition: undefined,
                            }) as any,
                            { shouldDirty: true }
                          );
                        }
                      }}
                      options={[
                        { label: "Single", value: "SINGLE" },
                        { label: "Dual", value: "DUAL" },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-4">
                  {(["left", "right"] as SideKey[]).map((side) => {
                    const sideData = axle?.[side];
                    const label = side === "left" ? "Left" : "Right";
                    return (
                      <div
                        key={side}
                        className="rounded-lg bg-white/60 ring-1 ring-black/5 p-3"
                      >
                        <div className="text-sm font-medium mb-2">{label}</div>
                        {/* Side photo */}
                        <div className="mb-3 relative">
                          <UploadPicker
                            label={sideData?.photo ? "Replace" : "Take a photo"}
                            onPick={(f) => onPick(axIdx, side, f)}
                            accept="image/jpeg,image/png"
                            showDefaultTile={false}
                            menuPlacement="center"
                          >
                            <div
                              className={`relative w-full aspect-[4/3] overflow-hidden rounded-lg border-2 border-dashed grid place-items-center bg-gray-50 text-gray-700 ${
                                (errors as any)?.axles?.[axIdx]?.[side]?.photo
                                  ? "border-red-300"
                                  : ""
                              }`}
                              aria-invalid={
                                Boolean(
                                  (errors as any)?.axles?.[axIdx]?.[side]?.photo
                                ) || undefined
                              }
                              data-field={`axles.${axIdx}.${side}.photo`}
                            >
                              {sideData?.photo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={sideData.photo.url}
                                  alt={`${label} axle`}
                                  className="object-contain w-full h-full"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center">
                                  <Camera className="h-6 w-6 mb-1 text-[var(--color-green)]" />
                                  <span className="text-sm">Take a Photo</span>
                                </div>
                              )}
                            </div>
                          </UploadPicker>
                          {sideData?.photo && (
                            <button
                              type="button"
                              onClick={() => onRemovePhoto(axIdx, side)}
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white grid place-items-center shadow z-10"
                              aria-label="Remove photo"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          <p className="mt-1 text-[11px] text-red-600 min-h-[14px]">
                            {String(
                              (errors as any)?.axles?.[axIdx]?.[side]?.photo
                                ?.message || ""
                            )}
                          </p>
                        </div>

                        {/* Outer tire */}
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            Outer Tire
                          </div>
                          {/* Brand row */}
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Brand
                            </label>
                            <Controller
                              control={control}
                              name={`axles.${axIdx}.${side}.outer.brand` as any}
                              render={({ field }) => (
                                <BrandAutocomplete
                                  value={(field.value ?? "") as string}
                                  onChange={field.onChange}
                                  ariaInvalid={Boolean(
                                    (errors as any)?.axles?.[axIdx]?.[side]
                                      ?.outer?.brand
                                  )}
                                  dataField={`axles.${axIdx}.${side}.outer.brand`}
                                />
                              )}
                            />
                            <p className="mt-1 text-[11px] text-red-600 min-h-[14px]">
                              {String(
                                (errors as any)?.axles?.[axIdx]?.[side]?.outer
                                  ?.brand?.message || ""
                              )}
                            </p>
                          </div>
                          {/* PSI + Condition row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                PSI
                              </label>
                              <Controller
                                control={control}
                                name={`axles.${axIdx}.${side}.outer.psi` as any}
                                render={({ field }) => (
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="0"
                                    className="w-full rounded-md shadow-sm px-3 py-2 text-sm outline-none focus:ring-[var(--color-green)] focus:outline-none focus:shadow-md bg-white border border-gray-200"
                                    value={(field.value ?? "") as any}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ""
                                          ? undefined
                                          : Number(e.target.value)
                                      )
                                    }
                                    aria-invalid={
                                      Boolean(
                                        (errors as any)?.axles?.[axIdx]?.[side]
                                          ?.outer?.psi
                                      ) || undefined
                                    }
                                    data-field={`axles.${axIdx}.${side}.outer.psi`}
                                  />
                                )}
                              />
                              <p className="mt-1 text-[11px] text-red-600 min-h-[14px]">
                                {String(
                                  (errors as any)?.axles?.[axIdx]?.[side]?.outer
                                    ?.psi?.message || ""
                                )}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tire Condition
                              </label>
                              <div
                                aria-invalid={
                                  Boolean(
                                    (errors as any)?.axles?.[axIdx]?.[side]
                                      ?.outer?.condition
                                  ) || undefined
                                }
                                data-field={`axles.${axIdx}.${side}.outer.condition`}
                              >
                                <Controller
                                  control={control}
                                  name={
                                    `axles.${axIdx}.${side}.outer.condition` as any
                                  }
                                  render={({ field }) => (
                                    <SegmentedControl<string>
                                      value={(field.value as any) || ""}
                                      onChange={(v) => field.onChange(v)}
                                      options={[
                                        { label: "ORI", value: "ORI" },
                                        { label: "RE", value: "RE" },
                                      ]}
                                    />
                                  )}
                                />
                              </div>
                              <p className="mt-1 text-[11px] text-red-600 min-h-[14px]">
                                {String(
                                  (errors as any)?.axles?.[axIdx]?.[side]?.outer
                                    ?.condition?.message || ""
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Inner tire (only when dual) */}
                        {isDual && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Inner Tire
                            </div>
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Brand
                              </label>
                              <Controller
                                control={control}
                                name={
                                  `axles.${axIdx}.${side}.inner.brand` as any
                                }
                                render={({ field }) => (
                                  <BrandAutocomplete
                                    value={(field.value ?? "") as string}
                                    onChange={field.onChange}
                                    ariaInvalid={Boolean(
                                      (errors as any)?.axles?.[axIdx]?.[side]
                                        ?.inner?.brand
                                    )}
                                    dataField={`axles.${axIdx}.${side}.inner.brand`}
                                  />
                                )}
                              />
                              <p className="mt-1 text-[11px] text-red-600 min-h-[14px]">
                                {String(
                                  (errors as any)?.axles?.[axIdx]?.[side]?.inner
                                    ?.brand?.message || ""
                                )}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  PSI
                                </label>
                                <Controller
                                  control={control}
                                  name={
                                    `axles.${axIdx}.${side}.inner.psi` as any
                                  }
                                  render={({ field }) => (
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      placeholder="0"
                                      className="w-full rounded-md shadow-sm px-3 py-2 text-sm outline-none focus:ring-[var(--color-green)] focus:outline-none focus:shadow-md bg-white border border-gray-200"
                                      value={(field.value ?? "") as any}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === ""
                                            ? undefined
                                            : Number(e.target.value)
                                        )
                                      }
                                      aria-invalid={
                                        Boolean(
                                          (errors as any)?.axles?.[axIdx]?.[
                                            side
                                          ]?.inner?.psi
                                        ) || undefined
                                      }
                                      data-field={`axles.${axIdx}.${side}.inner.psi`}
                                    />
                                  )}
                                />
                                <p className="mt-1 text-[11px] text-red-600 min-h-[14px]">
                                  {String(
                                    (errors as any)?.axles?.[axIdx]?.[side]
                                      ?.inner?.psi?.message || ""
                                  )}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Tire Condition
                                </label>
                                <div
                                  aria-invalid={
                                    Boolean(
                                      (errors as any)?.axles?.[axIdx]?.[side]
                                        ?.inner?.condition
                                    ) || undefined
                                  }
                                  data-field={`axles.${axIdx}.${side}.inner.condition`}
                                >
                                  <Controller
                                    control={control}
                                    name={
                                      `axles.${axIdx}.${side}.inner.condition` as any
                                    }
                                    render={({ field }) => (
                                      <SegmentedControl<string>
                                        value={(field.value as any) || ""}
                                        onChange={(v) => field.onChange(v)}
                                        options={[
                                          { label: "ORI", value: "ORI" },
                                          { label: "RE", value: "RE" },
                                        ]}
                                      />
                                    )}
                                  />
                                </div>
                                <p className="mt-1 text-[11px] text-red-600 min-h-[14px]">
                                  {String(
                                    (errors as any)?.axles?.[axIdx]?.[side]
                                      ?.inner?.condition?.message || ""
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {canRemove && (
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => {
                        remove(axIdx);
                        setTimeout(renumberAxles, 0);
                      }}
                    >
                      Remove axle
                    </button>
                  )}
                  {axIdx === fields.length - 1 && canAdd && (
                    <button
                      type="button"
                      onClick={addAxle}
                      className="rounded-md bg-[var(--color-primary-action)] text-gray-800 px-4 py-2 text-sm font-medium hover:bg-[var(--color-primary-action-hover)] transition-colors shadow-sm"
                    >
                      + Add another axle
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {/* Section navigation control */}
          <div className="mt-6 lg:mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (validateTiresSection()) {
                  onNext?.();
                } else {
                  const sectionEl = document.getElementById("tires-section");
                  if (sectionEl) scrollToFirstInvalid(sectionEl as HTMLElement);
                }
              }}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-md hover:shadow-lg transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--color-green)] focus:ring-offset-2 ${
                completed
                  ? "opacity-50"
                  : "hover:scale-[1.03] active:scale-[.98]"
              }`}
              aria-label="Continue to next section"
              title="Continue"
            >
              <ArrowDownToDot className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

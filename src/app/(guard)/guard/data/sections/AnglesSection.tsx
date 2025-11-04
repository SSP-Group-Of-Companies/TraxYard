"use client";

import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { TMovementForm } from "@/types/frontend/form/movement.form";
import UploadPicker from "@/app/components/media/UploadPicker";
import { ES3Folder, ES3Namespace } from "@/types/aws.types";
import { deleteTempFile, uploadToS3Presigned } from "@/lib/utils/s3Helper";
import type { IFileAsset } from "@/types/shared.types";
import { X, ZoomIn, Download, Menu, Camera, ArrowDownToDot } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { modalAnimations } from "@/lib/animations";

type AngleKey =
  | "FRONT"
  | "LEFT_FRONT"
  | "LEFT_REAR"
  | "REAR"
  | "RIGHT_REAR"
  | "RIGHT_FRONT"
  | "TRAILER_NUMBER_VIN"
  | "LANDING_GEAR_UNDERCARRIAGE";

const ANGLE_META: Record<AngleKey, { label: string; helper: string; folder: ES3Folder }> = {
  FRONT: {
    label: "Front",
    helper: "Capture the front wall, landing gear, and trailer ID.",
    folder: ES3Folder.ANGLES_FRONT,
  },
  LEFT_FRONT: {
    label: "Left Front",
    helper: "3/4 view showing the front and driver’s side.",
    folder: ES3Folder.ANGLES_LEFT_FRONT,
  },
  LEFT_REAR: {
    label: "Left Rear",
    helper: "3/4 view showing the rear and driver’s side.",
    folder: ES3Folder.ANGLES_LEFT_REAR,
  },
  REAR: {
    label: "Rear",
    helper: "Both doors, hinges, seals, and license plates.",
    folder: ES3Folder.ANGLES_REAR,
  },
  RIGHT_REAR: {
    label: "Right Rear",
    helper: "3/4 view showing the rear and passenger’s side.",
    folder: ES3Folder.ANGLES_RIGHT_REAR,
  },
  RIGHT_FRONT: {
    label: "Right Front",
    helper: "3/4 view showing the front and passenger’s side.",
    folder: ES3Folder.ANGLES_RIGHT_FRONT,
  },
  TRAILER_NUMBER_VIN: {
    label: "Trailer Number / VIN",
    helper: "Zoom on asset tag or ID plate.",
    folder: ES3Folder.ANGLES_TRAILER_NUMBER_VIN,
  },
  LANDING_GEAR_UNDERCARRIAGE: {
    label: "Landing Gear / Undercarriage",
    helper: "Close-up of landing gear, frame, and dolly legs.",
    folder: ES3Folder.ANGLES_LANDING_GEAR_UNDERCARRIAGE,
  },
};

export default function AnglesSection({ onNext, completed }: { onNext?: () => void; completed?: boolean }) {
  const {
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors, dirtyFields },
  } = useFormContext<TMovementForm>();

  const angles = useWatch({ control, name: "angles" }) as TMovementForm["angles"] | undefined;
  const [busy, setBusy] = useState<AngleKey | null>(null);
  const [selected, setSelected] = useState<AngleKey>("FRONT");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  async function onPick(key: AngleKey, file: File | null) {
    if (!file) return;
    setBusy(key);
    try {
      const current = (angles as any)?.[key]?.photo as IFileAsset | undefined;
      if (current) {
        try { await deleteTempFile(current); } catch {}
      }
      const res = await uploadToS3Presigned({
        file,
        namespace: ES3Namespace.MOVEMENTS,
        folder: ANGLE_META[key].folder,
      });
      const asset: IFileAsset = {
        s3Key: res.s3Key,
        url: res.url,
        mimeType: res.mimeType,
        sizeBytes: res.sizeBytes,
        originalName: res.originalName,
      };
      setValue(`angles.${key}.photo` as const, asset, { shouldDirty: true, shouldValidate: true });
      clearErrors(`angles.${key}.photo` as any);
    } finally {
      setBusy(null);
    }
  }

  async function onRemove(key: AngleKey) {
    const current = (angles as any)?.[key]?.photo as IFileAsset | undefined;
    try { await deleteTempFile(current); } catch {}
    setValue(`angles.${key}.photo` as const, null, { shouldDirty: true, shouldValidate: true });
  }

  async function handleDownload(asset?: IFileAsset | null, name?: string) {
    if (!asset?.url) return;
    try {
      const res = await fetch(asset.url, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(name || "photo").replace(/\s+/g, "_")}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      // Fallback to normal navigation download if CORS blocked
      const a = document.createElement("a");
      a.href = asset.url;
      a.download = `${(name || "photo").replace(/\s+/g, "_")}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  const items = useMemo(() => Object.keys(ANGLE_META) as AngleKey[], []);
  const anglesDirty = Boolean((dirtyFields as any)?.angles);
  const isDisabled = Boolean(completed && !anglesDirty);

  function validateAnglesSection(): boolean {
    const missing: AngleKey[] = [];
    for (const k of items) {
      const asset = (angles as any)?.[k]?.photo as IFileAsset | null | undefined;
      const ok = asset && !!asset.s3Key && !!asset.mimeType;
      if (!ok) {
        setError(`angles.${k}.photo` as any, { type: "required", message: "Photo required" });
        missing.push(k);
      } else {
        clearErrors(`angles.${k}.photo` as any);
      }
    }
    if (missing.length) setSelected(missing[0]);
    return missing.length === 0;
  }

  return (
    <section id="angles-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-white/80 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center mb-2">
          <h2 className="text-lg font-semibold text-center">Trailer Photo Angles</h2>
        </div>
        <p className="text-sm text-gray-600 text-center mb-4">Select an angle from the list and capture a clear photo.</p>

        {/* Mobile drawer toggle */}
        <div className="lg:hidden mb-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ring-black/10 shadow-sm bg-white active:scale-[.98] transition"
          >
            <Menu className="h-4 w-4" />
            {ANGLE_META[selected].label}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-6">
          {/* Sidebar list */}
          <aside className="rounded-xl bg-white/70 shadow-sm ring-1 ring-black/5 hidden lg:block">
            <ul className="divide-y divide-gray-100">
              {items.map((k) => {
                const meta = ANGLE_META[k];
                const hasPhoto = Boolean((angles as any)?.[k]?.photo);
                const active = selected === k;
                const hasError = Boolean((errors as any)?.angles?.[k]?.photo);
                return (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => setSelected(k)}
                      className={`w-full text-left px-3 py-3 flex items-start gap-2 transition-colors rounded-md cursor-pointer ${
                        active ? "bg-[color:var(--color-green)/.16]" : "hover:bg-[color:var(--color-green)/.08]"
                      }`}
                    >
                      <span className={`mt-1 h-2 w-2 rounded-full ${hasError ? "bg-red-500" : (active || hasPhoto ? "bg-[var(--color-green)]" : "bg-gray-300")}`} />
                      <div>
                        <div className="text-sm font-medium">{meta.label}</div>
                        <div className="text-[11px] text-gray-500">{meta.helper}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Large viewer */}
          <div>
            {(() => {
              const k = selected;
              const meta = ANGLE_META[k];
              const asset = (angles as any)?.[k]?.photo as IFileAsset | null | undefined;
              const busyThis = busy === k;
              const fieldErr = (errors as any)?.angles?.[k]?.photo?.message as string | undefined;
              return (
                <div className="rounded-xl bg-white/70 p-3 sm:p-4 shadow-sm ring-1 ring-black/5">
                  <div className="mb-2">
                    <div className="text-base font-semibold">{meta.label}</div>
                    <div className="text-xs text-gray-500">{meta.helper}</div>
                  </div>
                  <div className="relative">
                    <UploadPicker
                      label={asset ? "Replace photo" : "Add photo"}
                      onPick={(f) => onPick(k, f)}
                      accept="image/jpeg,image/png"
                      disabled={busyThis}
                      showDefaultTile={false}
                      className="w-full"
                      menuPlacement="center"
                    >
                      <div
                        className={`relative w-full aspect-[4/3] rounded-lg border-2 border-dashed grid place-items-center overflow-hidden cursor-pointer ${
                          busyThis ? "opacity-70 cursor-wait" : "bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-600"
                        } ${fieldErr ? "border-red-300" : ""}`}
                      >
                        {asset ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asset.url} alt={`${meta.label} photo`} className="object-contain w-full h-full" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-700">
                            <Camera className="h-10 w-10 mb-2 text-gray-500" />
                            <span className="text-sm">Add photo</span>
                          </div>
                        )}
                      </div>
                    </UploadPicker>
                    {fieldErr && (
                      <p className="mt-1 text-xs text-red-600">{fieldErr}</p>
                    )}

                    {asset && (
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setZoomOpen(true)}
                          className="p-1.5 rounded-full bg-white shadow ring-1 ring-black/10 hover:bg-gray-50"
                          aria-label="Zoom image"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(asset, meta.label)}
                          className="p-1.5 rounded-full bg-white shadow ring-1 ring-black/10 hover:bg-gray-50"
                          aria-label="Download image"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(k)}
                          className="p-1.5 rounded-full bg-white shadow ring-1 ring-black/10 hover:bg-red-50"
                          aria-label={`Remove ${meta.label} photo`}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Mobile drawer for angle list */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" initial="initial" animate="animate" exit="exit">
              <motion.button className="absolute inset-0 bg-black/40" variants={modalAnimations.backdrop} onClick={() => setDrawerOpen(false)} aria-label="Close" />
              <motion.div
                className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl ring-1 ring-black/10 p-2"
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1, transition: { duration: 0.25 } }}
                exit={{ x: -40, opacity: 0, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="text-sm font-semibold">Angles</div>
                  <button className="p-2 rounded hover:bg-gray-100" onClick={() => setDrawerOpen(false)} aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ul className="divide-y divide-gray-100">
                  {items.map((k) => {
                    const meta = ANGLE_META[k];
                    const hasPhoto = Boolean((angles as any)?.[k]?.photo);
                    const active = selected === k;
                    const hasError = Boolean((errors as any)?.angles?.[k]?.photo);
                    return (
                      <li key={`m-${k}`}>
                        <button
                          type="button"
                          onClick={() => { setSelected(k); setDrawerOpen(false); }}
                          className={`w-full text-left px-3 py-3 flex items-start gap-2 transition-colors rounded-md cursor-pointer ${
                            active ? "bg-[color:var(--color-green)/.16]" : "hover:bg-[color:var(--color-green)/.08]"
                          }`}
                        >
                          <span className={`mt-1 h-2 w-2 rounded-full ${hasError ? "bg-red-500" : (active || hasPhoto ? "bg-[var(--color-green)]" : "bg-gray-300")}`} />
                          <div>
                            <div className="text-sm font-medium">{meta.label}</div>
                            <div className="text-[11px] text-gray-500">{meta.helper}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section navigation control */}
        <div className="mt-6 lg:mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => { if (!isDisabled) { if (validateAnglesSection()) onNext?.(); } }}
            disabled={isDisabled}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-md hover:shadow-lg transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--color-green)] focus:ring-offset-2 ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.03] active:scale-[.98]"}`}
            aria-label="Continue to next section"
            title="Continue"
          >
            <ArrowDownToDot className="h-6 w-6" />
          </button>
        </div>

        {/* Zoom Modal */}
        {zoomOpen && (() => {
          const asset = (angles as any)?.[selected]?.photo as IFileAsset | null | undefined;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <button className="absolute inset-0 bg-black/60" onClick={() => setZoomOpen(false)} aria-label="Close" />
              <div className="relative w-[90vw] max-w-4xl aspect-[4/3] bg-white rounded-xl overflow-hidden shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset?.url || ""} alt="Zoomed" className="object-contain w-full h-full" />
                <button className="absolute top-2 right-2 p-2 rounded-full bg-white shadow ring-1 ring-black/10" onClick={() => setZoomOpen(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}


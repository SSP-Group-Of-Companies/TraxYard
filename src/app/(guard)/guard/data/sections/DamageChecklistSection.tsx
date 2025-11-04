"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { TMovementForm } from "@/types/frontend/form/movement.form";
import {
  DAMAGE_CHECKLIST_LABELS,
  EDamageChecklistItem,
  EDamageLocation,
  EDamageType,
} from "@/types/movement.types";
import {
  DamageItemSchema,
  DamagesFormSchema,
} from "@/types/schemas/damages.schema";
import { scrollToFirstInvalid } from "@/lib/utils/scrollToError";
import UploadPicker from "@/app/components/media/UploadPicker";
import type { IFileAsset } from "@/types/shared.types";
import { useLastMovementDamages } from "../hooks/useLastMovementDamages";
import NewDamageModal from "../components/damages/NewDamageModal";
import PreviousDamageModal from "../components/damages/PreviousDamageModal";
import Image from "next/image";
import { Trash2 } from "lucide-react";

export default function DamageChecklistSection({
  trailerId,
  trailerCondition,
  onNext,
}: {
  trailerId?: string | null;
  trailerCondition?: string | null;
  onNext?: () => void;
}) {
  const { control, setValue, setError, formState: { errors } } = useFormContext<TMovementForm>();

  // Trailer id/status via preflight (already implemented in page) – attempt to get it from default values
  // Incoming identifiers from page preflight

  const checklist = useWatch({ control, name: "damageChecklist" }) as
    | TMovementForm["damageChecklist"]
    | undefined;
  const damages = useWatch({ control, name: "damages" }) as
    | TMovementForm["damages"]
    | undefined;

  const allChecked = useMemo(() => {
    const obj = checklist || ({} as Record<string, boolean>);
    return Object.keys(EDamageChecklistItem).every(
      (k) => (obj as any)[(EDamageChecklistItem as any)[k]] ?? false
    );
  }, [checklist]);

  // Previous damages flow (only when trailer exists)
  const [prevDialogOpen, setPrevDialogOpen] = useState(false);
  const [prevAsked, setPrevAsked] = useState(false);
  const [prevAnswered, setPrevAnswered] = useState(false);
  const { damages: prevDamages, status } = useLastMovementDamages(
    trailerId || undefined
  );

  const shouldPromptPrev = useMemo(
    () =>
      Array.isArray(prevDamages) &&
      prevDamages.length > 0 &&
      (trailerCondition === "DAMAGED" || status === "DAMAGED"),
    [prevDamages, trailerCondition, status]
  );

  useEffect(() => {
    // Auto-open exactly once after finishing checklist
    if (!allChecked) return;
    if (shouldPromptPrev && !prevAnswered && !prevAsked) {
      setPrevDialogOpen(true);
      setPrevAsked(true);
    }
  }, [allChecked, shouldPromptPrev, prevAnswered, prevAsked]);

  function importDamages(selected: number[]) {
    if (!prevDamages || selected.length === 0) return;
    const rows = selected.map((idx) => {
      const r = prevDamages[idx];
      return {
        location:
          (EDamageLocation as any)[r.location] ?? EDamageLocation.FRONT_WALL,
        type: (EDamageType as any)[r.type] ?? EDamageType.DENT,
        comment: r.comment || "",
        photo: null,
        newDamage: false,
      };
    });
    setValue("damages", [...(damages || []), ...rows] as any, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const [newOpen, setNewOpen] = useState(false);

  function addDamageRow(row: {
    location: EDamageLocation;
    type: EDamageType;
    comment?: string;
    photo: IFileAsset | null;
  }) {
    const newRow = { ...row, newDamage: true };
    const parsed = DamageItemSchema.safeParse(newRow);
    if (!parsed.success) return;
    setValue("damages", [...(damages || []), parsed.data] as any, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <section
      id="damage-checklist"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl bg-white/80 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center mb-2">
          <h2 className="text-lg font-semibold text-center">
            Damage Checklist
          </h2>
        </div>
        <p className="text-sm text-gray-600 text-center mb-4">
          Confirm checklist items, then add new or previous damages.
        </p>

        {/* Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(EDamageChecklistItem).map((key) => (
            <label
              key={key as string}
              className={`flex items-center gap-2 rounded-md ring-1 px-3 py-2 bg-white ${((errors as any)?.damageChecklist?.[key]) ? "ring-red-300" : "ring-black/10"}`}
            >
              <input
                type="checkbox"
                className="accent-[var(--color-green)]"
                checked={Boolean((checklist as any)?.[key])}
                onChange={(e) =>
                  setValue(`damageChecklist.${key}` as any, e.target.checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              <span className="text-sm">
                {DAMAGE_CHECKLIST_LABELS[
                  key as keyof typeof DAMAGE_CHECKLIST_LABELS
                ] ?? key}
              </span>
            </label>
          ))}
        </div>

        {/* Damages table gate */}
        <div className="mt-6">
          <div className="text-sm font-semibold mb-2">Damages</div>
          {!allChecked ? (
            <p className="text-xs text-gray-500">
              Complete the checklist above to log damages.
            </p>
          ) : shouldPromptPrev && !prevAnswered ? (
            <p className="text-xs text-gray-500">Review previous damages before logging new ones.</p>
          ) : (
            <div className="rounded-lg ring-1 ring-black/10 overflow-hidden">
              <div className="grid [grid-template-columns:minmax(10rem,1.2fr)_minmax(8rem,1fr)_1.5fr_minmax(9rem,auto)_3rem] bg-gray-50 text-xs font-medium text-gray-600">
                <div className="px-3 py-2">Location</div>
                <div className="px-3 py-2">Type</div>
                <div className="px-3 py-2">Comments</div>
                <div className="px-3 py-2">Photo</div>
                <div className="px-3 py-2 text-right"> </div>
              </div>
              <div>
                {(damages || []).map((d, i) => {
                  const rowErr = (errors as any)?.damages?.[i];
                  return (
                  <div
                    key={i}
                    className="grid [grid-template-columns:minmax(10rem,1.2fr)_minmax(8rem,1fr)_1.5fr_minmax(9rem,auto)_3rem] items-center border-t text-sm"
                  >
                    <div className="px-3 py-2 flex items-center gap-2 min-w-0">
                      {!d.newDamage && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200">
                          OLD
                        </span>
                      )}
                      <span className="truncate" title={String(d.location)}>{String(d.location)}</span>
                    </div>
                    <div className="px-3 py-2 min-w-0"><span className="truncate" title={String(d.type)}>{String(d.type)}</span></div>
                    <div className="px-3 py-2 break-words min-w-0">{d.comment || "—"}</div>
                    <div className="px-3 py-2">
                      <div className="relative inline-block align-top">
                        <UploadPicker
                          label={d.photo ? "Replace photo" : "Upload photo"}
                          onPick={async (f) => {
                            if (!f) return;
                            const { uploadToS3Presigned, deleteTempFile } = await import("@/lib/utils/s3Helper");
                            const { ES3Namespace, ES3Folder } = await import("@/types/aws.types");
                            const cur = (damages || [])[i]?.photo as any;
                            try { if (cur) await deleteTempFile(cur); } catch {}
                            const res = await uploadToS3Presigned({ file: f, namespace: ES3Namespace.MOVEMENTS, folder: ES3Folder.DAMAGES });
                            const row = { ...(damages || [])[i] } as any;
                            row.photo = { s3Key: res.s3Key, url: res.url, mimeType: res.mimeType, sizeBytes: res.sizeBytes, originalName: res.originalName };
                            const copy = [...(damages || [])];
                            copy[i] = row;
                            setValue("damages", copy as any, { shouldDirty: true, shouldValidate: true });
                          }}
                          accept="image/jpeg,image/png"
                          showDefaultTile={false}
                          menuPlacement="center"
                        >
                          <div
                            className={`w-36 h-24 rounded-lg border-2 border-dashed grid place-items-center overflow-hidden cursor-pointer relative ${d.photo ? "bg-white" : "bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-700"} ${rowErr?.photo ? "!border-red-400 error" : ""}`}
                            data-field={`damages.${i}.photo`}
                            title={d.photo?.originalName || "Upload photo"}
                          >
                            {d.photo ? (
                              <Image src={d.photo.url} alt={d.photo.originalName || "Damage photo"} fill sizes="100vw" unoptimized className="object-contain" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-gray-700">
                                <span className="text-[11px]">Camera or files</span>
                              </div>
                            )}
                          </div>
                        </UploadPicker>
                        {d.photo && (
                          <button
                            type="button"
                            aria-label="Remove file"
                            title="Remove file"
                            onClick={async (e) => {
                              e.preventDefault(); e.stopPropagation();
                              try { if (d.photo) { const { deleteTempFile } = await import("@/lib/utils/s3Helper"); await deleteTempFile(d.photo as any); } } catch {}
                              const copy = [...(damages || [])] as any[];
                              const row = { ...(copy[i] || {}) };
                              row.photo = null;
                              copy[i] = row;
                              setValue("damages", copy as any, { shouldDirty: true, shouldValidate: true });
                            }}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white grid place-items-center shadow z-10"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="px-2 py-2 text-right">
                      <button
                        type="button"
                        aria-label="Delete row"
                        title="Delete row"
                        onClick={async () => {
                          try { if (d?.photo) { const { deleteTempFile } = await import("@/lib/utils/s3Helper"); await deleteTempFile(d.photo as any); } } catch {}
                          const copy = [...(damages || [])] as any[];
                          copy.splice(i, 1);
                          setValue("damages", copy as any, { shouldDirty: true, shouldValidate: true });
                        }}
                        className="p-2 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );})}
              </div>
              <div className="border-t p-2">
                <button
                  type="button"
                  className="w-full rounded-md bg-[var(--color-primary-action)] text-gray-800 py-2.5 text-sm font-medium hover:bg-[var(--color-primary-action-hover)] transition-colors shadow-sm"
                  onClick={() => setNewOpen(true)}
                >
                  + Add Damage
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Section navigation control */}
        <div className="mt-6 lg:mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (allChecked && shouldPromptPrev && !prevAnswered) {
                setPrevDialogOpen(true);
                return;
              }
              const val = DamagesFormSchema.safeParse({
                damageChecklist: checklist,
                damages,
              });
              if (val.success) {
                onNext?.();
              } else {
                // Map issues to RHF for inline visuals, then scroll
                for (const issue of val.error.issues) {
                  const path = issue.path?.join(".");
                  if (path) (setError as any)(path, { type: "manual", message: issue.message || "Required" });
                }
                const sectionEl = document.getElementById("damage-checklist");
                if (sectionEl) scrollToFirstInvalid(sectionEl as HTMLElement);
              }
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-md hover:shadow-lg transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--color-green)] focus:ring-offset-2"
            aria-label="Continue to next section"
            title="Continue"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14m0 0 5-5m-5 5-5-5" />
            </svg>
          </button>
        </div>
        {/* Modals */}
        <NewDamageModal
          open={newOpen}
          onClose={() => setNewOpen(false)}
          onAdd={addDamageRow}
        />
        <PreviousDamageModal
          open={prevDialogOpen}
          onClose={() => setPrevDialogOpen(false)}
          rows={(prevDamages || []).map((d) => ({
            location: d.location,
            type: d.type,
            comment: d.comment,
            photoUrl: (d as any)?.photo?.url,
          }))}
          onConfirmYes={(indices) => {
            importDamages(indices);
            setPrevAnswered(true);
            setPrevDialogOpen(false);
          }}
          onConfirmNo={() => {
            setPrevAnswered(true);
            setPrevDialogOpen(false);
          }}
        />
      </div>
    </section>
  );
}

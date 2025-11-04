"use client";

/**
 * DocumentsField — RHF field array for movement documents
 * - Each row: description (text) + photo (S3 presigned upload)
 * - Validated via Zod at form-level; row errors rendered inline
 */

import { useId, useState } from "react";
import { useFieldArray, useFormContext, Controller, useWatch } from "react-hook-form";
import type { TMovementForm } from "@/types/frontend/form/movement.form";
import type { IFileAsset } from "@/types/shared.types";
import UploadPicker from "@/app/components/media/UploadPicker";
import { uploadToS3Presigned, deleteTempFile } from "@/lib/utils/s3Helper";
import { ES3Folder, ES3Namespace } from "@/types/aws.types";
import { Trash2, X, FileText, Camera } from "lucide-react";
import Image from "next/image";

type DocItem = {
  description: string;
  photo: IFileAsset | null;
};

type Props = {
  name: "documents";
  label?: string;
  helper?: string;
  maxDocs?: number;
};

export default function DocumentsField({
  name = "documents",
  label = "Documents",
  helper,
  maxDocs = 10,
}: Props) {
  const errId = useId();

  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<TMovementForm>();

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<Record<number, string>>({});
  // Subscribe to the documents array so UI re-renders when photo/description change
  const docs = (useWatch({ control, name }) as DocItem[]) || [];

  const isImageMime = (m?: string | null) => !!m && m.startsWith("image/");

  const onAdd = () => {
    if (fields.length >= maxDocs) return;
    append({ description: "", photo: null } as DocItem);
    const newIndex = fields.length;
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(`input[name='${name}.${newIndex}.description']`);
      input?.focus();
    }, 0);
  };

  const onPick = async (idx: number, file: File | null) => {
    if (!file) return;
    setBusyIndex(idx);
    try {
      // Best-effort cleanup of previous temp file if replacing
      const current = (docs?.[idx] ?? {}) as DocItem;
      if (current?.photo) {
        try { await deleteTempFile(current.photo); } catch {}
      }

      const res = await uploadToS3Presigned({
        file,
        namespace: ES3Namespace.MOVEMENTS,
        folder: ES3Folder.DOCUMENTS,
      });

      const asset: IFileAsset = {
        s3Key: res.s3Key,
        url: res.url,
        mimeType: res.mimeType,
        sizeBytes: res.sizeBytes,
        originalName: res.originalName,
      };

      setValue(`${name}.${idx}.photo`, asset, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setUploadError((e) => {
        const copy: Record<number, string> = { ...e };
        delete copy[idx as number];
        return copy;
      });
    } catch (err: any) {
      setUploadError((e) => ({ ...e, [idx]: err?.message || "Upload failed" }));
    } finally {
      setBusyIndex(null);
    }
  };

  const atLimit = fields.length >= maxDocs;
  const fieldErr = (errors as any)?.[name]?.message as string | undefined;

  return (
    <fieldset
      className="relative rounded-lg bg-white/80 shadow-sm overflow-visible"
      aria-describedby={fieldErr ? errId : undefined}
    >
      {/* Legend-like top header strip */}
      <legend className="absolute -top-3 left-3">
        <span className="rounded-full bg-white/70 ring-1 ring-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}{" "}
          <span className="text-[10px] font-normal text-gray-500">
            ({fields.length}/{maxDocs})
          </span>
        </span>
      </legend>

      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        {helper && <p className="text-xs text-gray-500">{helper}</p>}
        {fieldErr && (
          <p id={errId} className="text-xs text-red-600">
            {fieldErr}
          </p>
        )}

        {/* Table shell */}
        <div className="rounded-lg shadow-sm bg-white overflow-visible">
          {/* Header row (hidden on small screens) */}
            <div className="hidden sm:grid grid-cols-[1fr_7rem_auto] items-center bg-gray-50 text-sm font-medium text-gray-700 min-w-0">
            <div className="px-3 py-2 sm:px-4 sm:py-3 min-w-0">Description</div>
            <div className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">Photo</div>
            <div className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap w-16"></div>
          </div>

          {/* Rows */}
          <div className="grid">
            {fields.map((f, i) => {
              const item = (docs?.[i] ?? {}) as DocItem;
              const rowErrors = (errors as any)?.[name]?.[i] as any | undefined;

              return (
                <div
                  key={f.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_auto] items-start gap-3 min-w-0 py-2 sm:py-2 rounded-md sm:rounded-none ring-1 ring-black/5 sm:ring-0 bg-white/60 sm:bg-transparent p-2 sm:p-0"
                >
                  {/* Description cell */}
                  <div className="px-3 py-2 sm:px-4 sm:py-3 min-w-0">
                    <div className="text-[11px] text-gray-500 mb-1">Doc {i + 1}</div>
                    <Controller
                      control={control}
                      name={`${name}.${i}.description` as any}
                      render={({ field }) => (
                        <input
                          type="text"
                          name={`${name}.${i}.description`}
                          className={`w-full rounded-md shadow-sm px-3 py-2 text-sm outline-none focus:ring-[var(--color-green)] focus:outline-none focus:shadow-md bg-white ${rowErrors?.description ? "ring-2 ring-red-300 border-red-300" : ""}`}
                          placeholder="Description (e.g., BOL, Manifest, etc.)"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setValue(`${name}.${i}.description`, e.target.value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          onBlur={field.onBlur}
                          data-field={`${name}.${i}.description`}
                        />
                      )}
                    />
                    <p className="mt-1 text-[11px] text-red-600 min-h-[14px]">
                      {rowErrors?.description?.message ? String(rowErrors.description.message) : ""}
                    </p>
                  </div>

                  {/* Photo cell */}
                  <div className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                    <div className="relative inline-block align-top w-full sm:w-auto">
                      {/* Clickable tile for upload/replace with fixed size to keep row height consistent */}
                      <UploadPicker
                      label={item.photo ? "Replace file" : "Upload file"}
                      onPick={(file) => onPick(i, file)}
                        accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        disabled={busyIndex === i}
                        showDefaultTile={false}
                        menuPlacement="center"
                    >
                      <div
                          className={`w-full h-40 sm:w-28 sm:h-20 rounded-lg border-2 border-dashed grid place-items-center overflow-hidden cursor-pointer relative
                            ${busyIndex === i ? "opacity-70 cursor-wait" : "bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-700"}
                            ${(rowErrors?.photo || uploadError[i]) ? "!border-red-400" : ""}`}
                          title={item.photo?.originalName || (uploadError[i] ? uploadError[i] : "Choose file")}
                          aria-busy={busyIndex === i || undefined}
                          data-field={`${name}.${i}.photo`}
                        >
                          {item.photo ? (
                            isImageMime(item.photo.mimeType) ? (
                              <Image
                                src={item.photo.url}
                                alt={item.photo.originalName || "Document"}
                                fill
                                sizes="100vw"
                                unoptimized
                                className="object-contain"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-gray-600">
                                <FileText className="h-6 w-6" />
                                <span className="mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 border text-gray-700">
                                  {(item.photo.mimeType?.split("/")[1] || "DOC").toUpperCase()}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center text-gray-700">
                              <Camera className="h-5 w-5 mb-1 text-[var(--color-green)]" />
                              <span className={`text-[11px] ${uploadError[i] ? "text-red-600" : ""}`}>
                                {uploadError[i] ? "Retry upload" : "Camera or files"}
                              </span>
                            </div>
                          )}
                          {busyIndex === i && (
                            <div className="absolute inset-0 grid place-items-center bg-white/40">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent border-gray-600" />
                            </div>
                          )}
                      </div>
                    </UploadPicker>

                    {item.photo && (
                        <button
                          type="button"
                          aria-label="Remove file"
                          title="Remove file"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try { if (item.photo) await deleteTempFile(item.photo); } catch {}
                            setValue(`${name}.${i}.photo`, null, { shouldDirty: true, shouldValidate: false, shouldTouch: true });
                          }}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white grid place-items-center shadow z-10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Photo validation message (reserve space to avoid layout shift) */}
                    <p className="mt-1 text-[11px] text-red-600 min-h-[14px] w-full sm:w-28 text-center break-words">
                      {rowErrors?.photo ? String(rowErrors?.photo?.message || rowErrors?.photo?.s3Key?.message || "Upload a file") : ""}
                      </p>
                  </div>

                  {/* Actions cell */}
                  <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-end sm:justify-center whitespace-nowrap w-full sm:w-16 relative">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (item?.photo) {
                            await deleteTempFile(item.photo);
                          }
                        } catch {
                          // ignore best-effort cleanup
                        } finally {
                          remove(i);
                        }
                      }}
                      className="p-2 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                      title="Remove document"
                      aria-label={`Remove document ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add row as a big footer button */}
          <div className="px-3 py-2 sm:px-4 sm:py-3">
            <button
              type="button"
              onClick={onAdd}
              disabled={atLimit}
              className="w-full rounded-md bg-[var(--color-primary-action)] text-gray-800 py-2.5 text-sm font-medium hover:bg-[var(--color-primary-action-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              + Add Document
            </button>
          </div>
        </div>
      </div>
    </fieldset>
  );
}

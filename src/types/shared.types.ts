// src/types/shared.types.ts

/* ───────────────────────── New generic file types ───────────────────────── */

export enum EFileMimeType {
  JPEG = "image/jpeg",
  JPG = "image/jpg",
  PNG = "image/png",
  PDF = "application/pdf",
  DOC = "application/msword",
  DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

/**
 * Generic file asset stored in S3 (images, PDFs, docs, etc.).
 * Optional metadata enables better validation/UX but is not required.
 */
export type IFileAsset = {
  url: string;
  s3Key: string;
  mimeType: EFileMimeType | string;
  sizeBytes?: number;
  originalName?: string;
};

/** Runtime helper */
export const isImageMime = (mt?: string) => typeof mt === "string" && mt.toLowerCase().startsWith("image/");

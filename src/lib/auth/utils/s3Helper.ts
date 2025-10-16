// src/lib/utils/s3Upload.ts
import { AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "@/config/env";
import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DEFAULT_PRESIGN_EXPIRY_SECONDS, S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder, IPresignResponse } from "@/types/aws.types";
import { EFileMimeType, type IFileAsset } from "@/types/shared.types";

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

/** ---------- Core upload/delete/move/presign ---------- */

export async function uploadBinaryToS3({ fileBuffer, fileType, folder }: { fileBuffer: Buffer; fileType: string; folder: string }): Promise<{ url: string; key: string }> {
  const extension = (fileType.split("/")[1] || "bin").toLowerCase();
  const key = `${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: fileType,
  });

  await s3.send(command);

  return {
    url: `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`,
    key,
  };
}

export async function deleteS3Objects(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: AWS_BUCKET_NAME, Key: key }));
      } catch (err) {
        console.error(`Failed to delete S3 object: ${key}`, err);
      }
    })
  );
}

export async function moveS3Object({ fromKey, toKey }: { fromKey: string; toKey: string }): Promise<{ url: string; key: string }> {
  const Bucket = AWS_BUCKET_NAME;

  await s3.send(new CopyObjectCommand({ Bucket, CopySource: `${Bucket}/${fromKey}`, Key: toKey }));
  await s3.send(new DeleteObjectCommand({ Bucket, Key: fromKey }));

  return {
    url: `https://${Bucket}.s3.${AWS_REGION}.amazonaws.com/${toKey}`,
    key: toKey,
  };
}

export async function s3ObjectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: AWS_BUCKET_NAME, Key: key }));
    return true;
  } catch (err: any) {
    if (err?.name === "NotFound") return false;
    console.error("S3 existence check failed:", err);
    return false;
  }
}

export async function getPresignedPutUrl({ key, fileType, expiresIn = DEFAULT_PRESIGN_EXPIRY_SECONDS }: { key: string; fileType: string; expiresIn?: number }): Promise<{ url: string }> {
  const command = new PutObjectCommand({ Bucket: AWS_BUCKET_NAME, Key: key, ContentType: fileType });
  const url = await getSignedUrl(s3, command, { expiresIn });
  return { url };
}

/** ---------- Key helpers ---------- */

export const isTempKey = (key?: string) => Boolean(key && key.startsWith(`${S3_TEMP_FOLDER}/`));
export const buildFinalDest = (trackerId: string, folder: ES3Folder) => `${S3_SUBMISSIONS_FOLDER}/${folder}/${trackerId}`;

/** ---------- File-asset finalization (generic) ---------- */

export const isFinalOrEmptyAsset = (asset?: IFileAsset) => !asset?.s3Key || !isTempKey(asset.s3Key);

export async function finalizeAsset(asset: IFileAsset, finalFolder: string): Promise<IFileAsset> {
  if (!asset?.s3Key) throw new Error("Missing s3Key in file asset");
  if (!asset.mimeType) throw new Error("Missing mimeType in file asset");

  if (!isTempKey(asset.s3Key)) return asset; // already finalized

  const filename = asset.s3Key.split("/").pop();
  const finalKey = `${finalFolder}/${filename}`;

  const moved = await moveS3Object({ fromKey: asset.s3Key, toKey: finalKey });
  return { ...asset, s3Key: moved.key, url: moved.url };
}

export async function finalizeAssetSafe(asset: IFileAsset | undefined, finalFolder: string): Promise<IFileAsset | undefined> {
  if (!asset) return asset;
  return finalizeAsset(asset, finalFolder);
}

export async function finalizeAssetVector(vec: IFileAsset[] | undefined, dest: string): Promise<IFileAsset[] | undefined> {
  if (!Array.isArray(vec)) return vec;
  const out: IFileAsset[] = [];
  for (const a of vec) out.push(isTempKey(a?.s3Key) ? await finalizeAsset(a, dest) : a);
  return out;
}

/** ---------- Client-side presigned upload helper (generic) ---------- */

export interface UploadToS3Options {
  file: File;
  folder: ES3Folder;
  trackerId?: string;
  allowedMimeTypes?: readonly string[];
  maxSizeMB?: number;
}

export interface UploadResult {
  s3Key: string;
  url: string;
  putUrl: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

export async function uploadToS3Presigned({
  file,
  folder,
  trackerId = "unknown",
  allowedMimeTypes = [EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG, EFileMimeType.PDF, EFileMimeType.DOC, EFileMimeType.DOCX],
  maxSizeMB = 10,
}: UploadToS3Options): Promise<UploadResult> {
  const clientMime = file.type.toLowerCase();
  if (!allowedMimeTypes.includes(clientMime)) {
    throw new Error(`Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`);
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File size exceeds ${maxSizeMB}MB.`);
  }

  const res = await fetch("/api/v1/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      mimeType: clientMime, // request with client-reported MIME
      trackerId,
      filesize: file.size,
      filename: file.name,
    }),
  });

  if (!res.ok) {
    const { message } = await res.json().catch(() => ({ message: "" }));
    throw new Error(message || "Failed to get presigned URL.");
  }

  const { data }: { data: IPresignResponse } = await res.json();

  // PUT must use the exact Content-Type used in signature
  await fetch(data.url, {
    method: "PUT",
    headers: { "Content-Type": data.mimeType }, // use server-canonical
    body: file,
  });

  return {
    s3Key: data.key,
    url: data.publicUrl,
    putUrl: data.url,
    mimeType: data.mimeType, // ← trust server-canonical MIME
    sizeBytes: file.size,
    originalName: file.name,
  };
}

/** ---------- Bytes helpers ---------- */

async function fetchBytesFromUrl(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch object: ${res.status} ${res.statusText}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function getS3ObjectBytes(key: string): Promise<Uint8Array> {
  const out = await s3.send(new GetObjectCommand({ Bucket: AWS_BUCKET_NAME, Key: key }));
  const body: any = out.Body;

  if (body?.transformToByteArray) return await body.transformToByteArray();

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    body.on("data", (d: Buffer) => chunks.push(d));
    body.on("end", () => resolve());
    body.on("error", reject);
  });
  return new Uint8Array(Buffer.concat(chunks));
}

/**
 * Load image bytes from an asset (for PDF embedding, etc.).
 * Keep this for image workflows only. If you need generic bytes, add another helper.
 */
export async function loadImageBytesFromAsset(asset?: IFileAsset): Promise<Uint8Array> {
  if (!asset) throw new Error("Asset is undefined");
  if (asset.s3Key) return getS3ObjectBytes(asset.s3Key);
  if (asset.url) return fetchBytesFromUrl(asset.url);
  throw new Error("Asset is missing both s3Key and url");
}

/**
 * Delete temp S3 files via the API.
 * - Filters non-temp keys automatically with `isTempKey`.
 * - No-ops if the list is empty after filtering.
 * - Throws with a friendly message on failure.
 */
export async function deleteTempFiles(keys: string[]): Promise<{ deleted?: string[]; failed?: string[] }> {
  if (!Array.isArray(keys) || keys.length === 0) return { deleted: [] };
  const tempKeys = keys.filter((k) => isTempKey(k));
  if (tempKeys.length === 0) return { deleted: [] };

  const res = await fetch("/api/v1/delete-temp-files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys: tempKeys }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to delete temp files");
  }

  // Pass through any structured response (deleted/failed) if your API returns it
  const data = await res.json().catch(() => ({}));
  return data;
}

/**
 * Convenience helper: delete a single temp file if applicable.
 * Returns true if a delete call was made.
 */
export async function deleteTempFile(file?: IFileAsset): Promise<boolean> {
  if (!file?.s3Key || !isTempKey(file.s3Key)) return false;
  await deleteTempFiles([file.s3Key]);
  return true;
}

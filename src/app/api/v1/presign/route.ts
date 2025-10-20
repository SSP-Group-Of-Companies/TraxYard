// src/app/api/v1/presign/route.ts
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { ES3Namespace, ES3Folder, IPresignRequest, IPresignResponse } from "@/types/aws.types";
import { EFileMimeType } from "@/types/shared.types";
import { getPresignedPutUrl } from "@/lib/utils/s3Helper";
import { DEFAULT_FILE_SIZE_LIMIT_MB, DEFAULT_PRESIGN_EXPIRY_SECONDS, S3_TEMP_FOLDER } from "@/constants/aws";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { AWS_BUCKET_NAME, AWS_REGION } from "@/config/env";

/* ───────────────── Allowed types ───────────────── */

const IMAGE_ONLY = [EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG] as const;
const IMAGES_AND_DOCS = [EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG, EFileMimeType.PDF, EFileMimeType.DOC, EFileMimeType.DOCX] as const;

type FolderRule = {
  allowedMime: readonly EFileMimeType[];
  maxMB?: number;
};

type NamespaceRules = {
  /** Allowed folders in this namespace and their rules. */
  folders: Partial<Record<ES3Folder, FolderRule>>;
};

/** Per-namespace validation & limits. Extend as needed. */
const RULES: Record<ES3Namespace, NamespaceRules> = {
  [ES3Namespace.MOVEMENTS]: {
    folders: {
      // Angles (images only)
      [ES3Folder.ANGLES_FRONT]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.ANGLES_LEFT_FRONT]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.ANGLES_LEFT_REAR]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.ANGLES_REAR]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.ANGLES_RIGHT_REAR]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.ANGLES_RIGHT_FRONT]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.ANGLES_TRAILER_NUMBER_VIN]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.ANGLES_LANDING_GEAR_UNDERCARRIAGE]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },

      // Tires & Damages (images only)
      [ES3Folder.TIRES]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.DAMAGES]: { allowedMime: IMAGE_ONLY, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },

      // Documents/Extras (images + docs)
      [ES3Folder.DOCUMENTS]: { allowedMime: IMAGES_AND_DOCS, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
      [ES3Folder.EXTRAS]: { allowedMime: IMAGES_AND_DOCS, maxMB: DEFAULT_FILE_SIZE_LIMIT_MB },
    },
  },
  // Future namespaces can go here
};

/* ───────────────── Mime → extension ───────────────── */

const MIME_TO_EXT_MAP: Record<EFileMimeType, string> = {
  [EFileMimeType.JPEG]: "jpeg",
  [EFileMimeType.JPG]: "jpg",
  [EFileMimeType.PNG]: "png",
  [EFileMimeType.PDF]: "pdf",
  [EFileMimeType.DOC]: "doc",
  [EFileMimeType.DOCX]: "docx",
};

/* ───────────────────────── Handler ───────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody<IPresignRequest>(req);
    const { namespace, folder, mimeType, filesize } = body || {};
    const docId = body?.docId?.trim(); // optional

    // Core presence checks
    if (!namespace || !folder || !mimeType) {
      return errorResponse(400, "Missing required fields: namespace, folder or mimeType");
    }

    // Runtime enum checks
    const NS_SET = new Set(Object.values(ES3Namespace));
    const F_SET = new Set(Object.values(ES3Folder));
    if (!NS_SET.has(namespace)) {
      return errorResponse(400, `Invalid namespace. Must be one of: ${[...NS_SET].join(", ")}`);
    }
    if (!F_SET.has(folder)) {
      return errorResponse(400, `Invalid folder. Must be one of: ${[...F_SET].join(", ")}`);
    }

    // Namespace rules
    const nsRules = RULES[namespace];
    if (!nsRules) return errorResponse(400, `Namespace not configured: ${namespace}`);

    const folderRule = nsRules.folders[folder];
    if (!folderRule) {
      return errorResponse(400, `Folder "${folder}" is not allowed in namespace "${namespace}"`);
    }

    // Mime & size checks
    const normalizedMime = (mimeType as string).toLowerCase() as EFileMimeType;
    const allowed = folderRule.allowedMime ?? IMAGE_ONLY;

    if (!allowed.includes(normalizedMime)) {
      return errorResponse(400, `Invalid file type for ${folder}. Allowed: ${allowed.join(", ")}`);
    }

    const extFromMime = MIME_TO_EXT_MAP[normalizedMime];
    if (!extFromMime) {
      return errorResponse(400, `Unsupported mimeType: ${mimeType}`);
    }

    const maxMB = folderRule.maxMB ?? DEFAULT_FILE_SIZE_LIMIT_MB;
    if (filesize && filesize > maxMB * 1024 * 1024) {
      return errorResponse(400, `File exceeds ${maxMB}MB limit`);
    }

    // Temp key shape:
    // - with id:    temp-files/{namespace}/{docId}/{folder}/{ts-uuid}.{ext}
    // - without id: temp-files/{namespace}/{folder}/{ts-uuid}.{ext}
    const nsPrefix = `${S3_TEMP_FOLDER}/${namespace}`;
    const folderPrefix = docId ? `${nsPrefix}/${docId}/${folder}` : `${nsPrefix}/${folder}`;
    const finalFilename = `${Date.now()}-${randomUUID()}.${extFromMime}`;
    const fullKey = `${folderPrefix}/${finalFilename}`;

    const { url } = await getPresignedPutUrl({ key: fullKey, fileType: normalizedMime });
    const publicUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fullKey}`;

    const result: IPresignResponse = {
      key: fullKey,
      url,
      publicUrl,
      expiresIn: DEFAULT_PRESIGN_EXPIRY_SECONDS,
      mimeType: normalizedMime,
    };

    return successResponse(200, "Presigned URL generated", result);
  } catch (err) {
    return errorResponse(err);
  }
}

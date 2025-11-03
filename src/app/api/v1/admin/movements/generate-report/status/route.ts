// src/app/api/v1/admin/movements/generate-report/status/route.ts
import { NextRequest } from "next/server";
import { guard } from "@/lib/auth/authUtils";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { APP_AWS_ACCESS_KEY_ID, APP_AWS_BUCKET_NAME, APP_AWS_REGION, APP_AWS_SECRET_ACCESS_KEY } from "@/config/env";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { keyJoin } from "@/lib/utils/s3Helper";
import { ES3Namespace, ES3Folder } from "@/types/aws.types";
import { S3_TEMP_FOLDER } from "@/constants/aws";

const s3 = new S3Client({
  region: APP_AWS_REGION,
  credentials: { accessKeyId: APP_AWS_ACCESS_KEY_ID, secretAccessKey: APP_AWS_SECRET_ACCESS_KEY },
});

export async function GET(req: NextRequest) {
  try {
    await guard();

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    if (!jobId) throw new AppError(400, "jobId is required");

    const statusKey = keyJoin(S3_TEMP_FOLDER, ES3Namespace.MOVEMENTS, ES3Folder.REPORTS, `${jobId}.json`);
    const out = await s3.send(new GetObjectCommand({ Bucket: APP_AWS_BUCKET_NAME, Key: statusKey })).catch(() => null);
    if (!out?.Body) throw new AppError(404, "Status not found");

    const buf = await out.Body.transformToByteArray();
    const status = JSON.parse(Buffer.from(buf).toString("utf8"));

    return successResponse(200, "OK", status);
  } catch (err: any) {
    return errorResponse(err);
  }
}

// src/app/api/v1/admin/movements/generate-report/route.ts
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { guard } from "@/lib/auth/authUtils";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { REPORTS_SQS_URL, APP_AWS_ACCESS_KEY_ID, APP_AWS_REGION, APP_AWS_SECRET_ACCESS_KEY } from "@/config/env";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { APP_TZ } from "@/lib/utils/dateUtils";
import { ES3Namespace, ES3Folder } from "@/types/aws.types";
import { keyJoin } from "@/lib/utils/s3Helper";
import { S3_TEMP_FOLDER } from "@/constants/aws";

const s3 = new S3Client({
  region: APP_AWS_REGION,
  credentials: { accessKeyId: APP_AWS_ACCESS_KEY_ID, secretAccessKey: APP_AWS_SECRET_ACCESS_KEY },
});
const sqs = new SQSClient({
  region: APP_AWS_REGION,
  credentials: { accessKeyId: APP_AWS_ACCESS_KEY_ID, secretAccessKey: APP_AWS_SECRET_ACCESS_KEY },
});

// Normalize column tokens -> canonical ids we support
const VALID_COLUMNS = [
  "yard",
  "trailer",
  "movement",
  "owner",
  "status", // derived from trip.isLoaded
  "order number",
  "truck number",
  "driver",
  "date",
  "destination",
  "customer name",
] as const;
type ColumnToken = (typeof VALID_COLUMNS)[number];

function parseColumns(raw: string | null): ColumnToken[] | null {
  if (!raw) return null;
  const items = raw.split(",").map((s) => s.trim().toLowerCase().replace(/[_-]+/g, " "));
  const bad = items.filter((x) => !VALID_COLUMNS.includes(x as ColumnToken));
  if (bad.length) {
    throw new AppError(400, `Unknown column(s): ${bad.join(", ")}. Valid: ${VALID_COLUMNS.join(", ")}`);
  }
  return items as ColumnToken[];
}

export async function POST(req: NextRequest) {
  try {
    await guard();

    // accept either URL params or JSON body; URL params win when both present
    const url = new URL(req.url);
    const qsp = Object.fromEntries(url.searchParams.entries());
    const body = await req.json().catch(() => ({} as any));
    const get = (k: string) => qsp[k] ?? body[k] ?? null;

    const jobId = uuidv4();

    // Filters/sort/pagination — identical to admin list route (pass-through to worker)
    const payload = {
      jobId,
      requestedAt: new Date().toISOString(),
      tz: APP_TZ,
      // search & filters
      q: get("q"),
      type: get("type"),
      yardId: get("yardId"),
      dateFrom: get("dateFrom"),
      dateTo: get("dateTo"),
      hasDamage: get("hasDamage"),
      newDamageOnly: get("newDamageOnly"),
      sortBy: get("sortBy"),
      sortDir: get("sortDir"),
      // export controls
      columns: parseColumns(get("columns")),
      format: (get("format") || "xlsx").toString().toLowerCase(), // "xlsx" | "csv"
      filename: get("filename") || null,
      // pagination (optional; default = no paging)
      page: get("page"),
      limit: get("limit"),
    };

    // Seed a PENDING status JSON in S3
    const statusKey = keyJoin(S3_TEMP_FOLDER, ES3Namespace.MOVEMENTS, ES3Folder.REPORTS, `${jobId}.json`);
    const initialStatus = {
      state: "PENDING",
      progressPercent: 0,
      processed: 0,
      total: null as number | null,
      rowCount: null as number | null,
      columns: payload.columns ?? null,
      format: payload.format,
      startedAt: null as string | null,
      updatedAt: new Date().toISOString(),
      downloadKey: null as string | null,
      downloadUrl: null as string | null,
    };

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.APP_AWS_BUCKET_NAME!,
        Key: statusKey,
        Body: Buffer.from(JSON.stringify(initialStatus)),
        ContentType: "application/json",
      })
    );

    // Enqueue SQS message for the worker
    if (!REPORTS_SQS_URL) throw new AppError(500, "REPORTS_SQS_URL not configured");
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: REPORTS_SQS_URL,
        MessageBody: JSON.stringify(payload),
        MessageGroupId: "movements-reports", // ok for FIFO; harmless for standard
        MessageDeduplicationId: jobId, // ok for FIFO; ignored for standard
      })
    );

    const statusUrl = `/api/v1/admin/movements/generate-report/status?jobId=${jobId}`;
    return successResponse(202, "Export queued", { jobId, statusUrl });
  } catch (err: any) {
    return errorResponse(err);
  }
}

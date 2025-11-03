// src/workers/movementsReportWorker.ts
import ExcelJS from "exceljs";
import { PassThrough } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSEvent, SQSRecord } from "aws-lambda";
import { Movement } from "@/mongoose/models/Movement";
import { APP_AWS_BUCKET_NAME, APP_AWS_REGION } from "@/config/env";
import { ES3Folder, ES3Namespace } from "@/types/aws.types";
import { S3_TEMP_FOLDER } from "@/constants/aws";
import { formatInTimeZone } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { APP_TZ } from "@/lib/utils/dateUtils";
import connectDB from "@/lib/utils/connectDB";

// verify env
if (!APP_AWS_BUCKET_NAME) {
  throw new Error("APP_AWS_BUCKET_NAME is not set in Lambda environment");
}
if (!APP_AWS_REGION) {
  throw new Error("APP_AWS_REGION is not set in Lambda environment");
}

// ─────────────────────────────────────────────────────────────────────────────
// S3
// ─────────────────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: APP_AWS_REGION,
});

async function putStatus(jobId: string, status: any) {
  const statusKey = keyJoin(S3_TEMP_FOLDER, ES3Namespace.MOVEMENTS, ES3Folder.REPORTS, `${jobId}.json`);
  status.updatedAt = new Date().toISOString();
  await s3.send(
    new PutObjectCommand({
      Bucket: APP_AWS_BUCKET_NAME,
      Key: statusKey,
      Body: Buffer.from(JSON.stringify(status)),
      ContentType: "application/json",
    })
  );
}

function publicUrlForKey(key: string) {
  return `https://${APP_AWS_BUCKET_NAME}.s3.${APP_AWS_REGION}.amazonaws.com/${key}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type ColumnToken = "yard" | "trailer" | "movement" | "owner" | "status" | "order number" | "truck number" | "driver" | "date" | "destination" | "customer name";

const DEFAULT_COLUMNS: ColumnToken[] = ["yard", "trailer", "movement", "owner", "status", "order number", "truck number", "driver", "date", "destination", "customer name"];

function normalizeColumns(cols: ColumnToken[] | null): ColumnToken[] {
  return cols && cols.length ? cols : DEFAULT_COLUMNS;
}

function deriveStatusFromIsLoaded(isLoaded: boolean | undefined | null): "LOADED" | "EMPTY" {
  return isLoaded ? "LOADED" : "EMPTY";
}

function parseDayParam(s?: string | null): Date | null {
  if (!s) return null;
  const dayPart = s.length >= 10 ? s.slice(0, 10) : s;
  const d = new Date(`${dayPart}T00:00:00`);
  return isNaN(+d) ? null : d;
}

function toLocalString(d: Date) {
  return formatInTimeZone(d, APP_TZ, "yyyy-MM-dd HH:mm");
}

function buildMatchAndSearch(payload: any) {
  const match: Record<string, any> = {};

  if (payload.type) match.type = payload.type;
  if (payload.yardId) match.yardId = payload.yardId;

  // date range (inclusive local start..exclusive next-day local start)
  const dayFromLocal = parseDayParam(payload?.dateFrom);
  const dayToLocal = parseDayParam(payload?.dateTo);
  const fromUtc = dayFromLocal ? fromZonedTime(startOfDay(dayFromLocal), APP_TZ) : null;
  const toUtcExcl = dayToLocal ? fromZonedTime(startOfDay(addDays(dayToLocal, 1)), APP_TZ) : null;
  if (fromUtc || toUtcExcl) {
    match.ts = {};
    if (fromUtc) match.ts.$gte = fromUtc;
    if (toUtcExcl) match.ts.$lt = toUtcExcl;
  }

  if (payload.hasDamage === "true") match["damages.0"] = { $exists: true };
  if (payload.newDamageOnly === "true") match["damages"] = { $elemMatch: { newDamage: true } };

  // text search regex (case-insensitive "contains")
  const rx = (q: string) => ({ $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" });

  const q = (payload.q || "").trim();
  const qStage = q
    ? {
        $match: {
          $or: [
            { "trailer.trailerNumber": rx(q) },
            { "trailer.owner": rx(q) },
            { "carrier.truckNumber": rx(q) },
            { "carrier.carrierName": rx(q) },
            { "carrier.driverName": rx(q) },
            { "trip.orderNumber": rx(q) },
            { "trip.customerName": rx(q) },
          ],
        },
      }
    : null;

  return { match, qStage };
}

function buildSort(sortByRaw: string | null, sortDirRaw: string | null) {
  const SORT_MAP = {
    ts: "ts",
    type: "type",
    yardId: "yardId",
    trailerNumber: "trailer.trailerNumber",
    owner: "trailer.owner",
    truckNumber: "carrier.truckNumber",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  } as const;
  const sortBy = (Object.keys(SORT_MAP) as Array<keyof typeof SORT_MAP>).includes(sortByRaw as any) ? (sortByRaw as keyof typeof SORT_MAP) : "ts";
  const sortDir = sortDirRaw === "asc" ? 1 : -1;
  return { [SORT_MAP[sortBy]]: sortDir, _id: 1 };
}

function buildBasePipeline(payload: any) {
  const { match, qStage } = buildMatchAndSearch(payload);
  const stages: any[] = [{ $match: match }];
  stages.push({
    $lookup: { from: "trailers", localField: "trailer", foreignField: "_id", as: "trailer" },
  });
  stages.push({ $addFields: { trailer: { $first: "$trailer" }, truckNumber: "$carrier.truckNumber" } });
  if (qStage) stages.push(qStage);
  return stages;
}

function projectForExport() {
  return {
    yardId: 1,
    type: 1,
    ts: 1,
    "carrier.truckNumber": 1,
    "carrier.driverName": 1,
    "trip.orderNumber": 1,
    "trip.destination": 1,
    "trip.customerName": 1,
    "trip.isLoaded": 1,
    "trailer.trailerNumber": 1,
    "trailer.owner": 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    await processRecord(record).catch(async (err) => {
      console.error("Report job failed:", err);
      // Let Lambda fail this message so SQS can retry / DLQ
      throw err;
    });
  }
};

async function processRecord(record: SQSRecord) {
  const payload = JSON.parse(record.body);
  const { jobId } = payload as { jobId: string };
  const status = {
    state: "RUNNING",
    progressPercent: 0,
    processed: 0,
    total: 0,
    rowCount: 0,
    columns: normalizeColumns(payload.columns),
    format: (payload.format || "xlsx") as "xlsx" | "csv",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloadKey: null as string | null,
    downloadUrl: null as string | null,
  };

  // Connect DB
  await connectDB();

  // Count total first (for progress)
  const countStages = buildBasePipeline(payload).concat([{ $count: "count" }]);
  const totalRes = await Movement.aggregate(countStages).allowDiskUse(true);
  status.total = totalRes?.[0]?.count || 0;
  await putStatus(jobId, status);

  // Build data cursor pipeline (sort, optional paging, project)
  const pipeline = buildBasePipeline(payload);
  pipeline.push({ $project: projectForExport() });
  pipeline.push({ $sort: buildSort(payload.sortBy ?? null, payload.sortDir ?? null) });

  // Optional paging
  if (payload.page && payload.limit) {
    const page = Math.max(1, parseInt(payload.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(payload.limit as string, 10) || 20);
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: limit });
  }

  const cursor = Movement.aggregate(pipeline).allowDiskUse(true).cursor({ batchSize: 500 });

  // Prepare S3 target
  const basePrefix = keyJoin(S3_TEMP_FOLDER, ES3Namespace.MOVEMENTS, ES3Folder.REPORTS);
  const outKey = keyJoin(basePrefix, `${jobId}.${status.format}`);
  const contentType = status.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";

  // Stream to S3
  if (status.format === "xlsx") {
    // Excel streaming writer → PassThrough → S3 multipart upload
    const pass = new PassThrough();
    const uploader = new Upload({
      client: s3,
      params: { Bucket: APP_AWS_BUCKET_NAME, Key: outKey, Body: pass, ContentType: contentType },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: pass, useStyles: false, useSharedStrings: false });
    const ws = wb.addWorksheet("Movements");

    // Columns header order
    const cols = status.columns;
    ws.columns = cols.map((c) => ({ header: headerFor(c), key: c, width: 20 }));

    let processed = 0;
    for await (const doc of cursor as any) {
      const row = toRow(cols, doc);
      ws.addRow(row).commit();
      processed++;
      status.processed = processed;
      status.rowCount = processed;
      status.progressPercent = status.total ? Math.min(100, Math.round((processed / status.total) * 100)) : 0;

      if (processed % 200 === 0) {
        await putStatus(jobId, status);
      }
    }

    await wb.commit();
    await uploader.done();
  } else {
    // CSV streaming
    const pass = new PassThrough();
    const uploader = new Upload({
      client: s3,
      params: { Bucket: APP_AWS_BUCKET_NAME, Key: outKey, Body: pass, ContentType: contentType },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    // Write headers
    const cols = status.columns;
    pass.write(cols.map(headerFor).join(",") + "\n");

    let processed = 0;
    for await (const doc of cursor as any) {
      const row = toRow(cols, doc);
      const csvLine = cols.map((c) => csvEscape(row[c] ?? "")).join(",") + "\n";
      pass.write(csvLine);
      processed++;
      status.processed = processed;
      status.rowCount = processed;
      status.progressPercent = status.total ? Math.min(100, Math.round((processed / status.total) * 100)) : 0;

      if (processed % 400 === 0) {
        await putStatus(jobId, status);
      }
    }
    pass.end();
    await uploader.done();
  }

  // Finalize status
  status.state = "DONE";
  status.progressPercent = 100;
  status.downloadKey = outKey;
  status.downloadUrl = publicUrlForKey(outKey);
  await putStatus(jobId, status);
}

// ─────────────────────────────────────────────────────────────────────────────
// Row shaping
// ─────────────────────────────────────────────────────────────────────────────

function headerFor(c: ColumnToken): string {
  switch (c) {
    case "yard":
      return "Yard";
    case "trailer":
      return "Trailer";
    case "movement":
      return "Movement";
    case "owner":
      return "Owner";
    case "status":
      return "Status";
    case "order number":
      return "Order Number";
    case "truck number":
      return "Truck Number";
    case "driver":
      return "Driver";
    case "date":
      return "Date";
    case "destination":
      return "Destination";
    case "customer name":
      return "Customer Name";
  }
}

function toRow(cols: ColumnToken[], doc: any): Record<ColumnToken, string> {
  const loaded = deriveStatusFromIsLoaded(doc?.trip?.isLoaded);
  const map: Record<ColumnToken, string> = {
    yard: doc?.yardId ?? "",
    trailer: doc?.trailer?.trailerNumber ?? "",
    movement: doc?.type ?? "",
    owner: doc?.trailer?.owner ?? "",
    status: loaded,
    "order number": doc?.trip?.orderNumber ?? "",
    "truck number": doc?.carrier?.truckNumber ?? "",
    driver: doc?.carrier?.driverName ?? "",
    date: doc?.ts ? toLocalString(new Date(doc.ts)) : "",
    destination: doc?.trip?.destination ?? "",
    "customer name": doc?.trip?.customerName ?? "",
  };
  // reduce to selected order
  const out: Record<ColumnToken, string> = {} as any;
  for (const c of cols) out[c] = map[c];
  return out;
}

function csvEscape(v: string): string {
  const needs = /[",\n]/.test(v);
  if (!needs) return v;
  return `"${v.replace(/"/g, '""')}"`;
}

function trimSlashes(p: string) {
  return p.replace(/^\/+|\/+$/g, "");
}

function keyJoin(...parts: Array<string | null | undefined>) {
  return parts
    .filter((p) => typeof p === "string" && p.length > 0)
    .map((p) => trimSlashes(String(p)))
    .join("/");
}

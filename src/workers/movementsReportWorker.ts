// src/workers/movementsReportWorker.ts
import ExcelJS from "exceljs";
import { PassThrough } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { SQSEvent, SQSRecord } from "aws-lambda";
import { Movement } from "@/mongoose/models/Movement";
import { ES3Folder, ES3Namespace } from "@/types/aws.types";
import { S3_TEMP_FOLDER } from "@/constants/aws";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";
import { APP_TZ } from "@/lib/utils/dateUtils";
import connectDB from "@/lib/utils/connectDB";

/* ───────── Env ───────── */
const APP_AWS_BUCKET_NAME = process.env.APP_AWS_BUCKET_NAME!;
const APP_AWS_REGION = process.env.APP_AWS_REGION!;
if (!APP_AWS_BUCKET_NAME) throw new Error("APP_AWS_BUCKET_NAME is not set in Lambda environment");
if (!APP_AWS_REGION) throw new Error("APP_AWS_REGION is not set in Lambda environment");

/* ───────── Types & constants ───────── */
const HARD_MAX_ROWS = 1_000_000;

type JobState = "RUNNING" | "DONE" | "ERROR";
type FileFormat = "xlsx" | "csv";

type ColumnToken = "yard" | "trailer" | "movement" | "owner" | "status" | "order number" | "truck number" | "driver" | "date" | "destination" | "customer name";

const DEFAULT_COLUMNS: ColumnToken[] = ["yard", "trailer", "movement", "owner", "status", "order number", "truck number", "driver", "date", "destination", "customer name"];

interface JobStatus {
  state: JobState;
  progressPercent: number;
  processed: number;
  total: number;
  rowCount: number;
  columns: ColumnToken[];
  format: FileFormat;
  startedAt: string;
  updatedAt: string;
  downloadKey: string | null;
  downloadUrl: string | null;
}

/* ───────── S3 client + status I/O ───────── */
const s3 = new S3Client({ region: APP_AWS_REGION });

async function putStatus(jobId: string, status: JobStatus) {
  const statusKey = keyJoin(S3_TEMP_FOLDER, ES3Namespace.MOVEMENTS, ES3Folder.REPORTS, `${jobId}.json`);
  const payload: JobStatus = { ...status, updatedAt: new Date().toISOString() };
  await s3.send(
    new PutObjectCommand({
      Bucket: APP_AWS_BUCKET_NAME,
      Key: statusKey,
      Body: JSON.stringify(payload),
      ContentType: "application/json",
    })
  );
}

async function getStatusIfExists(jobId: string): Promise<JobStatus | null> {
  try {
    const statusKey = keyJoin(S3_TEMP_FOLDER, ES3Namespace.MOVEMENTS, ES3Folder.REPORTS, `${jobId}.json`);
    const out = await s3.send(new GetObjectCommand({ Bucket: APP_AWS_BUCKET_NAME, Key: statusKey }));
    if (!out.Body) return null;
    const buf = await out.Body.transformToByteArray();
    return JSON.parse(new TextDecoder("utf-8").decode(buf)) as JobStatus;
  } catch {
    return null;
  }
}

function publicUrlForKey(key: string) {
  return `https://${APP_AWS_BUCKET_NAME}.s3.${APP_AWS_REGION}.amazonaws.com/${key}`;
}

/* ───────── Column helpers ───────── */
function normalizeColumns(cols: ColumnToken[] | null): ColumnToken[] {
  return cols && cols.length ? cols : DEFAULT_COLUMNS;
}
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

/* ───────── Query helpers ───────── */
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

  // Inclusive local start..exclusive next-day local start
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
  stages.push({ $lookup: { from: "trailers", localField: "trailer", foreignField: "_id", as: "trailer" } });
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

/* ───────── S3 streaming helper ───────── */
function startS3UploadStream(key: string, contentType: string) {
  const pass = new PassThrough();
  const uploader = new Upload({
    client: s3,
    params: { Bucket: APP_AWS_BUCKET_NAME, Key: key, Body: pass, ContentType: contentType },
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  });
  const donePromise = uploader.done(); // wait for this later
  return { pass, donePromise };
}

/* ───────── Lambda handler ───────── */
export const handler = async (event: SQSEvent, ctx: any) => {
  ctx.callbackWaitsForEmptyEventLoop = false;
  console.log("Received SQS records:", event.Records.length);

  for (const record of event.Records) {
    await processRecord(record).catch((err) => {
      console.error("Report job failed:", err);
      throw err; // let SQS retry / DLQ
    });
  }
};

async function processRecord(record: SQSRecord) {
  console.log("Processing record", { messageId: record.messageId, bodyLen: record.body?.length });
  const payload = JSON.parse(record.body);
  const { jobId } = payload as { jobId: string };
  if (!jobId) throw new Error("jobId is required in message payload");

  const existing = await getStatusIfExists(jobId);
  if (existing?.state === "DONE") {
    console.log("Job already DONE, skipping:", jobId);
    return;
  }

  const status: JobStatus = {
    state: "RUNNING",
    progressPercent: 0,
    processed: 0,
    total: 0,
    rowCount: 0,
    columns: normalizeColumns(payload.columns as ColumnToken[] | null),
    format: ((payload.format as FileFormat) || "csv") as FileFormat,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloadKey: null,
    downloadUrl: null,
  };

  const basePrefix = keyJoin(S3_TEMP_FOLDER, ES3Namespace.MOVEMENTS, ES3Folder.REPORTS);
  const outKey = keyJoin(basePrefix, `${jobId}.${status.format}`);
  const contentType = status.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";

  await connectDB();

  // Count (capped) for progress
  const countStages = buildBasePipeline(payload).concat([{ $limit: HARD_MAX_ROWS }, { $count: "count" }]);
  const totalRes = await Movement.aggregate(countStages).allowDiskUse(true);
  status.total = Math.min(totalRes?.[0]?.count || 0, HARD_MAX_ROWS);
  await putStatus(jobId, status);

  // Data pipeline (capped) + sort + optional pagination
  const pipeline = buildBasePipeline(payload);
  pipeline.push({ $project: projectForExport() });
  pipeline.push({ $sort: buildSort(payload.sortBy ?? null, payload.sortDir ?? null) });

  if (payload.page && payload.limit) {
    const page = Math.max(1, parseInt(payload.page as string, 10) || 1);
    const reqLimit = Math.max(1, parseInt(payload.limit as string, 10) || 20);
    const skip = (page - 1) * reqLimit;

    if (skip >= HARD_MAX_ROWS) {
      pipeline.push({ $limit: 0 });
    } else {
      const remaining = HARD_MAX_ROWS - skip;
      const effectiveLimit = Math.min(reqLimit, remaining);
      pipeline.push({ $skip: skip }, { $limit: effectiveLimit });
    }
  } else {
    pipeline.push({ $limit: HARD_MAX_ROWS });
  }

  const cursor = Movement.aggregate(pipeline).allowDiskUse(true).cursor({ batchSize: 1_000 });

  if (status.format === "xlsx") {
    const { pass, donePromise } = startS3UploadStream(outKey, contentType);
    const wb = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: pass,
      useStyles: false,
      useSharedStrings: false,
    });
    const ws = wb.addWorksheet("Movements");
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
      if (processed % 2_000 === 0) await putStatus(jobId, status);
      if (status.processed >= HARD_MAX_ROWS) break;
    }

    await wb.commit();
    await donePromise;
  } else {
    const { pass, donePromise } = startS3UploadStream(outKey, contentType);
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
      if (processed % 4_000 === 0) await putStatus(jobId, status);
      if (status.processed >= HARD_MAX_ROWS) break;
    }
    pass.end();
    await donePromise;
  }

  status.state = "DONE";
  status.progressPercent = 100;
  status.downloadKey = outKey;
  status.downloadUrl = publicUrlForKey(outKey);
  await putStatus(jobId, status);
  console.log("Real job complete:", jobId);
}

/* ───────── Row shaping ───────── */
function toRow(cols: ColumnToken[], doc: any): Record<ColumnToken, string> {
  const loaded = deriveStatusFromIsLoaded(doc?.trip?.isLoaded);
  const map: Record<ColumnToken, string> = {
    yard: String(doc?.yardId ?? ""),
    trailer: String(doc?.trailer?.trailerNumber ?? ""),
    movement: String(doc?.type ?? ""),
    owner: String(doc?.trailer?.owner ?? ""),
    status: loaded,
    "order number": String(doc?.trip?.orderNumber ?? ""),
    "truck number": String(doc?.carrier?.truckNumber ?? ""),
    driver: String(doc?.carrier?.driverName ?? ""),
    date: doc?.ts ? toLocalString(new Date(doc.ts)) : "",
    destination: String(doc?.trip?.destination ?? ""),
    "customer name": String(doc?.trip?.customerName ?? ""),
  };
  const out: Record<ColumnToken, string> = {} as any;
  for (const c of cols) out[c] = map[c];
  return out;
}

/* ───────── CSV escaping ───────── */
function csvEscape(v: string): string {
  const needs = /[",\n]/.test(v);
  if (!needs) return v;
  return `"${v.replace(/"/g, '""')}"`;
}

/* ───────── Small utils ───────── */
function trimSlashes(p: string) {
  return p.replace(/^\/+|\/+$/g, "");
}
function keyJoin(...parts: Array<string | null | undefined>) {
  return parts
    .filter((p) => typeof p === "string" && p.length > 0)
    .map((p) => trimSlashes(String(p)))
    .join("/");
}

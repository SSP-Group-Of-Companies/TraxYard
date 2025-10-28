import { TTrailerDto, TTrailerUI } from "@/types/frontend/trailer.dto";

const toDate = (v?: string | Date | null): Date | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? new Date(t) : undefined;
};

/** Prefer nested lastMoveIo.ts when present, else fall back to lastMoveIoTs */
export function mapTrailerDto(dto: TTrailerDto): TTrailerUI {
  const lastIoTs = dto.lastMoveIo?.ts ?? dto.lastMoveIoTs;

  return {
    id: dto._id,
    trailerNumber: dto.trailerNumber,
    owner: dto.owner,
    make: dto.make,
    model: dto.model,
    year: dto.year,
    vin: dto.vin,
    licensePlate: dto.licensePlate,
    stateOrProvince: dto.stateOrProvince,
    trailerType: dto.trailerType,
    safetyInspectionExpiryDate: toDate(dto.safetyInspectionExpiryDate),
    comments: dto.comments,

    status: dto.status,
    yardId: dto.yardId,

    lastMoveIoTs: toDate(lastIoTs),
    lastMoveIo: dto.lastMoveIo
      ? {
          ts: toDate(dto.lastMoveIo.ts),
          carrier: { truckNumber: dto.lastMoveIo.carrier?.truckNumber },
          type: dto.lastMoveIo.type,
          yardId: dto.lastMoveIo.yardId,
        }
      : undefined,

    loadState: dto.loadState,
    condition: dto.condition,
    totalMovements: dto.totalMovements,

    createdAt: toDate(dto.createdAt),
    updatedAt: toDate(dto.updatedAt),
  };
}

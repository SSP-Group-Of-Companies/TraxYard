import { TTrailerDto, TTrailerUI } from "@/types/frontend/trailer.dto";
import { toDate } from "@/lib/dates";
import { ETrailerStatus } from "@/types/Trailer.types";

/** Prefer nested lastMoveIo.ts when present, else fall back to lastMoveIoTs */
export function mapTrailerDto(dto: TTrailerDto): TTrailerUI {
  const lastIoTs = dto.lastMoveIo?.ts ?? dto.lastMoveIoTs;

  return {
    id: dto._id,
    trailerNumber: dto.trailerNumber,
    owner: dto.owner,
    make: dto.make,
    model: dto.model,
    year: (() => {
      const yearNum = typeof dto.year === "string" ? parseInt(dto.year, 10) : dto.year;
      return typeof yearNum === "number" && Number.isInteger(yearNum) ? yearNum : undefined;
    })(),
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
          carrier: dto.lastMoveIo.carrier ?? {}, // Ensure carrier object always exists
          type: dto.lastMoveIo.type as ETrailerStatus,
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

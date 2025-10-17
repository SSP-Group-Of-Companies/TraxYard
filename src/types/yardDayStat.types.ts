import { EYardId } from "./yard.types";

export type TYardDayStat = {
  yardId: EYardId;
  date: Date; // The specific day this stat is for
  inCount: number; // Number of trailers that came IN on this day
  outCount: number; // Number of trailers that went OUT on this day
  inspectionCount: number; // Number of safety inspections conducted on this day
  damageCount: number; // Number of trailers reported as DAMAGED on this day
};

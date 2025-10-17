import type { TAddress } from "./shared.types";

export enum EYardId {
  YARD_1 = "YARD1",
  YARD_2 = "YARD2",
  YARD_3 = "YARD3",
}

export type TYard = {
  id: EYardId;
  name: string;
  capacity: number;
  location?: TAddress; // Optional location details
};

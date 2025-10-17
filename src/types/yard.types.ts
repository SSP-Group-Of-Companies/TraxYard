import type { TAddress } from "./shared.types";

export enum EYardId {
  YARD_1 = "yard1",
  YARD_2 = "yard2",
  YARD_3 = "yard3",
}

export type TYard = {
  id: EYardId;
  name: string;
  capacity: number;
  location?: TAddress; // Optional location details
};

import { EYardId, TYard } from "@/types/yard.types";

export const yards: TYard[] = [
  {
    id: EYardId.YARD_1,
    name: "Downtown Yard",
    capacity: 50,
    location: {
      line1: "123 Main St, Toronto, ON M5J 2N1",
      city: "Toronto",
      province: "ON",
      postalCode: "M5J 2N1",
      latitude: 43.65107,
      longitude: -79.347015,
    },
  },
  {
    id: EYardId.YARD_2,
    name: "Uptown Yard",
    capacity: 75,
    location: {
      line1: "456 Queen St, Toronto, ON M5V 2B6",
      city: "Toronto",
      province: "ON",
      postalCode: "M5V 2B6",
      latitude: 43.662892,
      longitude: -79.395656,
    },
  },
  {
    id: EYardId.YARD_3,
    name: "Midtown Yard",
    capacity: 60,
    location: {
      line1: "789 Bloor St, Toronto, ON M4W 1A8",
      city: "Toronto",
      province: "ON",
      postalCode: "M4W 1A8",
      latitude: 43.667709,
      longitude: -79.394777,
    },
  },
];

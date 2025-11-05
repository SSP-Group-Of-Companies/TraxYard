import { z } from "zod";
import { ECtpatItem } from "@/types/movement.types";

export const CtpatSchema = z.object({
  [ECtpatItem.TRACTOR_BUMPER]: z.boolean(),
  [ECtpatItem.TRAILER_TIRES]: z.boolean(),
  [ECtpatItem.MOTOR]: z.boolean(),
  [ECtpatItem.TRAILER_BUMPER]: z.boolean(),
  [ECtpatItem.TRACTOR_TIRE]: z.boolean(),
  [ECtpatItem.TRAILER_DOORS]: z.boolean(),
  [ECtpatItem.TRACTOR_FLOOR]: z.boolean(),
  [ECtpatItem.SECURITY_SEALS]: z.boolean(),
  [ECtpatItem.FUEL_TANKS]: z.boolean(),
  [ECtpatItem.TRAILER_WALLS_SIDE]: z.boolean(),
  [ECtpatItem.CABINS_AND_COMPARTMENTS]: z.boolean(),
  [ECtpatItem.TRAILER_FRONT_WALL]: z.boolean(),
  [ECtpatItem.AIR_TANKS]: z.boolean(),
  [ECtpatItem.TRAILER_CEILING]: z.boolean(),
  [ECtpatItem.TRACTOR_CHASSIS]: z.boolean(),
  [ECtpatItem.TRAILER_MUFFLER]: z.boolean(),
  [ECtpatItem.QUINTA]: z.boolean(),
  [ECtpatItem.INTERIOR_FLOOR_TRAILER]: z.boolean(),
  [ECtpatItem.TRAILER_CHASSIS]: z.boolean(),
  [ECtpatItem.INTERNAL_TRACTOR_WALLS]: z.boolean(),
  [ECtpatItem.AGRICULTURE]: z.boolean(),
}).superRefine((obj, ctx) => {
  // Require all items to be true
  (Object.values(ECtpatItem) as string[]).forEach((k) => {
    if (!(obj as any)?.[k]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: "Please confirm this item." });
    }
  });
});

export type TCtpatZ = z.infer<typeof CtpatSchema>;



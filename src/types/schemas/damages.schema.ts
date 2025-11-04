import { z } from "zod";
import { EDamageChecklistItem, EDamageLocation, EDamageType } from "@/types/movement.types";

// FileAsset-like validator shared with other sections
const FileAssetSchema = z.object({
  s3Key: z.string().min(1, "Upload a photo."),
  mimeType: z.string().min(1, "Missing file type"),
  url: z.string().url().optional(),
  sizeBytes: z.number().optional(),
  originalName: z.string().optional(),
});

export const DamageChecklistSchema = z.object({
  [EDamageChecklistItem.CRANK_SHAFT]: z.boolean(),
  [EDamageChecklistItem.MUD_FLAPS]: z.boolean(),
  [EDamageChecklistItem.CLEARANCE_LIGHTS_1]: z.boolean(),
  [EDamageChecklistItem.MARKERS]: z.boolean(),
  [EDamageChecklistItem.REFLECTORS]: z.boolean(),
  [EDamageChecklistItem.CLEARANCE_LIGHTS_2]: z.boolean(),
  [EDamageChecklistItem.CLEARANCE_LIGHTS_3]: z.boolean(),
  [EDamageChecklistItem.LUG_NUTS]: z.boolean(),
  [EDamageChecklistItem.UNDER_CARRIAGE]: z.boolean(),
  [EDamageChecklistItem.SEA_ATA_7_WAY_PLUG]: z.boolean(),
  [EDamageChecklistItem.WIRING]: z.boolean(),
  [EDamageChecklistItem.REAR_END_PROTECTION]: z.boolean(),
  [EDamageChecklistItem.AIR_OR_V_LOSS]: z.boolean(),
  [EDamageChecklistItem.CONNECTIONS]: z.boolean(),
  [EDamageChecklistItem.HOSE]: z.boolean(),
  [EDamageChecklistItem.TUBING]: z.boolean(),
});

export const DamageItemSchema = z.object({
  location: z.nativeEnum(EDamageLocation),
  type: z.nativeEnum(EDamageType),
  comment: z.string().trim().optional(),
  photo: FileAssetSchema,
  newDamage: z.boolean(),
});

export const DamagesFormSchema = z.object({
  damageChecklist: DamageChecklistSchema,
  damages: z.array(DamageItemSchema).default([]),
}).superRefine((data, ctx) => {
  // Require all checklist items to be confirmed
  const dc = data.damageChecklist as Record<string, boolean>;
  Object.values(EDamageChecklistItem).forEach((k) => {
    if (!dc?.[k]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please confirm this item.",
        path: ["damageChecklist", k],
      });
    }
  });
});

export type TDamagesFormZ = z.infer<typeof DamagesFormSchema>;



import { z } from "zod";
import { ETrailerType } from "@/types/Trailer.types";

export const NewTrailerSchema = z.object({
  trailerNumber: z.string().trim().min(1, "Trailer number is required."),
  owner: z.string().trim().min(1, "Owner is required."),
  make: z.string().trim().min(1, "Make is required."),
  model: z.string().trim().min(1, "Model is required."),
  year: z
    .union([z.string().refine(v => /^\d{4}$/.test(v), "Enter a 4-digit year."), z.number().int()])
    .transform(v => (typeof v === "string" ? parseInt(v, 10) : v))
    .refine(v => v >= 1900 && v <= 9999, "Year must be between 1900 and 9999."),
  vin: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t ? t : undefined;
    }),
  licensePlate: z.string().trim().min(1, "License plate is required."),
  stateOrProvince: z.string().trim().min(1, "State/Province is required."),
  trailerType: z.nativeEnum(ETrailerType),
  safetyInspectionExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  comments: z.string().trim().optional().nullable(),
});

export type TNewTrailer = z.infer<typeof NewTrailerSchema>;



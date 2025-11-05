import { z } from "zod";
import { EAxleType, ETireCondition } from "@/types/movement.types";

// Minimal shared file asset schema (client-side) — mirrors primary details' one
export const FileAssetSchema = z.object({
  s3Key: z.string().min(1, "Photo is required."),
  mimeType: z.string().min(1, "Missing file type"),
  url: z.string().url().optional(),
  sizeBytes: z.number().optional(),
  originalName: z.string().optional(),
});

const TireSpecSchema = z
  .object({
    brand: z.string().trim().min(1, "Brand is required."),
    psi: z.number().optional(),
    condition: z.nativeEnum(ETireCondition).optional(),
  })
  .superRefine((spec, ctx) => {
    if (spec.psi === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["psi"], message: "PSI is required." });
    }
    if (typeof spec.psi === "number") {
      if (spec.psi < 0 || spec.psi > 200) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["psi"], message: "PSI must be between 0 and 200." });
      }
    }
    if (spec.condition === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["condition"], message: "Condition is required." });
    }
  });

const SideTireSchema = z.object({
  photo: z
    .union([FileAssetSchema, z.null()])
    .refine((v) => v !== null, { message: "Upload a photo." }) as unknown as typeof FileAssetSchema,
  outer: TireSpecSchema,
  inner: TireSpecSchema.optional().nullable(),
});

const AxleSchema = z.object({
  axleNumber: z.number().int().positive(),
  type: z.nativeEnum(EAxleType),
  left: SideTireSchema,
  right: SideTireSchema,
}).superRefine((axle, ctx) => {
  // Require inner when DUAL; allow missing when SINGLE
  const needsInner = axle.type === EAxleType.DUAL;
  (['left','right'] as const).forEach((side) => {
    const inner = (axle as any)[side]?.inner;
    if (needsInner) {
      if (!inner) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Brand is required.", path: [side, "inner", "brand"] });
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "PSI is required.", path: [side, "inner", "psi"] });
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Condition is required.", path: [side, "inner", "condition"] });
      }
    }
  });
});

export const TiresFormSchema = z.object({
  axles: z.array(AxleSchema).min(2, "At least two axles are required."),
});

export type TTiresFormZ = z.infer<typeof TiresFormSchema>;



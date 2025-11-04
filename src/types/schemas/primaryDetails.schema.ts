/**
 * Primary Details Form Schema
 * - Enforces required carrier/trip fields and validates document file assets
 * - Note: required UI asterisks are visual; Zod is the single source of truth
 */
import { z } from "zod";
import { ETrailerBound } from "@/types/movement.types";

// Minimal client-side file asset validator aligned with server vFileish
const FileAssetSchema = z.object({
  s3Key: z.string().min(1, "Upload a file for this document"),
  mimeType: z.string().min(1, "Missing file type"),
  // Optional extras the uploader may include
  url: z.string().url().optional(),
  sizeBytes: z.number().optional(),
  originalName: z.string().optional(),
});

const DocumentItemSchema = z.object({
  description: z.string().trim().min(1, "Enter a short description"),
  // Friendly message when null; keeps full shape validation when object
  photo: z.union([FileAssetSchema, z.null()]).refine((v) => v !== null, {
    message: "Upload a file for this document",
  }) as unknown as typeof FileAssetSchema, // cast to preserve downstream type
});

export const PrimaryDetailsFormSchema = z.object({
  carrier: z.object({
    carrierName: z.string().trim().min(1, "Carrier name is required"),
    driverName: z.string().trim().min(1, "Driver name is required"),
    truckNumber: z.string().trim().optional(),
  }),
  trip: z.object({
    safetyInspectionExpiry: z
      .string()
      .trim()
      .min(1, "Safety inspection expiry is required"), // expects YYYY-MM-DD
    customerName: z.string().trim().min(1, "Customer name is required"),
    destination: z.string().trim().min(1, "Destination is required"),
    orderNumber: z.string().trim().min(1, "Order number is required"),
    isLoaded: z.boolean(),
    trailerBound: z.nativeEnum(ETrailerBound),
  }),
  documents: z.array(DocumentItemSchema).default([]),
});

export type TPrimaryDetailsFormZ = z.infer<typeof PrimaryDetailsFormSchema>;



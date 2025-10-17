import { trim } from "@/lib/utils/stringUtils";
import { Schema } from "mongoose";

const fileAssetSchema = new Schema(
  {
    url: { type: String, required: [true, "File URL is required."], trim: true },
    s3Key: { type: String, required: [true, "s3Key is required."], trim: true },
    mimeType: { type: String, required: [true, "mimeType is required."], trim: true },
    sizeBytes: { type: Number, min: [0, "sizeBytes cannot be negative."] },
    originalName: { type: String, set: trim },
  },
  { _id: false }
);

export default fileAssetSchema;

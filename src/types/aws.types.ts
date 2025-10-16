// src/types/aws.types.ts
import { EFileMimeType } from "./shared.types";

export enum ES3Folder {}

export interface IPresignRequest {
  folder: ES3Folder;
  filename?: string;
  mimeType: EFileMimeType;
  trackerId?: string;
  filesize?: number;
}

export interface IPresignResponse {
  key: string;
  url: string;
  publicUrl: string;
  expiresIn: number;
  mimeType: EFileMimeType;
}

import { ENC_KEY, HASH_SECRET } from "@/config/env";
import crypto from "crypto";

const ENCRYPTION_KEY = Buffer.from(ENC_KEY, "hex"); // 32 bytes for AES-256
const IV_LENGTH = 12; // Recommended IV length for GCM
const ALGORITHM = "aes-256-gcm"; // AES with Galois/Counter Mode (secure & authenticated)

/**
 * Generate an HMAC-SHA256 hash of a given string using a secret key.
 * @param value The plain text string to hash
 * @param secret Optional override for the hash secret
 */
export function hashString(value: string, secret: string = HASH_SECRET): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function encryptString(value: string, key: Buffer = ENCRYPTION_KEY): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), encrypted.toString("hex"), authTag.toString("hex")].join(":");
}

export function decryptString(encrypted: string, key: Buffer = ENCRYPTION_KEY): string {
  const [ivHex, encryptedHex, authTagHex] = encrypted.split(":");
  if (!ivHex || !encryptedHex || !authTagHex) {
    throw new Error("Invalid encrypted format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encryptedBuffer = Buffer.from(encryptedHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted.toString("utf8");
}

import "server-only";
import { env } from "@/lib/env";
import { signParams } from "@/lib/crypto";
import { localDriver } from "./local";
import { s3Driver } from "./s3";
import type { StorageDriver } from "./types";

export type { StorageDriver } from "./types";

export const storage: StorageDriver = env.STORAGE_DRIVER === "s3" ? s3Driver() : localDriver();

/**
 * Upload target for a pending media row. Local driver: our own signed PUT
 * endpoint (streams to disk). S3 driver: a presigned PUT straight to the bucket.
 */
export async function uploadTarget(kind: "photo" | "guest" | "asset", id: string, key: string, contentType: string) {
  if (storage.name === "s3") {
    return { url: await storage.presignPut(key, contentType, 60 * 60), direct: true as const };
  }
  return { url: `/api/upload/${kind}/${id}?${signParams(`upload:${kind}:${id}`, 60 * 60 * 2)}`, direct: false as const };
}

export function storageKey(...parts: string[]) {
  return parts.map((p) => p.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/");
}

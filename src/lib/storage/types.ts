import type { Readable } from "node:stream";

export interface StorageDriver {
  name: "local" | "s3";
  /** Stream an object into storage. Never buffers whole files in memory. */
  putStream(key: string, body: Readable, contentType: string): Promise<{ bytes: number }>;
  putBuffer(key: string, body: Buffer, contentType: string): Promise<void>;
  getStream(key: string, range?: { start: number; end: number }): Promise<Readable>;
  /** Copies the object to a local temp file and returns its path (for sharp / archiver). */
  toTempFile(key: string): Promise<{ path: string; cleanup: () => Promise<void> }>;
  stat(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  presignPut(key: string, contentType: string, ttlSeconds: number): Promise<string>;
  presignGet(key: string, ttlSeconds: number, downloadName?: string): Promise<string | null>;
}

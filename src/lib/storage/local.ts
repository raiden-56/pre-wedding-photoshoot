import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform, type Readable } from "node:stream";
import type { StorageDriver } from "./types";

/**
 * Local disk driver for development. Files live OUTSIDE /public, under
 * .data/storage, and are only reachable through signed /api/media URLs.
 */
export function localDriver(root = path.resolve(process.cwd(), ".data/storage")): StorageDriver {
  const resolve = (key: string) => {
    const p = path.resolve(root, key);
    if (!p.startsWith(root)) throw new Error("Invalid storage key");
    return p;
  };

  return {
    name: "local",
    async putStream(key, body) {
      const target = resolve(key);
      await mkdir(path.dirname(target), { recursive: true });
      let bytes = 0;
      const counter = new Transform({
        transform(chunk, _enc, cb) {
          bytes += chunk.length;
          cb(null, chunk);
        },
      });
      await pipeline(body, counter, createWriteStream(target));
      return { bytes };
    },
    async putBuffer(key, body) {
      const target = resolve(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },
    async getStream(key, range) {
      return createReadStream(resolve(key), range ? { start: range.start, end: range.end } : undefined) as Readable;
    },
    async toTempFile(key) {
      // Already on disk: no copy needed.
      return { path: resolve(key), cleanup: async () => {} };
    },
    async stat(key) {
      try {
        const s = await stat(resolve(key));
        return { size: s.size };
      } catch {
        return null;
      }
    },
    async delete(key) {
      await rm(resolve(key), { force: true });
    },
    async presignPut() {
      throw new Error("Local driver uses /api/upload signed endpoints");
    },
    async presignGet() {
      return null; // served via /api/media
    },
  };
}

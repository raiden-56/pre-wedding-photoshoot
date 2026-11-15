import "server-only";
import { AwsClient } from "aws4fetch";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { StorageDriver } from "./types";

/**
 * S3-compatible driver (AWS S3, Cloudflare R2, Backblaze B2, MinIO…).
 * The bucket must be PRIVATE; every read goes through short-lived presigned URLs.
 * Required env: S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 */
export function s3Driver(): StorageDriver {
  const endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
  const bucket = process.env.S3_BUCKET ?? "";
  const lazyClient = () => {
    if (!endpoint || !bucket || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 storage is selected but S3_* environment variables are missing.");
    }
    return new AwsClient({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      service: "s3",
      region: process.env.S3_REGION || "auto",
    });
  };
  const url = (key: string) => `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

  const driver: StorageDriver = {
    name: "s3",
    async putStream(key, body, contentType) {
      // Spool to a temp file first so we know Content-Length and never hold the file in memory.
      const dir = await mkdtemp(path.join(os.tmpdir(), "saanjh-"));
      const tmp = path.join(dir, "upload");
      try {
        await pipeline(body, createWriteStream(tmp));
        const { createReadStream, statSync } = await import("node:fs");
        const size = statSync(tmp).size;
        const res = await lazyClient().fetch(url(key), {
          method: "PUT",
          headers: { "content-type": contentType, "content-length": String(size) },
          body: Readable.toWeb(createReadStream(tmp)) as unknown as BodyInit,
          // @ts-expect-error duplex is required by undici for streamed bodies
          duplex: "half",
        });
        if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
        return { bytes: size };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    async putBuffer(key, body, contentType) {
      const res = await lazyClient().fetch(url(key), { method: "PUT", headers: { "content-type": contentType }, body: new Uint8Array(body) });
      if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
    },
    async getStream(key, range) {
      const res = await lazyClient().fetch(url(key), {
        headers: range ? { range: `bytes=${range.start}-${range.end}` } : undefined,
      });
      if (!res.ok || !res.body) throw new Error(`S3 GET failed: ${res.status}`);
      return Readable.fromWeb(res.body as never);
    },
    async toTempFile(key) {
      const dir = await mkdtemp(path.join(os.tmpdir(), "saanjh-"));
      const tmp = path.join(dir, path.basename(key));
      await pipeline(await driver.getStream(key), createWriteStream(tmp));
      return { path: tmp, cleanup: () => rm(dir, { recursive: true, force: true }) };
    },
    async stat(key) {
      const res = await lazyClient().fetch(url(key), { method: "HEAD" });
      if (!res.ok) return null;
      return { size: Number(res.headers.get("content-length") ?? 0) };
    },
    async delete(key) {
      await lazyClient().fetch(url(key), { method: "DELETE" });
    },
    async presignPut(key, contentType, ttl) {
      const signed = await lazyClient().sign(`${url(key)}?X-Amz-Expires=${ttl}`, {
        method: "PUT",
        headers: { "content-type": contentType },
        aws: { signQuery: true },
      });
      return signed.url;
    },
    async presignGet(key, ttl, downloadName) {
      const q = new URLSearchParams({ "X-Amz-Expires": String(ttl) });
      if (downloadName) q.set("response-content-disposition", `attachment; filename="${downloadName.replace(/"/g, "")}"`);
      const signed = await lazyClient().sign(`${url(key)}?${q}`, { method: "GET", aws: { signQuery: true } });
      return signed.url;
    },
  };
  return driver;
}

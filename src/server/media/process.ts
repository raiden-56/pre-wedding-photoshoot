import "server-only";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import sharp from "sharp";
import { db } from "@/lib/db";
import { storage, storageKey } from "@/lib/storage";
import { VARIANTS, type PhotoVariants } from "@/lib/media";

sharp.cache(false);
sharp.concurrency(2);

const LIMIT_PIXELS = 24000 * 24000;

async function hashFile(path: string) {
  const h = createHash("sha256");
  for await (const chunk of createReadStream(path)) h.update(chunk as Buffer);
  return h.digest("hex");
}

export function derivedKey(originalKey: string, variant: string) {
  return originalKey.replace(/\/originals\/([^/]+?)(\.[a-z0-9]+)?$/i, `/derived/$1/${variant}.webp`);
}

/**
 * Generates responsive derivatives for one uploaded photo.
 * Reads from a file path so huge originals are streamed by libvips instead of loaded into JS memory.
 */
export async function processPhoto(photoId: string) {
  const photo = await db.photo.findUnique({ where: { id: photoId }, include: { gallery: { select: { studioId: true } } } });
  if (!photo) return;
  if (photo.status === "READY") return;
  await db.photo.update({ where: { id: photoId }, data: { status: "PROCESSING", error: null } });

  const tmp = await storage.toTempFile(photo.originalKey);
  try {
    const sha = await hashFile(tmp.path);
    const dup = await db.photo.findFirst({
      where: { galleryId: photo.galleryId, sha256: sha, id: { not: photo.id }, status: "READY" },
      select: { id: true },
    });

    if (photo.kind === "VIDEO") {
      await db.photo.update({ where: { id: photoId }, data: { status: "READY", sha256: sha, duplicateOfId: dup?.id ?? null } });
      return;
    }

    const base = () => sharp(tmp.path, { limitInputPixels: LIMIT_PIXELS, sequentialRead: true, failOn: "error" }).rotate();
    const meta = await base().metadata();
    // .rotate() applies EXIF orientation, so swap dims for 90° orientations
    const swap = (meta.orientation ?? 1) >= 5;
    const width = swap ? meta.height : meta.width;
    const height = swap ? meta.width : meta.height;

    const variants: PhotoVariants = {};
    let derivedBytes = 0;
    for (const [name, cfg] of Object.entries(VARIANTS)) {
      const buf = await base().resize({ width: cfg.width, withoutEnlargement: true }).webp({ quality: cfg.quality }).toBuffer();
      const key = derivedKey(photo.originalKey, name);
      await storage.putBuffer(key, buf, "image/webp");
      variants[name as keyof typeof VARIANTS] = key;
      derivedBytes += buf.length;
    }
    const blur = await base().resize(24).blur(1.2).webp({ quality: 40 }).toBuffer();

    await db.$transaction([
      db.photo.update({
        where: { id: photoId },
        data: {
          status: "READY",
          width,
          height,
          variants,
          sha256: sha,
          duplicateOfId: dup?.id ?? null,
          blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
        },
      }),
      db.storageRecord.upsert({
        where: { key: storageKey(photo.originalKey, "derived-total") },
        create: { key: storageKey(photo.originalKey, "derived-total"), bytes: BigInt(derivedBytes), kind: "DERIVATIVE", studioId: photo.gallery.studioId, galleryId: photo.galleryId },
        update: { bytes: BigInt(derivedBytes) },
      }),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = /heif|heic|bad seek|unsupported image format/i.test(msg)
      ? "This server's image library could not decode the file (HEIC needs libheif with HEVC). Please export as JPEG."
      : msg.slice(0, 300);
    await db.photo.update({ where: { id: photoId }, data: { status: "FAILED", error: friendly } });
    throw err;
  } finally {
    await tmp.cleanup();
  }
}

/** Builds a watermarked copy of a derivative on first request and caches it in storage. */
export async function ensureWatermarked(sourceKey: string, text: string) {
  const wmKey = sourceKey.replace(/\.webp$/, ".wm.webp");
  if (await storage.stat(wmKey)) return wmKey;
  const tmp = await storage.toTempFile(sourceKey);
  try {
    const img = sharp(tmp.path);
    const { width = 1400, height = 900 } = await img.metadata();
    const size = Math.max(14, Math.round(width / 28));
    const safe = text.replace(/[<>&"']/g, "");
    const svg = Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="p" width="${size * 14}" height="${size * 7}" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
          <text x="0" y="${size * 2}" font-family="Georgia, serif" font-size="${size}" fill="white" fill-opacity="0.28" letter-spacing="${size / 4}">${safe}</text>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#p)"/>
      </svg>`,
    );
    const buf = await img.composite([{ input: svg }]).webp({ quality: 78 }).toBuffer();
    await storage.putBuffer(wmKey, buf, "image/webp");
    return wmKey;
  } finally {
    await tmp.cleanup();
  }
}

/** Thumbnail for guest uploads and grid-studio assets. */
export async function makePreview(key: string, width = 900) {
  const tmp = await storage.toTempFile(key);
  try {
    const img = sharp(tmp.path, { limitInputPixels: LIMIT_PIXELS, sequentialRead: true }).rotate();
    const meta = await img.metadata();
    const swap = (meta.orientation ?? 1) >= 5;
    const buf = await img.resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const previewKey = key.replace(/(\.[a-z0-9]+)?$/i, ".preview.webp");
    await storage.putBuffer(previewKey, buf, "image/webp");
    return { previewKey, width: (swap ? meta.height : meta.width) ?? 0, height: (swap ? meta.width : meta.height) ?? 0 };
  } finally {
    await tmp.cleanup();
  }
}

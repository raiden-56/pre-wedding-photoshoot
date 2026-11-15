import "server-only";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { enqueue } from "@/server/jobs";
import { makePreview } from "@/server/media/process";

/** Called once bytes are in storage (local route handler, or after a direct S3 PUT). */
export async function finalizePhotoUpload(photoId: string) {
  const photo = await db.photo.findUnique({ where: { id: photoId }, include: { gallery: { select: { studioId: true } } } });
  if (!photo) throw new Error("Upload not found");
  if (photo.status !== "PENDING") return photo;
  const s = await storage.stat(photo.originalKey);
  if (!s || s.size === 0) throw new Error("Uploaded file is missing");
  const updated = await db.photo.update({ where: { id: photoId }, data: { status: "UPLOADED", size: BigInt(s.size) } });
  await db.storageRecord.upsert({
    where: { key: photo.originalKey },
    create: { key: photo.originalKey, bytes: BigInt(s.size), kind: "ORIGINAL", studioId: photo.gallery.studioId, galleryId: photo.galleryId },
    update: { bytes: BigInt(s.size), deletedAt: null },
  });
  await enqueue("PROCESS_PHOTO", { photoId });
  return updated;
}

export async function finalizeGuestUpload(id: string) {
  const gu = await db.guestUpload.findUnique({ where: { id }, include: { gallery: { select: { studioId: true } } } });
  if (!gu) throw new Error("Upload not found");
  const s = await storage.stat(gu.key);
  if (!s || s.size === 0) throw new Error("Uploaded file is missing");
  await db.guestUpload.update({ where: { id }, data: { size: BigInt(s.size) } });
  await db.storageRecord.upsert({
    where: { key: gu.key },
    create: { key: gu.key, bytes: BigInt(s.size), kind: "GUEST", studioId: gu.gallery.studioId, galleryId: gu.galleryId },
    update: { bytes: BigInt(s.size) },
  });
  await enqueue("GUEST_UPLOAD_PREVIEW", { guestUploadId: id });
}

export async function finalizeGridAsset(id: string) {
  const asset = await db.gridAsset.findUnique({ where: { id } });
  if (!asset) throw new Error("Upload not found");
  const s = await storage.stat(asset.key);
  if (!s || s.size === 0) throw new Error("Uploaded file is missing");
  const { previewKey, width, height } = await makePreview(asset.key, 2000);
  return db.gridAsset.update({ where: { id }, data: { previewKey, width, height, size: s.size } });
}

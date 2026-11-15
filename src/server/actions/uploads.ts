"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { storage, uploadTarget } from "@/lib/storage";
import { extFromName, validateMedia } from "@/lib/media";
import type { ActionResult } from "@/lib/utils";
import { finalizePhotoUpload } from "@/server/uploads";
import { enqueue } from "@/server/jobs";
import { logActivity } from "@/server/activity";
import { notify, notifyStudio } from "@/server/notify";

export type UploadFileMeta = { clientKey: string; name: string; size: number; type: string; force?: boolean };
export type UploadTicket =
  | { clientKey: string; ok: true; photoId: string; url: string; direct: boolean; contentType: string }
  | { clientKey: string; ok: false; error: string; duplicate?: boolean };

async function ownedGallery(galleryId: string, studioId: string) {
  const g = await db.gallery.findFirst({ where: { id: galleryId, studioId } });
  if (!g) throw new Error("Gallery not found");
  return g;
}

/**
 * Validates files, detects duplicates (same name + size already in the gallery)
 * and issues short-lived signed upload URLs. No bytes pass through server memory.
 */
export async function createUploadTickets(galleryId: string, albumId: string | null, files: UploadFileMeta[]): Promise<UploadTicket[]> {
  const user = await requireStaff();
  const gallery = await ownedGallery(galleryId, user.studioId);
  if (albumId && !(await db.album.findFirst({ where: { id: albumId, galleryId } }))) throw new Error("Album not found");
  if (files.length > 200) throw new Error("Upload at most 200 files per batch");

  const existing = await db.photo.findMany({
    where: { galleryId, OR: files.map((f) => ({ filename: f.name, size: BigInt(f.size) })) },
    select: { filename: true, size: true },
  });
  const dupKeys = new Set(existing.map((e) => `${e.filename}:${e.size}`));
  const maxOrder = await db.photo.aggregate({ where: { galleryId, albumId }, _max: { order: true } });
  let order = (maxOrder._max.order ?? -1) + 1;

  const tickets: UploadTicket[] = [];
  for (const f of files) {
    const v = validateMedia(f);
    if (!v.ok) {
      tickets.push({ clientKey: f.clientKey, ok: false, error: v.error });
      continue;
    }
    if (!f.force && dupKeys.has(`${f.name}:${f.size}`)) {
      tickets.push({ clientKey: f.clientKey, ok: false, error: "Already in this gallery", duplicate: true });
      continue;
    }
    const photo = await db.photo.create({
      data: { galleryId, albumId, filename: f.name.slice(0, 200), mimeType: v.type, kind: v.kind, size: BigInt(f.size), originalKey: `pending/${crypto.randomUUID()}`, order: order++, uploadedById: user.id },
    });
    const key = `studios/${gallery.studioId}/galleries/${galleryId}/originals/${photo.id}${extFromName(f.name) || ".bin"}`;
    await db.photo.update({ where: { id: photo.id }, data: { originalKey: key } });
    const target = await uploadTarget("photo", photo.id, key, v.type);
    tickets.push({ clientKey: f.clientKey, ok: true, photoId: photo.id, url: target.url, direct: target.direct, contentType: v.type });
  }
  return tickets;
}

/** Re-issues a signed URL for a still-pending upload (retry after expiry / failure). */
export async function refreshUploadTicket(photoId: string): Promise<UploadTicket> {
  const user = await requireStaff();
  const photo = await db.photo.findFirst({ where: { id: photoId, gallery: { studioId: user.studioId } } });
  if (!photo || photo.status !== "PENDING") return { clientKey: photoId, ok: false, error: "Upload is no longer pending" };
  const target = await uploadTarget("photo", photo.id, photo.originalKey, photo.mimeType);
  return { clientKey: photoId, ok: true, photoId, url: target.url, direct: target.direct, contentType: photo.mimeType };
}

/** For direct-to-S3 uploads: confirm the object exists, then queue processing. */
export async function completeDirectUpload(photoId: string): Promise<ActionResult> {
  const user = await requireStaff();
  const photo = await db.photo.findFirst({ where: { id: photoId, gallery: { studioId: user.studioId } } });
  if (!photo) return { ok: false, error: "Upload not found" };
  await finalizePhotoUpload(photoId);
  return { ok: true };
}

export async function cancelUpload(photoId: string): Promise<ActionResult> {
  const user = await requireStaff();
  const photo = await db.photo.findFirst({ where: { id: photoId, gallery: { studioId: user.studioId } } });
  if (!photo) return { ok: true };
  if (photo.status === "PENDING") {
    await storage.delete(photo.originalKey).catch(() => {});
    await db.photo.delete({ where: { id: photoId } });
  }
  return { ok: true };
}

export async function getPhotoStatuses(ids: string[]) {
  const user = await requireStaff();
  const rows = await db.photo.findMany({ where: { id: { in: ids.slice(0, 300) }, gallery: { studioId: user.studioId } }, select: { id: true, status: true, error: true } });
  return rows;
}

export async function retryProcessing(photoId: string): Promise<ActionResult> {
  const user = await requireStaff();
  const photo = await db.photo.findFirst({ where: { id: photoId, gallery: { studioId: user.studioId } } });
  if (!photo || photo.status !== "FAILED") return { ok: false, error: "Nothing to retry" };
  await db.photo.update({ where: { id: photoId }, data: { status: "UPLOADED", error: null } });
  await enqueue("PROCESS_PHOTO", { photoId });
  return { ok: true, message: "Processing restarted" };
}

/** Called by the uploader when a batch finishes: activity log + notifications. */
export async function recordUploadBatch(galleryId: string, count: number): Promise<ActionResult> {
  const user = await requireStaff();
  const gallery = await ownedGallery(galleryId, user.studioId);
  if (count <= 0) return { ok: true };
  await logActivity({ studioId: user.studioId, galleryId, userId: user.id, actorLabel: user.name, action: "PHOTOS_UPLOADED", meta: { count } });
  await notifyStudio(user.studioId, { type: "PHOTOS_UPLOADED", title: `${count} file${count > 1 ? "s" : ""} uploaded to “${gallery.title}”`, link: `/admin/galleries/${galleryId}`, email: false });
  if (gallery.status === "PUBLISHED" && gallery.clientId) {
    const client = await db.client.findUnique({ where: { id: gallery.clientId }, select: { userId: true } });
    if (client?.userId) await notify({ userIds: [client.userId], type: "PHOTOS_UPLOADED", title: `New photographs in ${gallery.title}`, body: `${count} new file${count > 1 ? "s" : ""} were added to your gallery.`, link: `/gallery/${gallery.slug}` });
  }
  revalidatePath(`/admin/galleries/${galleryId}`);
  return { ok: true };
}

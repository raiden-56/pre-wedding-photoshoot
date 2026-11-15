import "server-only";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { extFromName } from "@/lib/media";
import { enqueue } from "@/server/jobs";

/** Approve or reject a guest upload. Approval copies the file into the gallery and queues processing. */
export async function moderateGuestUploadInternal(id: string, decision: "APPROVED" | "REJECTED") {
  const gu = await db.guestUpload.findUnique({ where: { id }, include: { gallery: { include: { settings: true } } } });
  if (!gu || gu.status !== "PENDING") return null;
  if (decision === "APPROVED") {
    const order = (await db.photo.aggregate({ where: { galleryId: gu.galleryId }, _max: { order: true } }))._max.order ?? 0;
    const photo = await db.photo.create({
      data: {
        galleryId: gu.galleryId,
        albumId: gu.gallery.settings?.guestUploadAlbumId ?? null,
        filename: gu.filename,
        mimeType: gu.mimeType,
        kind: gu.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE",
        size: gu.size,
        originalKey: `pending/${gu.id}`,
        order: order + 1,
        caption: gu.guestName ? `Shared by ${gu.guestName}` : "Shared by a guest",
        fromGuestUploadId: gu.id,
        status: "UPLOADED",
      },
    });
    const key = `studios/${gu.gallery.studioId}/galleries/${gu.galleryId}/originals/${photo.id}${extFromName(gu.filename) || ".jpg"}`;
    await storage.putStream(key, await storage.getStream(gu.key), gu.mimeType);
    await db.photo.update({ where: { id: photo.id }, data: { originalKey: key } });
    await enqueue("PROCESS_PHOTO", { photoId: photo.id });
  }
  return db.guestUpload.update({ where: { id }, data: { status: decision, reviewedAt: new Date() } });
}

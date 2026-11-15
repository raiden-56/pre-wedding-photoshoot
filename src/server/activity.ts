import "server-only";
import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/auth/session";

export const ACTIVITY_LABELS: Record<string, string> = {
  GALLERY_OPENED: "opened the gallery",
  PHOTO_VIEWED: "viewed a photograph",
  PHOTO_FAVORITED: "favorited a photograph",
  COMMENT_ADDED: "added a comment",
  SELECTION_SUBMITTED: "submitted a selection",
  DOWNLOAD_COMPLETED: "downloaded",
  GUEST_UPLOAD: "uploaded guest photographs",
  INVITE_SENT: "invited",
  INVITE_REVOKED: "revoked an invitation",
  GALLERY_PUBLISHED: "published the gallery",
  PHOTOS_UPLOADED: "uploaded photographs",
  ALBUM_DESIGN_SUBMITTED: "submitted an album design",
  SLIDESHOW_PLAYED: "played the slideshow",
};

export async function logActivity(input: {
  studioId: string;
  galleryId?: string | null;
  userId?: string | null;
  actorLabel: string;
  action: keyof typeof ACTIVITY_LABELS | string;
  photoId?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await db.activityLog.create({ data: { ...input, meta: input.meta ?? undefined } });
  } catch (e) {
    console.error("activity log failed", e);
  }
}

export async function audit(input: { studioId?: string | null; userId?: string | null; action: string; entity: string; entityId?: string; meta?: Prisma.InputJsonValue }) {
  let ip: string | undefined;
  try {
    ip = clientIp(await headers());
  } catch {
    ip = undefined;
  }
  try {
    await db.auditLog.create({ data: { ...input, ip } });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { FavoriteListKind, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { clientIp } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { randomToken, signValue, unsignValue } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { mediaUrl, validateMedia, extFromName } from "@/lib/media";
import { uploadTarget } from "@/lib/storage";
import { commentSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/utils";
import { favoriteOwner, GalleryAccessError, invitationCookie, passwordCookie, passwordFingerprint, pinCookie, requireGalleryPerm, resolveGalleryAccess } from "@/server/gallery-access";
import { logActivity } from "@/server/activity";
import { enqueue } from "@/server/jobs";
import { notify, notifyStudio, sendEmail } from "@/server/notify";

type R<T = unknown> = ActionResult<T>;
const fail = <T,>(e: unknown): R<T> => ({ ok: false, error: e instanceof GalleryAccessError ? e.message : e instanceof Error ? e.message : "Something went wrong" });
const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };

// ───────────── Access ─────────────

export async function unlockGallery(slug: string, password: string): Promise<R> {
  const ip = clientIp(await headers());
  if (!(await rateLimit(`gallery-pw:${ip}:${slug}`, 8, 900))) return { ok: false, error: "Too many attempts. Please wait 15 minutes." };
  const g = await db.gallery.findUnique({ where: { slug } });
  if (!g || g.visibility !== "PASSWORD" || !g.passwordHash || g.status !== "PUBLISHED") return { ok: false, error: "This gallery isn’t available." };
  if (!(await verifyPassword(password, g.passwordHash))) return { ok: false, error: "That password isn’t right." };
  (await cookies()).set(passwordCookie(g.id), signValue(passwordFingerprint(g.passwordHash)), cookieOpts);
  return { ok: true };
}

export async function recordGalleryOpen(slug: string) {
  const a = await resolveGalleryAccess({ slug });
  if (!a.ok || a.role === "STAFF") return;
  const recent = await db.activityLog.findFirst({ where: { galleryId: a.gallery.id, action: "GALLERY_OPENED", actorLabel: a.actor.label, createdAt: { gte: new Date(Date.now() - 6 * 3600_000) } } });
  if (!recent) await logActivity({ studioId: a.gallery.studioId, galleryId: a.gallery.id, userId: a.actor.userId, actorLabel: a.actor.label, action: "GALLERY_OPENED" });
}

export async function recordPhotoView(slug: string, photoId: string) {
  const a = await resolveGalleryAccess({ slug });
  if (!a.ok || a.role === "STAFF") return;
  const recent = await db.activityLog.findFirst({ where: { galleryId: a.gallery.id, action: "PHOTO_VIEWED", photoId, actorLabel: a.actor.label, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (!recent) await logActivity({ studioId: a.gallery.studioId, galleryId: a.gallery.id, userId: a.actor.userId, actorLabel: a.actor.label, action: "PHOTO_VIEWED", photoId });
}

// ───────────── Favourites & selections ─────────────

async function ensureList(access: Awaited<ReturnType<typeof requireGalleryPerm>>, listId?: string) {
  const owner = favoriteOwner(access);
  if (!owner) throw new GalleryAccessError("Favourites need a personal invitation or account.");
  if (listId) {
    const list = await db.favoriteList.findFirst({ where: { id: listId, galleryId: access.gallery.id, ...owner } });
    if (!list) throw new GalleryAccessError("List not found");
    return list;
  }
  const existing = await db.favoriteList.findFirst({ where: { galleryId: access.gallery.id, kind: "PERSONAL", ...owner } });
  return existing ?? db.favoriteList.create({ data: { galleryId: access.gallery.id, name: "My Favourites", kind: "PERSONAL", ...owner } });
}

export async function toggleFavorite(slug: string, photoId: string, listId?: string): Promise<R<{ favorited: boolean; listId: string }>> {
  try {
    const access = await requireGalleryPerm({ slug }, "favorite");
    const photo = await db.photo.findFirst({ where: { id: photoId, galleryId: access.gallery.id, hidden: false } });
    if (!photo) return { ok: false, error: "Photo not found" };
    const list = await ensureList(access, listId);
    if (list.submittedAt) return { ok: false, error: `“${list.name}” has been submitted and is locked.` };
    const existing = await db.favorite.findUnique({ where: { listId_photoId: { listId: list.id, photoId } } });
    if (existing) {
      await db.favorite.delete({ where: { id: existing.id } });
      return { ok: true, data: { favorited: false, listId: list.id } };
    }
    if (list.limit != null) {
      const count = await db.favorite.count({ where: { listId: list.id } });
      if (count >= list.limit) return { ok: false, error: `“${list.name}” is limited to ${list.limit} photographs. Remove one to add another.` };
    }
    await db.favorite.create({ data: { listId: list.id, photoId } });
    await logActivity({ studioId: access.gallery.studioId, galleryId: access.gallery.id, userId: access.actor.userId, actorLabel: access.actor.label, action: "PHOTO_FAVORITED", photoId, meta: { list: list.name } });
    return { ok: true, data: { favorited: true, listId: list.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function createFavoriteList(slug: string, name: string, kind: FavoriteListKind): Promise<R<{ id: string; limit: number | null }>> {
  try {
    const access = await requireGalleryPerm({ slug }, "favorite");
    const owner = favoriteOwner(access);
    if (!owner) return { ok: false, error: "Favourites need a personal invitation or account." };
    const clean = name.trim().slice(0, 60);
    if (!clean) return { ok: false, error: "Give your list a name" };
    const limit = kind === "ALBUM" ? access.settings.albumSelectionLimit : kind === "SOCIAL" ? access.settings.socialSelectionLimit : null;
    const count = await db.favoriteList.count({ where: { galleryId: access.gallery.id, ...owner } });
    if (count >= 20) return { ok: false, error: "You can have up to 20 lists" };
    const list = await db.favoriteList.create({ data: { galleryId: access.gallery.id, name: clean, kind, limit, ...owner } });
    return { ok: true, data: { id: list.id, limit: list.limit }, message: "List created" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteFavoriteList(slug: string, listId: string): Promise<R> {
  try {
    const access = await requireGalleryPerm({ slug }, "favorite");
    const list = await ensureList(access, listId);
    if (list.submittedAt) return { ok: false, error: "Submitted selections can’t be deleted" };
    await db.favoriteList.delete({ where: { id: list.id } });
    return { ok: true, message: "List deleted" };
  } catch (e) {
    return fail(e);
  }
}

export async function setFavoriteNote(slug: string, listId: string, photoId: string, note: string): Promise<R> {
  try {
    const access = await requireGalleryPerm({ slug }, "favorite");
    const list = await ensureList(access, listId);
    await db.favorite.updateMany({ where: { listId: list.id, photoId }, data: { note: note.trim().slice(0, 500) || null } });
    return { ok: true, message: "Note saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function submitSelection(slug: string, listId: string): Promise<R> {
  try {
    const access = await requireGalleryPerm({ slug }, "favorite");
    const list = await ensureList(access, listId);
    const count = await db.favorite.count({ where: { listId: list.id } });
    if (!count) return { ok: false, error: "Add photographs before submitting" };
    await db.favoriteList.update({ where: { id: list.id }, data: { submittedAt: new Date() } });
    await logActivity({ studioId: access.gallery.studioId, galleryId: access.gallery.id, userId: access.actor.userId, actorLabel: access.actor.label, action: "SELECTION_SUBMITTED", meta: { list: list.name, count } });
    await notifyStudio(access.gallery.studioId, { type: "SELECTION_SUBMITTED", title: `${access.actor.label} submitted “${list.name}”`, body: `${count} photographs · ${access.gallery.title}`, link: `/admin/galleries/${access.gallery.id}?tab=selections` });
    return { ok: true, message: "Selection submitted to the studio" };
  } catch (e) {
    return fail(e);
  }
}

export async function shareFavoriteList(slug: string, listId: string): Promise<R<{ url: string }>> {
  try {
    const access = await requireGalleryPerm({ slug }, "favorite");
    const list = await ensureList(access, listId);
    const token = list.shareToken ?? randomToken(12);
    if (!list.shareToken) await db.favoriteList.update({ where: { id: list.id }, data: { shareToken: token } });
    return { ok: true, data: { url: `${env.APP_URL}/gallery/${slug}/all?list=${token}` } };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Comments ─────────────

export async function addComment(slug: string, input: { photoId: string; body: string; parentId?: string; isEditRequest?: boolean; authorName?: string }): Promise<R<{ id: string }>> {
  try {
    const access = await requireGalleryPerm({ slug }, "comment");
    const d = commentSchema.parse(input);
    const ip = clientIp(await headers());
    if (!(await rateLimit(`comment:${ip}`, 30, 600))) return { ok: false, error: "You’re commenting very quickly — please wait a moment." };
    const photo = await db.photo.findFirst({ where: { id: d.photoId, galleryId: access.gallery.id } });
    if (!photo) return { ok: false, error: "Photo not found" };
    let parentId: string | undefined;
    if (d.parentId) {
      const parent = await db.comment.findFirst({ where: { id: d.parentId, photoId: photo.id } });
      parentId = parent ? parent.parentId ?? parent.id : undefined;
    }
    const authorName = access.role === "STAFF" ? `${access.actor.label.replace(" (studio)", "").split(" ")[0]} (studio)` : (d.authorName?.trim() || access.actor.label).slice(0, 60);
    const c = await db.comment.create({
      data: { galleryId: access.gallery.id, photoId: photo.id, parentId, body: d.body, isEditRequest: !!d.isEditRequest, authorName, authorUserId: access.actor.userId, invitationId: access.actor.invitationId, fromStudio: access.role === "STAFF" },
    });
    if (access.role !== "STAFF") {
      await logActivity({ studioId: access.gallery.studioId, galleryId: access.gallery.id, userId: access.actor.userId, actorLabel: authorName, action: "COMMENT_ADDED", photoId: photo.id });
      await notifyStudio(access.gallery.studioId, { type: "NEW_COMMENT", title: `${authorName} ${d.isEditRequest ? "requested an edit" : "commented"}`, body: `“${d.body.slice(0, 140)}” — ${access.gallery.title}`, link: `/admin/galleries/${access.gallery.id}?tab=comments` });
    } else if (access.gallery.client?.userId) {
      await notify({ userIds: [access.gallery.client.userId], type: "NEW_COMMENT", title: "The studio replied", body: d.body.slice(0, 140), link: `/gallery/${slug}/all?photo=${photo.id}` });
    }
    return { ok: true, data: { id: c.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function getComments(slug: string, photoId: string) {
  const access = await resolveGalleryAccess({ slug });
  if (!access.ok || !access.perms.view) return [];
  return db.comment.findMany({
    where: { galleryId: access.gallery.id, photoId, parentId: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, authorName: true, body: true, fromStudio: true, isEditRequest: true, resolvedAt: true, createdAt: true, authorUserId: true, invitationId: true, replies: { orderBy: { createdAt: "asc" }, select: { id: true, authorName: true, body: true, fromStudio: true, createdAt: true, authorUserId: true, invitationId: true } } },
  });
}

export async function deleteOwnComment(slug: string, commentId: string): Promise<R> {
  try {
    const access = await requireGalleryPerm({ slug }, "comment");
    const c = await db.comment.findFirst({ where: { id: commentId, galleryId: access.gallery.id } });
    if (!c) return { ok: false, error: "Not found" };
    const mine = access.role === "STAFF" || (c.authorUserId && c.authorUserId === access.actor.userId) || (c.invitationId && c.invitationId === access.actor.invitationId);
    if (!mine) return { ok: false, error: "You can only delete your own comments" };
    await db.comment.delete({ where: { id: commentId } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Downloads ─────────────

async function pinOk(galleryId: string, pinHash: string | null) {
  if (!pinHash) return true;
  return unsignValue((await cookies()).get(pinCookie(galleryId))?.value) === pinHash.slice(-16);
}

export async function verifyDownloadPin(slug: string, pin: string): Promise<R> {
  try {
    const access = await requireGalleryPerm({ slug }, "download");
    const ip = clientIp(await headers());
    if (!(await rateLimit(`pin:${ip}:${slug}`, 8, 900))) return { ok: false, error: "Too many attempts. Please wait 15 minutes." };
    const hash = access.settings.downloadPinHash;
    if (!hash || !(await verifyPassword(pin, hash))) return { ok: false, error: "Incorrect download PIN" };
    (await cookies()).set(pinCookie(access.gallery.id), signValue(hash.slice(-16)), { ...cookieOpts, maxAge: 60 * 60 * 12 });
    return { ok: true, message: "Downloads unlocked" };
  } catch (e) {
    return fail(e);
  }
}

export async function getPhotoDownload(slug: string, photoId: string): Promise<R<{ url: string }> & { needPin?: boolean }> {
  try {
    const access = await requireGalleryPerm({ slug }, "download");
    if (access.settings.downloadScope === "NONE" && access.role !== "STAFF") return { ok: false, error: "Downloads are disabled for this gallery" };
    if (access.role !== "STAFF" && !(await pinOk(access.gallery.id, access.settings.downloadPinHash))) return { ok: false, error: "Enter the download PIN", needPin: true };
    const photo = await db.photo.findFirst({ where: { id: photoId, galleryId: access.gallery.id, status: "READY", hidden: false } });
    if (!photo) return { ok: false, error: "Photo not available" };
    const high = access.role === "STAFF" || access.settings.downloadResolution === "HIGH" || photo.kind === "VIDEO";
    const h = await headers();
    await db.downloadRecord.create({ data: { galleryId: access.gallery.id, photoId, scope: "SINGLE", resolution: high ? "HIGH" : "WEB", userId: access.actor.userId, invitationId: access.actor.invitationId, actorLabel: access.actor.label, ip: clientIp(h) } });
    await logActivity({ studioId: access.gallery.studioId, galleryId: access.gallery.id, userId: access.actor.userId, actorLabel: access.actor.label, action: "DOWNLOAD_COMPLETED", photoId, meta: { scope: "single" } });
    return { ok: true, data: { url: mediaUrl("p", photo.id, high ? "original" : "large", { download: true, ttl: 600 }) } };
  } catch (e) {
    return fail(e);
  }
}

export async function requestZip(slug: string, scope: "ALBUM" | "FULL" | "SELECTION", ref?: string): Promise<R<{ archiveId: string }> & { needPin?: boolean }> {
  try {
    const access = await requireGalleryPerm({ slug }, "download");
    const allowed = access.settings.downloadScope;
    if (access.role !== "STAFF") {
      if (scope === "FULL" && allowed !== "FULL") return { ok: false, error: "Full-gallery downloads aren’t enabled" };
      if ((scope === "ALBUM" || scope === "SELECTION") && !["ALBUM", "FULL"].includes(allowed)) return { ok: false, error: "Album downloads aren’t enabled" };
      if (!(await pinOk(access.gallery.id, access.settings.downloadPinHash))) return { ok: false, error: "Enter the download PIN", needPin: true };
      const ip = clientIp(await headers());
      if (!(await rateLimit(`zip:${ip}`, 6, 3600))) return { ok: false, error: "Too many ZIP requests — please try again later." };
    }
    let albumId: string | undefined;
    let listId: string | undefined;
    if (scope === "ALBUM") {
      const album = await db.album.findFirst({ where: { id: ref, galleryId: access.gallery.id } });
      if (!album) return { ok: false, error: "Album not found" };
      albumId = album.id;
    }
    if (scope === "SELECTION") {
      const list = await db.favoriteList.findFirst({ where: { id: ref, galleryId: access.gallery.id } });
      if (!list) return { ok: false, error: "List not found" };
      listId = list.id;
    }
    const resolution = access.role === "STAFF" ? "HIGH" : access.settings.downloadResolution;
    const reuse = await db.downloadArchive.findFirst({ where: { galleryId: access.gallery.id, scope, albumId: albumId ?? null, listId: listId ?? null, resolution, status: { in: ["QUEUED", "PROCESSING", "READY"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], createdAt: { gt: new Date(Date.now() - 6 * 3600_000) } } });
    if (reuse && scope !== "SELECTION") return { ok: true, data: { archiveId: reuse.id } };
    const archive = await db.downloadArchive.create({ data: { galleryId: access.gallery.id, scope, albumId, listId, resolution, requestedBy: access.actor.label } });
    await enqueue("BUILD_ARCHIVE", { archiveId: archive.id });
    return { ok: true, data: { archiveId: archive.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function getArchive(slug: string, archiveId: string): Promise<R<{ status: string; url?: string; size?: number; count?: number; error?: string }>> {
  try {
    const access = await requireGalleryPerm({ slug }, "download");
    const ar = await db.downloadArchive.findFirst({ where: { id: archiveId, galleryId: access.gallery.id } });
    if (!ar) return { ok: false, error: "Not found" };
    if (ar.status !== "READY") return { ok: true, data: { status: ar.status, error: ar.error ?? undefined } };
    const h = await headers();
    await db.downloadRecord.create({ data: { galleryId: access.gallery.id, archiveId: ar.id, scope: ar.scope, resolution: ar.resolution, photoCount: ar.photoCount, userId: access.actor.userId, invitationId: access.actor.invitationId, actorLabel: access.actor.label, ip: clientIp(h) } });
    await logActivity({ studioId: access.gallery.studioId, galleryId: access.gallery.id, userId: access.actor.userId, actorLabel: access.actor.label, action: "DOWNLOAD_COMPLETED", meta: { scope: ar.scope.toLowerCase(), count: ar.photoCount } });
    if (access.role !== "STAFF") await notifyStudio(access.gallery.studioId, { type: "DOWNLOAD_COMPLETED", title: `${access.actor.label} downloaded ${ar.photoCount} photographs`, body: access.gallery.title, link: `/admin/galleries/${access.gallery.id}?tab=activity`, email: false });
    return { ok: true, data: { status: "READY", url: mediaUrl("x", ar.id, "zip", { download: true, ttl: 900 }), size: Number(ar.size ?? 0), count: ar.photoCount } };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Sharing & invitations ─────────────

export async function createInvitation(slug: string, input: { name: string; email?: string; phone?: string; kind: "INVITE" | "SHARE_LINK" | "UPLOAD_PORTAL"; canFavorite?: boolean; canComment?: boolean; canDownload?: boolean; canUpload?: boolean; password?: string; expiresAt?: string; sendEmail?: boolean }): Promise<R<{ url: string; id: string }>> {
  try {
    const access = await requireGalleryPerm({ slug }, "share");
    const name = input.name.trim().slice(0, 80);
    if (!name) return { ok: false, error: "Give this invitation a name" };
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return { ok: false, error: "Invalid email" };
    const count = await db.invitation.count({ where: { galleryId: access.gallery.id, revokedAt: null } });
    if (count >= 200) return { ok: false, error: "Invitation limit reached" };
    const portal = input.kind === "UPLOAD_PORTAL";
    const { hashPassword } = await import("@/lib/auth/password");
    const inv = await db.invitation.create({
      data: {
        galleryId: access.gallery.id,
        token: randomToken(24),
        kind: input.kind,
        name,
        email: input.email || null,
        phone: input.phone || null,
        canView: !portal,
        canFavorite: !portal && !!input.canFavorite,
        canComment: !portal && !!input.canComment,
        canDownload: !portal && !!input.canDownload,
        canUpload: portal || !!input.canUpload,
        passwordHash: input.password ? await hashPassword(input.password) : null,
        expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59`) : null,
        createdById: access.actor.userId,
      },
    });
    const url = `${env.APP_URL}/guest/${inv.token}`;
    if (input.sendEmail && input.email) {
      await sendEmail(input.email, `${access.gallery.coupleNames} shared their gallery with you`, `Hello ${name},\n\n${access.gallery.coupleNames} invited you to their private photo gallery “${access.gallery.title}”.\n\n${url}${input.password ? "\n\nYou’ll need the password they shared with you." : ""}`);
    }
    await logActivity({ studioId: access.gallery.studioId, galleryId: access.gallery.id, userId: access.actor.userId, actorLabel: access.actor.label, action: "INVITE_SENT", meta: { name, kind: input.kind } });
    revalidatePath(`/admin/galleries/${access.gallery.id}`);
    return { ok: true, data: { url, id: inv.id }, message: "Invitation created" };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeInvitation(slug: string, id: string): Promise<R> {
  try {
    const access = await requireGalleryPerm({ slug }, "share");
    const inv = await db.invitation.findFirst({ where: { id, galleryId: access.gallery.id } });
    if (!inv) return { ok: false, error: "Not found" };
    await db.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
    await logActivity({ studioId: access.gallery.studioId, galleryId: access.gallery.id, userId: access.actor.userId, actorLabel: access.actor.label, action: "INVITE_REVOKED", meta: { name: inv.name } });
    revalidatePath(`/admin/galleries/${access.gallery.id}`);
    return { ok: true, message: "Access revoked" };
  } catch (e) {
    return fail(e);
  }
}

export async function listInvitations(slug: string) {
  const access = await requireGalleryPerm({ slug }, "share");
  const rows = await db.invitation.findMany({ where: { galleryId: access.gallery.id }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, email: r.email, url: `${env.APP_URL}/guest/${r.token}`, revoked: !!r.revokedAt, expiresAt: r.expiresAt?.toISOString() ?? null, perms: { favorite: r.canFavorite, comment: r.canComment, download: r.canDownload, upload: r.canUpload }, useCount: r.useCount, lastUsedAt: r.lastUsedAt?.toISOString() ?? null }));
}

// ───────────── Guest uploads ─────────────

export async function createGuestUploadTickets(galleryRef: { slug: string } | { token: string }, files: { clientKey: string; name: string; size: number; type: string }[], guestName: string, message: string): Promise<R<{ tickets: { clientKey: string; ok: boolean; url?: string; error?: string; contentType?: string; guestUploadId?: string; direct?: boolean }[] }>> {
  try {
    let galleryId: string;
    let invitationId: string | null = null;
    if ("token" in galleryRef) {
      const inv = await db.invitation.findUnique({ where: { token: galleryRef.token } });
      if (!inv || inv.revokedAt || (inv.expiresAt && inv.expiresAt < new Date()) || !inv.canUpload) return { ok: false, error: "This upload link is no longer active." };
      galleryId = inv.galleryId;
      invitationId = inv.id;
    } else {
      const access = await requireGalleryPerm(galleryRef, "upload");
      galleryId = access.gallery.id;
      invitationId = access.actor.invitationId;
    }
    const gallery = await db.gallery.findUnique({ where: { id: galleryId }, include: { settings: true } });
    if (!gallery?.settings?.guestUploadsEnabled || gallery.status !== "PUBLISHED") return { ok: false, error: "Guest uploads are closed for this gallery." };
    const s = gallery.settings;
    if (files.length > s.guestUploadMaxFiles) return { ok: false, error: `You can upload up to ${s.guestUploadMaxFiles} files at a time.` };
    const ip = clientIp(await headers());
    if (!(await rateLimit(`guest-upload:${ip}:${galleryId}`, s.guestUploadMaxFiles * 3, 3600))) return { ok: false, error: "Upload limit reached for now — please try again in an hour." };

    const tickets = [];
    for (const f of files) {
      const v = validateMedia(f);
      if (!v.ok) {
        tickets.push({ clientKey: f.clientKey, ok: false, error: v.error });
        continue;
      }
      if (f.size > s.guestUploadMaxMb * 1024 * 1024) {
        tickets.push({ clientKey: f.clientKey, ok: false, error: `Larger than ${s.guestUploadMaxMb} MB` });
        continue;
      }
      const id = randomToken(12);
      const key = `studios/${gallery.studioId}/galleries/${galleryId}/guest/${id}${extFromName(f.name) || ".bin"}`;
      const gu = await db.guestUpload.create({ data: { galleryId, invitationId, guestName: guestName.trim().slice(0, 60) || null, message: message.trim().slice(0, 300) || null, filename: f.name.slice(0, 200), mimeType: v.type, size: 0n, key, ip, status: "PENDING" } });
      const target = await uploadTarget("guest", gu.id, key, v.type);
      tickets.push({ clientKey: f.clientKey, ok: true, url: target.url, contentType: v.type, guestUploadId: gu.id, direct: target.direct });
    }
    return { ok: true, data: { tickets } };
  } catch (e) {
    return fail(e);
  }
}

/** Called once a guest batch finishes. Auto-approves when moderation is off. */
export async function finishGuestBatch(galleryRef: { slug: string } | { token: string }, count: number, guestName: string): Promise<R> {
  try {
    let galleryId: string;
    if ("token" in galleryRef) {
      const inv = await db.invitation.findUnique({ where: { token: galleryRef.token } });
      if (!inv || inv.revokedAt) return { ok: false, error: "Link inactive" };
      galleryId = inv.galleryId;
    } else galleryId = (await requireGalleryPerm(galleryRef, "upload")).gallery.id;
    const gallery = await db.gallery.findUniqueOrThrow({ where: { id: galleryId }, include: { settings: true, client: true } });
    const label = guestName.trim() || "A guest";
    await logActivity({ studioId: gallery.studioId, galleryId, actorLabel: label, action: "GUEST_UPLOAD", meta: { count } });
    if (!gallery.settings?.guestUploadModerated) {
      const { moderateGuestUploadInternal } = await import("@/server/guest-moderation");
      const pending = await db.guestUpload.findMany({ where: { galleryId, status: "PENDING", size: { gt: 0 } } });
      for (const gu of pending) await moderateGuestUploadInternal(gu.id, "APPROVED");
    }
    await notifyStudio(gallery.studioId, { type: "GUEST_UPLOAD", title: `${label} shared ${count} file${count > 1 ? "s" : ""}`, body: gallery.settings?.guestUploadModerated ? `Awaiting your review · ${gallery.title}` : gallery.title, link: `/admin/galleries/${galleryId}?tab=guests` });
    if (gallery.client?.userId) await notify({ userIds: [gallery.client.userId], type: "GUEST_UPLOAD", title: `${label} shared photographs with you`, link: `/gallery/${gallery.slug}`, email: false });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** For direct-to-S3 guest uploads: confirm the object landed. */
export async function completeGuestDirectUpload(guestUploadId: string): Promise<R> {
  try {
    const gu = await db.guestUpload.findUnique({ where: { id: guestUploadId } });
    if (!gu || gu.size > 0n) return { ok: true };
    const { finalizeGuestUpload } = await import("@/server/uploads");
    await finalizeGuestUpload(guestUploadId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Album designer ─────────────

export async function saveAlbumDesign(slug: string, input: { id?: string; title: string; pages: { layout: string; photoIds: string[]; caption?: string }[]; note?: string; submit?: boolean }): Promise<R<{ id: string }>> {
  try {
    const access = await requireGalleryPerm({ slug }, "share");
    const ids = [...new Set(input.pages.flatMap((p) => p.photoIds))];
    const valid = await db.photo.count({ where: { id: { in: ids }, galleryId: access.gallery.id } });
    if (valid !== ids.length) return { ok: false, error: "Some photographs aren’t in this gallery" };
    const pages = input.pages.slice(0, 80).map((p) => ({ layout: p.layout.slice(0, 20), photoIds: p.photoIds.slice(0, 6), caption: p.caption?.slice(0, 200) })) as Prisma.InputJsonValue;
    const data = { title: input.title.trim().slice(0, 80) || "Our Album", pages, coupleNote: input.note?.slice(0, 1000) || null, ...(input.submit ? { status: "SUBMITTED" as const, submittedAt: new Date() } : {}) };
    let id = input.id;
    if (id) {
      const existing = await db.albumDesign.findFirst({ where: { id, galleryId: access.gallery.id } });
      if (!existing) return { ok: false, error: "Design not found" };
      if (existing.status === "APPROVED") return { ok: false, error: "This design is approved and locked" };
      await db.albumDesign.update({ where: { id }, data });
    } else id = (await db.albumDesign.create({ data: { ...data, galleryId: access.gallery.id } })).id;
    if (input.submit) {
      await logActivity({ studioId: access.gallery.studioId, galleryId: access.gallery.id, userId: access.actor.userId, actorLabel: access.actor.label, action: "ALBUM_DESIGN_SUBMITTED" });
      await notifyStudio(access.gallery.studioId, { type: "ALBUM_DESIGN", title: `Album design submitted: “${data.title}”`, body: access.gallery.title, link: `/admin/galleries/${access.gallery.id}?tab=albums` });
    }
    return { ok: true, data: { id }, message: input.submit ? "Submitted for the studio’s approval" : "Draft saved" };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Invitation entry ─────────────

/** Exchanges an invitation token (plus its password, if any) for a signed access cookie. */
export async function acceptInvitation(token: string, password?: string): Promise<R<{ slug: string }>> {
  try {
    const ip = clientIp(await headers());
    if (!(await rateLimit(`invite:${ip}`, 20, 900))) return { ok: false, error: "Too many attempts. Please wait 15 minutes." };
    const inv = await db.invitation.findUnique({ where: { token }, include: { gallery: { select: { id: true, slug: true, status: true } } } });
    if (!inv || inv.revokedAt || (inv.expiresAt && inv.expiresAt < new Date())) return { ok: false, error: "This invitation is no longer active." };
    if (inv.gallery.status !== "PUBLISHED") return { ok: false, error: "This gallery isn’t open yet." };
    if (inv.kind === "UPLOAD_PORTAL") return { ok: false, error: "This link is for sharing photographs only." };
    if (inv.passwordHash && !(password && (await verifyPassword(password, inv.passwordHash)))) return { ok: false, error: "That password isn’t right." };
    (await cookies()).set(invitationCookie(inv.gallery.id), signValue(inv.id), cookieOpts);
    await db.invitation.update({ where: { id: inv.id }, data: { useCount: { increment: 1 }, lastUsedAt: new Date() } });
    return { ok: true, data: { slug: inv.gallery.slug } };
  } catch (e) {
    return fail(e);
  }
}

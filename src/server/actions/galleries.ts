"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DownloadResolution, DownloadScope, GalleryVisibility } from "@prisma/client";
import { db } from "@/lib/db";
import { AuthError, requireStaff } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { gallerySchema, RESERVED_ALBUM_SLUGS } from "@/lib/validation";
import { slugify, type ActionResult } from "@/lib/utils";
import { storage } from "@/lib/storage";
import { moderateGuestUploadInternal } from "@/server/guest-moderation";
import { audit, logActivity } from "@/server/activity";
import { notify, sendEmail } from "@/server/notify";
import { env } from "@/lib/env";

type R = ActionResult<unknown>;
type Prev = R | undefined;
const fail = (e: unknown): R => {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
};

async function owned(galleryId: string) {
  const user = await requireStaff();
  const gallery = await db.gallery.findFirst({ where: { id: galleryId, studioId: user.studioId }, include: { settings: true, client: true } });
  if (!gallery) throw new Error("Gallery not found");
  return { user, gallery };
}

async function uniqueSlug(base: string) {
  let slug = slugify(base) || "gallery";
  for (let i = 2; await db.gallery.findUnique({ where: { slug } }); i++) slug = `${slugify(base)}-${i}`;
  return slug;
}

export async function createGallery(_: Prev, fd: FormData): Promise<R> {
  let id: string;
  try {
    const user = await requireStaff();
    const parsed = gallerySchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
    const d = parsed.data;
    if (d.clientId && !(await db.client.findFirst({ where: { id: d.clientId, studioId: user.studioId } }))) return { ok: false, error: "Client not found" };
    if (d.photoshootId && !(await db.photoshoot.findFirst({ where: { id: d.photoshootId, studioId: user.studioId } }))) return { ok: false, error: "Photoshoot not found" };
    if (d.slug && (await db.gallery.findUnique({ where: { slug: d.slug } }))) return { ok: false, error: "That address is taken", fieldErrors: { slug: ["Already in use"] } };
    const slug = d.slug || (await uniqueSlug(`${d.coupleNames} ${d.category === "Wedding" ? "wedding" : "love story"}`));
    const albums = String(fd.get("albums") ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 20);
    const g = await db.gallery.create({
      data: {
        studioId: user.studioId,
        clientId: d.clientId || null,
        photoshootId: d.photoshootId || null,
        slug,
        title: d.title,
        coupleNames: d.coupleNames,
        category: d.category,
        tagline: d.tagline || null,
        welcomeNote: d.welcomeNote || null,
        location: d.location || null,
        shootDate: d.shootDate ? new Date(d.shootDate) : null,
        settings: { create: {} },
        albums: {
          create: (albums.length ? albums : ["Highlights"]).map((title, order) => {
            let s = slugify(title) || `album-${order + 1}`;
            if (RESERVED_ALBUM_SLUGS.includes(s)) s = `${s}-album`;
            return { title, slug: s, order };
          }),
        },
      },
    });
    await audit({ studioId: user.studioId, userId: user.id, action: "create", entity: "Gallery", entityId: g.id });
    id = g.id;
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/galleries/${id}`);
}

export async function updateGalleryDetails(_: Prev, fd: FormData): Promise<R> {
  try {
    const { gallery } = await owned(String(fd.get("id")));
    const parsed = gallerySchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
    const d = parsed.data;
    if (d.slug && d.slug !== gallery.slug && (await db.gallery.findUnique({ where: { slug: d.slug } }))) return { ok: false, error: "That address is taken", fieldErrors: { slug: ["Already in use"] } };
    await db.gallery.update({
      where: { id: gallery.id },
      data: { title: d.title, coupleNames: d.coupleNames, slug: d.slug || gallery.slug, category: d.category, tagline: d.tagline || null, welcomeNote: d.welcomeNote || null, location: d.location || null, shootDate: d.shootDate ? new Date(d.shootDate) : null, clientId: d.clientId || null, photoshootId: d.photoshootId || null },
    });
    revalidatePath(`/admin/galleries/${gallery.id}`);
    return { ok: true, message: "Gallery details saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateGallerySettings(_: Prev, fd: FormData): Promise<R> {
  try {
    const { user, gallery } = await owned(String(fd.get("id")));
    const on = (k: string) => fd.get(k) === "on";
    const num = (k: string, def: number | null) => {
      const v = String(fd.get(k) ?? "").trim();
      if (!v) return def;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : def;
    };
    const date = (k: string) => {
      const v = String(fd.get(k) ?? "");
      return v ? new Date(`${v}T23:59:59`) : null;
    };
    const visibility = (String(fd.get("visibility") ?? "PRIVATE") as GalleryVisibility);
    const password = String(fd.get("password") ?? "");
    if (visibility === "PASSWORD" && !password && !gallery.passwordHash) return { ok: false, error: "Set a gallery password", fieldErrors: { password: ["Required for password-protected galleries"] } };
    const pin = String(fd.get("downloadPin") ?? "");
    if (pin && !/^\d{4,8}$/.test(pin)) return { ok: false, error: "Download PIN must be 4–8 digits", fieldErrors: { downloadPin: ["4–8 digits"] } };
    const guestAlbumId = String(fd.get("guestUploadAlbumId") ?? "") || null;
    if (guestAlbumId && !(await db.album.findFirst({ where: { id: guestAlbumId, galleryId: gallery.id } }))) return { ok: false, error: "Album not found" };

    await db.gallery.update({
      where: { id: gallery.id },
      data: {
        visibility,
        passwordHash: visibility !== "PASSWORD" ? null : password ? await hashPassword(password) : gallery.passwordHash,
        expiresAt: date("expiresAt"),
        expiryReminderSentAt: null,
      },
    });
    const settings = {
      downloadScope: String(fd.get("downloadScope") ?? "SINGLE") as DownloadScope,
      downloadResolution: String(fd.get("downloadResolution") ?? "WEB") as DownloadResolution,
      downloadPinHash: fd.get("clearPin") === "on" ? null : pin ? await hashPassword(pin) : gallery.settings?.downloadPinHash ?? null,
      downloadExpiresAt: date("downloadExpiresAt"),
      watermarkPreviews: on("watermarkPreviews"),
      allowFavorites: on("allowFavorites"),
      allowComments: on("allowComments"),
      linkCanDownload: on("linkCanDownload"),
      guestUploadsEnabled: on("guestUploadsEnabled"),
      guestUploadAlbumId: guestAlbumId,
      guestUploadMaxFiles: num("guestUploadMaxFiles", 20) ?? 20,
      guestUploadMaxMb: Math.min(200, num("guestUploadMaxMb", 25) ?? 25),
      guestUploadModerated: on("guestUploadModerated"),
      albumSelectionLimit: num("albumSelectionLimit", null),
      socialSelectionLimit: num("socialSelectionLimit", null),
      showCountdown: on("showCountdown"),
      countdownDate: date("countdownDate"),
      slideshowSeconds: Math.min(20, Math.max(2, num("slideshowSeconds", 5) ?? 5)),
      slideshowMusicUrl: String(fd.get("slideshowMusicUrl") ?? "").trim() || null,
      defaultView: ["masonry", "grid", "editorial"].includes(String(fd.get("defaultView"))) ? String(fd.get("defaultView")) : "masonry",
    };
    await db.gallerySettings.upsert({ where: { galleryId: gallery.id }, create: { galleryId: gallery.id, ...settings }, update: settings });
    await audit({ studioId: user.studioId, userId: user.id, action: "settings", entity: "Gallery", entityId: gallery.id });
    revalidatePath(`/admin/galleries/${gallery.id}`);
    return { ok: true, message: "Gallery settings saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function setGalleryStatus(galleryId: string, status: "PUBLISHED" | "DRAFT" | "ARCHIVED"): Promise<R> {
  try {
    const { user, gallery } = await owned(galleryId);
    const ready = await db.photo.count({ where: { galleryId, status: "READY" } });
    if (status === "PUBLISHED" && !ready) return { ok: false, error: "Upload at least one photograph before publishing." };
    await db.gallery.update({
      where: { id: galleryId },
      data: { status, publishedAt: status === "PUBLISHED" ? gallery.publishedAt ?? new Date() : gallery.publishedAt, archivedAt: status === "ARCHIVED" ? new Date() : null, coverPhotoId: gallery.coverPhotoId ?? (status === "PUBLISHED" ? (await db.photo.findFirst({ where: { galleryId, status: "READY", kind: "IMAGE" }, orderBy: { order: "asc" } }))?.id : undefined) },
    });
    if (status === "PUBLISHED" && gallery.status !== "PUBLISHED") {
      await logActivity({ studioId: user.studioId, galleryId, userId: user.id, actorLabel: user.name, action: "GALLERY_PUBLISHED" });
      if (gallery.photoshootId) await db.photoshoot.updateMany({ where: { id: gallery.photoshootId, status: { in: ["EDITING", "READY_FOR_REVIEW", "IN_PROGRESS", "UPCOMING", "CONFIRMED"] } }, data: { status: "DELIVERED" } });
      const link = `/gallery/${gallery.slug}`;
      if (gallery.client?.userId) await notify({ userIds: [gallery.client.userId], type: "GALLERY_PUBLISHED", title: "Your gallery is ready ✨", body: `${ready} photographs from ${gallery.title} are waiting for you.`, link });
      else {
        for (const email of [gallery.client?.partner1Email, gallery.client?.partner2Email].filter(Boolean) as string[]) await sendEmail(email, "Your gallery is ready", `${gallery.title}\n\n${env.APP_URL}${link}`);
      }
    }
    await audit({ studioId: user.studioId, userId: user.id, action: `status:${status}`, entity: "Gallery", entityId: galleryId });
    revalidatePath(`/admin/galleries/${galleryId}`);
    revalidatePath("/admin/galleries");
    return { ok: true, message: status === "PUBLISHED" ? "Gallery published — the couple has been notified" : status === "ARCHIVED" ? "Gallery archived (photographs are kept)" : "Gallery moved to draft" };
  } catch (e) {
    return fail(e);
  }
}

/** Permanent deletion: admin only, gallery must already be archived, and the slug must be typed to confirm. */
export async function deleteGalleryPermanently(galleryId: string, confirmSlug: string): Promise<R> {
  try {
    const user = await requireStaff({ adminOnly: true });
    const gallery = await db.gallery.findFirst({ where: { id: galleryId, studioId: user.studioId } });
    if (!gallery) return { ok: false, error: "Gallery not found" };
    if (gallery.status !== "ARCHIVED") return { ok: false, error: "Archive the gallery first. Deletion is only possible for archived galleries." };
    if (confirmSlug !== gallery.slug) return { ok: false, error: "Type the gallery address exactly to confirm." };
    const records = await db.storageRecord.findMany({ where: { galleryId }, select: { key: true } });
    const photos = await db.photo.findMany({ where: { galleryId }, select: { originalKey: true, variants: true } });
    const keys = new Set<string>([...records.map((r) => r.key), ...photos.flatMap((p) => [p.originalKey, ...Object.values((p.variants ?? {}) as Record<string, string>)])]);
    for (const k of keys) if (!k.includes("derived-total")) await storage.delete(k).catch(() => {});
    for (const p of photos) for (const v of Object.values((p.variants ?? {}) as Record<string, string>)) await storage.delete(v.replace(/\.webp$/, ".wm.webp")).catch(() => {});
    await db.gallery.delete({ where: { id: galleryId } });
    await audit({ studioId: user.studioId, userId: user.id, action: "delete-permanently", entity: "Gallery", entityId: galleryId, meta: { slug: gallery.slug, files: keys.size } });
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/galleries");
}

// ───────────── Albums & photos ─────────────

export async function createAlbum(galleryId: string, title: string): Promise<R> {
  try {
    await owned(galleryId);
    const clean = title.trim().slice(0, 80);
    if (!clean) return { ok: false, error: "Album name is required" };
    let slug = slugify(clean) || "album";
    if (RESERVED_ALBUM_SLUGS.includes(slug)) slug = `${slug}-album`;
    for (let i = 2; await db.album.findUnique({ where: { galleryId_slug: { galleryId, slug } } }); i++) slug = `${slugify(clean)}-${i}`;
    const order = await db.album.count({ where: { galleryId } });
    await db.album.create({ data: { galleryId, title: clean, slug, order } });
    revalidatePath(`/admin/galleries/${galleryId}`);
    return { ok: true, message: "Album created" };
  } catch (e) {
    return fail(e);
  }
}

export async function renameAlbum(albumId: string, title: string, description: string): Promise<R> {
  try {
    const album = await db.album.findUnique({ where: { id: albumId } });
    if (!album) return { ok: false, error: "Album not found" };
    await owned(album.galleryId);
    await db.album.update({ where: { id: albumId }, data: { title: title.trim().slice(0, 80) || album.title, description: description.trim().slice(0, 500) || null } });
    revalidatePath(`/admin/galleries/${album.galleryId}`);
    return { ok: true, message: "Album updated" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAlbum(albumId: string): Promise<R> {
  try {
    const album = await db.album.findUnique({ where: { id: albumId } });
    if (!album) return { ok: false, error: "Album not found" };
    await owned(album.galleryId);
    // photographs are kept and become "unsorted" — never deleted implicitly
    await db.$transaction([db.photo.updateMany({ where: { albumId }, data: { albumId: null } }), db.album.delete({ where: { id: albumId } })]);
    revalidatePath(`/admin/galleries/${album.galleryId}`);
    return { ok: true, message: "Album removed — its photographs moved to Unsorted" };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderAlbums(galleryId: string, ids: string[]): Promise<R> {
  try {
    await owned(galleryId);
    await db.$transaction(ids.map((id, order) => db.album.updateMany({ where: { id, galleryId }, data: { order } })));
    revalidatePath(`/admin/galleries/${galleryId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderPhotos(galleryId: string, ids: string[]): Promise<R> {
  try {
    await owned(galleryId);
    await db.$transaction(ids.slice(0, 2000).map((id, order) => db.photo.updateMany({ where: { id, galleryId }, data: { order } })));
    revalidatePath(`/admin/galleries/${galleryId}`);
    return { ok: true, message: "Order saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function photoBulkAction(galleryId: string, ids: string[], action: "move" | "hide" | "show" | "delete" | "cover", albumId?: string | null): Promise<R> {
  try {
    const { user } = await owned(galleryId);
    const where = { id: { in: ids }, galleryId };
    if (action === "move") {
      if (albumId && !(await db.album.findFirst({ where: { id: albumId, galleryId } }))) return { ok: false, error: "Album not found" };
      await db.photo.updateMany({ where, data: { albumId: albumId ?? null } });
    } else if (action === "hide" || action === "show") await db.photo.updateMany({ where, data: { hidden: action === "hide" } });
    else if (action === "cover") {
      const p = await db.photo.findFirst({ where: { id: ids[0], galleryId, kind: "IMAGE", status: "READY" } });
      if (!p) return { ok: false, error: "Choose a processed photograph" };
      await db.gallery.update({ where: { id: galleryId }, data: { coverPhotoId: p.id } });
    } else if (action === "delete") {
      const photos = await db.photo.findMany({ where });
      for (const p of photos) {
        await storage.delete(p.originalKey).catch(() => {});
        for (const v of Object.values((p.variants ?? {}) as Record<string, string>)) {
          await storage.delete(v).catch(() => {});
          await storage.delete(v.replace(/\.webp$/, ".wm.webp")).catch(() => {});
        }
        await db.storageRecord.updateMany({ where: { key: p.originalKey }, data: { deletedAt: new Date() } });
      }
      await db.photo.deleteMany({ where });
      await audit({ studioId: user.studioId, userId: user.id, action: "delete-photos", entity: "Gallery", entityId: galleryId, meta: { count: photos.length, files: photos.map((p) => p.filename) } });
    }
    revalidatePath(`/admin/galleries/${galleryId}`);
    return { ok: true, message: { move: "Moved", hide: "Hidden from the couple", show: "Visible again", delete: `${ids.length} file(s) permanently deleted`, cover: "Cover updated" }[action] };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Guests, comments, album designs ─────────────

export async function moderateGuestUpload(id: string, decision: "APPROVED" | "REJECTED"): Promise<R> {
  try {
    const gu = await db.guestUpload.findUnique({ where: { id } });
    if (!gu) return { ok: false, error: "Upload not found" };
    const { user } = await owned(gu.galleryId);
    if (gu.status !== "PENDING") return { ok: false, error: "Already reviewed" };
    await moderateGuestUploadInternal(id, decision);
    await audit({ studioId: user.studioId, userId: user.id, action: `guest-upload:${decision}`, entity: "GuestUpload", entityId: id });
    revalidatePath(`/admin/galleries/${gu.galleryId}`);
    return { ok: true, message: decision === "APPROVED" ? "Approved — added to the gallery" : "Rejected" };
  } catch (e) {
    return fail(e);
  }
}

export async function staffReply(_: Prev, fd: FormData): Promise<R> {
  try {
    const parent = await db.comment.findUnique({ where: { id: String(fd.get("parentId")) }, include: { gallery: { include: { client: true } } } });
    if (!parent) return { ok: false, error: "Comment not found" };
    const { user } = await owned(parent.galleryId);
    const body = String(fd.get("body") ?? "").trim().slice(0, 1500);
    if (!body) return { ok: false, error: "Write a reply", fieldErrors: { body: ["Required"] } };
    await db.comment.create({ data: { galleryId: parent.galleryId, photoId: parent.photoId, parentId: parent.parentId ?? parent.id, authorUserId: user.id, authorName: `${user.name.split(" ")[0]} (studio)`, fromStudio: true, body } });
    if (parent.gallery.client?.userId) await notify({ userIds: [parent.gallery.client.userId], type: "NEW_COMMENT", title: "The studio replied to your comment", body, link: `/gallery/${parent.gallery.slug}/all?photo=${parent.photoId}` });
    revalidatePath(`/admin/galleries/${parent.galleryId}`);
    return { ok: true, message: "Reply posted" };
  } catch (e) {
    return fail(e);
  }
}

export async function resolveComment(id: string, resolved: boolean): Promise<R> {
  try {
    const c = await db.comment.findUnique({ where: { id } });
    if (!c) return { ok: false, error: "Not found" };
    await owned(c.galleryId);
    await db.comment.update({ where: { id }, data: { resolvedAt: resolved ? new Date() : null } });
    revalidatePath(`/admin/galleries/${c.galleryId}`);
    return { ok: true, message: resolved ? "Marked resolved" : "Reopened" };
  } catch (e) {
    return fail(e);
  }
}

export async function reviewAlbumDesign(id: string, status: "APPROVED" | "CHANGES_REQUESTED", note: string): Promise<R> {
  try {
    const design = await db.albumDesign.findUnique({ where: { id }, include: { gallery: { include: { client: true } } } });
    if (!design) return { ok: false, error: "Not found" };
    await owned(design.galleryId);
    await db.albumDesign.update({ where: { id }, data: { status, photographerNote: note.slice(0, 2000) || null, reviewedAt: new Date() } });
    if (design.gallery.client?.userId) await notify({ userIds: [design.gallery.client.userId], type: "ALBUM_DESIGN", title: status === "APPROVED" ? "Your album design is approved" : "Suggested changes to your album", body: note || design.title, link: `/gallery/${design.gallery.slug}/album-designer?design=${id}` });
    revalidatePath(`/admin/galleries/${design.galleryId}`);
    return { ok: true, message: status === "APPROVED" ? "Album approved" : "Changes requested" };
  } catch (e) {
    return fail(e);
  }
}

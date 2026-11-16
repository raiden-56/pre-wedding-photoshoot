"use server";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff, requireUser, type SessionUser } from "@/lib/auth/session";
import { mediaUrl, extFromName, IMAGE_TYPES, normaliseMime } from "@/lib/media";
import { uploadTarget } from "@/lib/storage";
import { randomToken } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/utils";
import type { DesignState, ImageRef } from "@/lib/grid/types";

type R<T = undefined> = ActionResult<T>;
const fail = <T,>(e: unknown): R<T> => ({ ok: false, error: e instanceof Error ? e.message : "Something went wrong" });
const TTL = 60 * 60 * 6;

/** Galleries the signed-in person may use photos from: staff → their studio, couples → their own. */
async function accessibleGalleryWhere(user: SessionUser): Promise<Prisma.GalleryWhereInput | null> {
  if (isStaff(user)) return { studioId: user.studioId };
  if (user.clientId) return { client: { userId: user.id }, status: "PUBLISHED" };
  return null;
}

function photoRef(p: { id: string; width: number | null; height: number | null; filename: string }): ImageRef {
  return { source: "photo", id: p.id, src: mediaUrl("p", p.id, "medium", { ttl: TTL }), fullSrc: mediaUrl("p", p.id, "large", { ttl: TTL }), width: p.width ?? 1600, height: p.height ?? 1067, name: p.filename };
}
function assetRef(a: { id: string; width: number; height: number; filename: string }): ImageRef {
  return { source: "asset", id: a.id, src: mediaUrl("a", a.id, "preview", { ttl: TTL }), fullSrc: mediaUrl("a", a.id, "original", { ttl: TTL }), width: a.width, height: a.height, name: a.filename };
}

export async function getGridSources(): Promise<{ signedIn: boolean; name: string | null; galleries: { id: string; title: string; photos: ImageRef[] }[]; uploads: ImageRef[] }> {
  const user = await getCurrentUser();
  if (!user) return { signedIn: false, name: null, galleries: [], uploads: [] };
  const where = await accessibleGalleryWhere(user);
  const [galleries, assets] = await Promise.all([
    where
      ? db.gallery.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: 12,
          select: { id: true, title: true, photos: { where: { status: "READY", hidden: false, kind: "IMAGE" }, orderBy: { order: "asc" }, take: 200, select: { id: true, width: true, height: true, filename: true } } },
        })
      : [],
    db.gridAsset.findMany({ where: { ownerId: user.id, size: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 60 }),
  ]);
  return {
    signedIn: true,
    name: user.name,
    galleries: galleries.filter((g) => g.photos.length).map((g) => ({ id: g.id, title: g.title, photos: g.photos.map(photoRef) })),
    uploads: assets.map(assetRef),
  };
}

export async function createGridAsset(file: { name: string; size: number; type: string }): Promise<R<{ id: string; url: string; direct: boolean; contentType: string }>> {
  try {
    const user = await requireUser();
    if (!(await rateLimit(`grid-asset:${user.id}`, 120, 3600))) return { ok: false, error: "Upload limit reached — try again in an hour." };
    const type = normaliseMime(file.type, file.name);
    if (!(IMAGE_TYPES as readonly string[]).includes(type)) return { ok: false, error: "Only JPEG, PNG, WebP or HEIC images" };
    if (file.size <= 0 || file.size > 40 * 1024 * 1024) return { ok: false, error: "Images must be under 40 MB" };
    const token = randomToken(12);
    const key = `users/${user.id}/grid/${token}${extFromName(file.name) || ".jpg"}`;
    const asset = await db.gridAsset.create({ data: { ownerId: user.id, key, filename: file.name.slice(0, 200), mimeType: type, width: 0, height: 0, size: 0 } });
    const target = await uploadTarget("asset", asset.id, key, type);
    return { ok: true, data: { id: asset.id, url: target.url, direct: target.direct, contentType: type } };
  } catch (e) {
    return fail(e);
  }
}

/** After the bytes land: (for direct S3 uploads) build the preview, then return a usable image ref. */
export async function finishGridAsset(id: string): Promise<R<ImageRef>> {
  try {
    const user = await requireUser();
    let asset = await db.gridAsset.findFirst({ where: { id, ownerId: user.id } });
    if (!asset) return { ok: false, error: "Upload not found" };
    if (asset.size === 0) {
      const { finalizeGridAsset } = await import("@/server/uploads");
      asset = await finalizeGridAsset(id);
    }
    return { ok: true, data: assetRef(asset) };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Saved designs ─────────────

/** Re-mint signed URLs for every account-backed image in a stored design. */
async function refreshState(state: DesignState, ownerId: string): Promise<DesignState> {
  const photoIds = state.cells.flatMap((c) => (c.image?.source === "photo" ? [c.image.id] : []));
  const assetIds = state.cells.flatMap((c) => (c.image?.source === "asset" ? [c.image.id] : []));
  const [photos, assets] = await Promise.all([
    photoIds.length ? db.photo.findMany({ where: { id: { in: photoIds }, status: "READY" }, select: { id: true, width: true, height: true, filename: true } }) : [],
    assetIds.length ? db.gridAsset.findMany({ where: { id: { in: assetIds }, ownerId } }) : [],
  ]);
  const pm = new Map(photos.map((p) => [p.id, photoRef(p)]));
  const am = new Map(assets.map((a) => [a.id, assetRef(a)]));
  return {
    ...state,
    cells: state.cells.map((c) => {
      if (!c.image) return c;
      if (c.image.source === "photo") return { ...c, image: pm.get(c.image.id) ?? null };
      if (c.image.source === "asset") return { ...c, image: am.get(c.image.id) ?? null };
      if (c.image.source === "local") return { ...c, image: null };
      return c;
    }),
  };
}

export async function saveGridDesign(input: { id?: string; name: string; state: DesignState }): Promise<R<{ id: string }>> {
  try {
    const user = await requireUser();
    const state = input.state;
    if (state?.version !== 1 || !Array.isArray(state.cells) || state.cells.length > 40) return { ok: false, error: "Invalid design" };
    const tpl = await db.gridTemplate.findUnique({ where: { id: state.templateId } });
    if (!tpl) return { ok: false, error: "Unknown template" };

    // ownership checks for every referenced image
    const photoIds = [...new Set(state.cells.flatMap((c) => (c.image?.source === "photo" ? [c.image.id] : [])))];
    const assetIds = [...new Set(state.cells.flatMap((c) => (c.image?.source === "asset" ? [c.image.id] : [])))];
    const where = await accessibleGalleryWhere(user);
    if (photoIds.length) {
      const ok = where ? await db.photo.count({ where: { id: { in: photoIds }, gallery: where } }) : 0;
      if (ok !== photoIds.length) return { ok: false, error: "Some photographs aren’t available to your account" };
    }
    if (assetIds.length) {
      const ok = await db.gridAsset.count({ where: { id: { in: assetIds }, ownerId: user.id } });
      if (ok !== assetIds.length) return { ok: false, error: "Some uploads don’t belong to your account" };
    }

    // never persist expiring signed URLs or device-only blobs
    const clean: DesignState = {
      ...state,
      cells: state.cells.map((c) => (c.image && (c.image.source === "photo" || c.image.source === "asset") ? { ...c, image: { ...c.image, src: "", fullSrc: "" } } : c.image?.source === "local" ? { ...c, image: null } : c)),
    };
    const name = input.name.trim().slice(0, 80) || "Untitled design";
    const data = { name, templateId: tpl.id, state: clean as unknown as Prisma.InputJsonValue, ...(input.id ? {} : { ownerId: user.id }) };

    let id = input.id;
    if (id) {
      const existing = await db.gridDesign.findFirst({ where: { id, ownerId: user.id } });
      if (!existing) return { ok: false, error: "Design not found" };
      await db.gridDesign.update({ where: { id }, data });
    } else {
      const count = await db.gridDesign.count({ where: { ownerId: user.id } });
      if (count >= 200) return { ok: false, error: "You have 200 saved designs — delete some to save more." };
      id = (await db.gridDesign.create({ data: { ...data, ownerId: user.id } })).id;
    }
    await db.gridDesignImage.deleteMany({ where: { designId: id } });
    const rows = state.cells.flatMap((c, i) => (c.image && (c.image.source === "photo" || c.image.source === "asset") ? [{ designId: id!, cellIndex: i, photoId: c.image.source === "photo" ? c.image.id : null, assetId: c.image.source === "asset" ? c.image.id : null, transform: c.transform as unknown as Prisma.InputJsonValue }] : []));
    if (rows.length) await db.gridDesignImage.createMany({ data: rows });
    return { ok: true, data: { id }, message: "Design saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function listGridDesigns() {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.gridDesign.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 60, select: { id: true, name: true, templateId: true, updatedAt: true } });
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}

export async function loadGridDesign(id: string): Promise<R<{ id: string; name: string; state: DesignState }>> {
  try {
    const user = await requireUser();
    const d = await db.gridDesign.findFirst({ where: { id, ownerId: user.id } });
    if (!d) return { ok: false, error: "Design not found" };
    return { ok: true, data: { id: d.id, name: d.name, state: await refreshState(d.state as unknown as DesignState, user.id) } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteGridDesign(id: string): Promise<R> {
  try {
    const user = await requireUser();
    const r = await db.gridDesign.deleteMany({ where: { id, ownerId: user.id } });
    return r.count ? { ok: true, message: "Design deleted" } : { ok: false, error: "Design not found" };
  } catch (e) {
    return fail(e);
  }
}

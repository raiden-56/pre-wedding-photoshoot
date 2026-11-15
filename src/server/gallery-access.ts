import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Gallery, GallerySettings, Invitation } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth/session";
import { sha256, unsignValue } from "@/lib/crypto";

export type GalleryPerms = {
  view: boolean;
  favorite: boolean;
  comment: boolean;
  download: boolean;
  upload: boolean;
  /** invite/revoke family, submit selections, design albums */
  share: boolean;
  manage: boolean;
};

export type GalleryActor = {
  userId: string | null;
  invitationId: string | null;
  label: string;
};

type LoadedGallery = Gallery & {
  settings: GallerySettings | null;
  client: { id: string; userId: string | null; partner1Name: string; partner2Name: string } | null;
};

export type GalleryAccess =
  | { ok: true; gallery: LoadedGallery; settings: GallerySettings; role: "STAFF" | "COUPLE" | "INVITEE" | "LINK"; perms: GalleryPerms; actor: GalleryActor; invitation: Invitation | null }
  | { ok: false; reason: "not-found" | "unpublished" | "expired" | "archived" | "password" | "login"; gallery: LoadedGallery | null };

const NONE: GalleryPerms = { view: false, favorite: false, comment: false, download: false, upload: false, share: false, manage: false };

export const invitationCookie = (galleryId: string) => `gi_${galleryId}`;
export const passwordCookie = (galleryId: string) => `gp_${galleryId}`;
export const pinCookie = (galleryId: string) => `gd_${galleryId}`;
/** Ties a password cookie to the current password so changing it revokes old access. */
export const passwordFingerprint = (hash: string) => sha256(hash).slice(0, 16);

export const defaultSettings = (galleryId: string): GallerySettings =>
  ({
    id: "",
    galleryId,
    downloadScope: "SINGLE",
    downloadResolution: "WEB",
    downloadPinHash: null,
    downloadExpiresAt: null,
    watermarkPreviews: false,
    allowFavorites: true,
    allowComments: true,
    linkCanDownload: false,
    guestUploadsEnabled: false,
    guestUploadAlbumId: null,
    guestUploadMaxFiles: 20,
    guestUploadMaxMb: 25,
    guestUploadModerated: true,
    albumSelectionLimit: 30,
    socialSelectionLimit: 10,
    showCountdown: false,
    countdownDate: null,
    slideshowSeconds: 5,
    slideshowMusicUrl: null,
    defaultView: "masonry",
  }) as GallerySettings;

/**
 * The single source of truth for "who may do what" in a gallery.
 * Every gallery page, server action and media route goes through this.
 */
export const resolveGalleryAccess = cache(async (where: { slug: string } | { id: string }): Promise<GalleryAccess> => {
  const gallery = await db.gallery.findUnique({
    where: "slug" in where ? { slug: where.slug } : { id: where.id },
    include: { settings: true, client: { select: { id: true, userId: true, partner1Name: true, partner2Name: true } } },
  });
  if (!gallery) return { ok: false, reason: "not-found", gallery: null };
  const settings = gallery.settings ?? defaultSettings(gallery.id);
  const user = await getCurrentUser();

  if (isStaff(user) && user.studioId === gallery.studioId) {
    return {
      ok: true,
      gallery,
      settings,
      role: "STAFF",
      perms: { view: true, favorite: true, comment: true, download: true, upload: true, share: true, manage: true },
      actor: { userId: user.id, invitationId: null, label: `${user.name} (studio)` },
      invitation: null,
    };
  }

  if (gallery.status === "ARCHIVED") return { ok: false, reason: "archived", gallery };
  if (gallery.status !== "PUBLISHED") return { ok: false, reason: "unpublished", gallery };
  if (gallery.expiresAt && gallery.expiresAt < new Date()) return { ok: false, reason: "expired", gallery };

  const downloadsOpen = settings.downloadScope !== "NONE" && (!settings.downloadExpiresAt || settings.downloadExpiresAt > new Date());

  if (user && gallery.client?.userId === user.id) {
    return {
      ok: true,
      gallery,
      settings,
      role: "COUPLE",
      perms: { view: true, favorite: settings.allowFavorites, comment: settings.allowComments, download: downloadsOpen, upload: true, share: true, manage: false },
      actor: { userId: user.id, invitationId: null, label: user.name },
      invitation: null,
    };
  }

  const jar = await cookies();
  const invitationId = unsignValue(jar.get(invitationCookie(gallery.id))?.value);
  if (invitationId) {
    const inv = await db.invitation.findUnique({ where: { id: invitationId } });
    if (inv && inv.galleryId === gallery.id && !inv.revokedAt && (!inv.expiresAt || inv.expiresAt > new Date())) {
      return {
        ok: true,
        gallery,
        settings,
        role: "INVITEE",
        perms: {
          view: inv.canView,
          favorite: inv.canFavorite && settings.allowFavorites,
          comment: inv.canComment && settings.allowComments,
          download: inv.canDownload && downloadsOpen,
          upload: inv.canUpload && settings.guestUploadsEnabled,
          share: false,
          manage: false,
        },
        actor: { userId: user?.id ?? null, invitationId: inv.id, label: inv.name },
        invitation: inv,
      };
    }
  }

  const linkPerms: GalleryPerms = { ...NONE, view: true, download: settings.linkCanDownload && downloadsOpen };
  if (gallery.visibility === "LINK") {
    return { ok: true, gallery, settings, role: "LINK", perms: linkPerms, actor: { userId: user?.id ?? null, invitationId: null, label: user?.name ?? "Guest via link" }, invitation: null };
  }
  if (gallery.visibility === "PASSWORD" && gallery.passwordHash) {
    const ok = unsignValue(jar.get(passwordCookie(gallery.id))?.value) === passwordFingerprint(gallery.passwordHash);
    if (ok) return { ok: true, gallery, settings, role: "LINK", perms: linkPerms, actor: { userId: user?.id ?? null, invitationId: null, label: user?.name ?? "Guest via password link" }, invitation: null };
    return { ok: false, reason: "password", gallery };
  }
  return { ok: false, reason: "login", gallery };
});

export class GalleryAccessError extends Error {}

/** Throwing variant for server actions. */
export async function requireGalleryPerm(where: { slug: string } | { id: string }, perm: keyof GalleryPerms) {
  const access = await resolveGalleryAccess(where);
  if (!access.ok) throw new GalleryAccessError("You do not have access to this gallery.");
  if (!access.perms[perm]) throw new GalleryAccessError(`Your access does not include “${perm}”.`);
  return access;
}

/** Owner key for favorites: users own lists by userId, invitees by invitationId. */
export function favoriteOwner(access: Extract<GalleryAccess, { ok: true }>) {
  if (access.actor.invitationId && access.role === "INVITEE") return { invitationId: access.actor.invitationId };
  if (access.actor.userId) return { ownerUserId: access.actor.userId };
  return null;
}

import "server-only";
import type { FavoriteListKind } from "@prisma/client";
import { db } from "@/lib/db";
import { toClientPhoto, mediaUrl, type ClientPhoto } from "@/lib/media";
import { favoriteOwner, type GalleryAccess } from "@/server/gallery-access";

type OkAccess = Extract<GalleryAccess, { ok: true }>;

export type ViewerList = { id: string; name: string; kind: FavoriteListKind; limit: number | null; submitted: boolean; photoIds: string[] };
export type ViewerAlbum = { id: string; title: string; slug: string; description: string | null; count: number; cover: ClientPhoto | null };

export type GalleryView = {
  slug: string;
  title: string;
  coupleNames: string;
  tagline: string | null;
  welcomeNote: string | null;
  location: string | null;
  shootDate: string | null;
  category: string;
  role: OkAccess["role"];
  perms: OkAccess["perms"];
  actorLabel: string;
  settings: {
    downloadScope: string;
    hasPin: boolean;
    slideshowSeconds: number;
    defaultView: string;
    guestUploadsEnabled: boolean;
    showCountdown: boolean;
    countdownDate: string | null;
  };
  cover: ClientPhoto | null;
  albums: ViewerAlbum[];
  photos: ClientPhoto[];
  lists: ViewerList[];
};

/** Everything a gallery page needs, already filtered to what this visitor may see. */
export async function loadGalleryView(access: OkAccess): Promise<GalleryView> {
  const g = access.gallery;
  const s = access.settings;
  const watermark = s.watermarkPreviews && access.role !== "STAFF";
  const [albums, photos, lists] = await Promise.all([
    db.album.findMany({ where: { galleryId: g.id, hidden: false }, orderBy: { order: "asc" } }),
    db.photo.findMany({
      where: { galleryId: g.id, status: "READY", hidden: false, OR: [{ albumId: null }, { album: { hidden: false } }] },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, kind: true, filename: true, albumId: true, width: true, height: true, blurDataUrl: true, caption: true, createdAt: true },
    }),
    (async () => {
      const owner = favoriteOwner(access);
      if (!owner || !access.perms.favorite) return [];
      return db.favoriteList.findMany({ where: { galleryId: g.id, ...owner }, orderBy: { createdAt: "asc" }, include: { favorites: { select: { photoId: true } } } });
    })(),
  ]);

  const client = photos.map((p) => toClientPhoto(p, { watermark }));
  const byId = new Map(client.map((p) => [p.id, p]));
  const cover = (g.coverPhotoId && byId.get(g.coverPhotoId)) || client.find((p) => p.kind === "IMAGE") || null;

  return {
    slug: g.slug,
    title: g.title,
    coupleNames: g.coupleNames,
    tagline: g.tagline,
    welcomeNote: g.welcomeNote,
    location: g.location,
    shootDate: g.shootDate?.toISOString() ?? null,
    category: g.category,
    role: access.role,
    perms: access.perms,
    actorLabel: access.actor.label,
    settings: {
      downloadScope: s.downloadScope,
      hasPin: !!s.downloadPinHash && access.role !== "STAFF",
      slideshowSeconds: s.slideshowSeconds,
      defaultView: s.defaultView,
      guestUploadsEnabled: s.guestUploadsEnabled,
      showCountdown: s.showCountdown,
      countdownDate: s.countdownDate?.toISOString() ?? null,
    },
    cover,
    albums: albums
      .map((a) => {
        const inAlbum = client.filter((p) => p.albumId === a.id);
        return { id: a.id, title: a.title, slug: a.slug, description: a.description, count: inAlbum.length, cover: inAlbum.find((p) => p.kind === "IMAGE") ?? null };
      })
      .filter((a) => a.count > 0),
    photos: client,
    lists: lists.map((l) => ({ id: l.id, name: l.name, kind: l.kind, limit: l.limit, submitted: !!l.submittedAt, photoIds: l.favorites.map((f) => f.photoId) })),
  };
}

/** Read-only favourites list someone shared via `?list=<token>`. */
export async function loadSharedList(galleryId: string, token: string) {
  const list = await db.favoriteList.findFirst({ where: { galleryId, shareToken: token }, include: { favorites: { select: { photoId: true } } } });
  return list ? { name: list.name, photoIds: list.favorites.map((f) => f.photoId) } : null;
}

/** Love-story timeline for the couple who own this gallery. */
export async function loadLoveStory(access: OkAccess) {
  const clientId = access.gallery.client?.id;
  if (!clientId) return { moments: [], profile: null };
  const watermark = access.settings.watermarkPreviews && access.role !== "STAFF";
  const [moments, profile] = await Promise.all([
    db.loveStoryMoment.findMany({
      where: { clientId },
      orderBy: { order: "asc" },
      include: { photo: { select: { id: true, galleryId: true, status: true, hidden: true, width: true, height: true, blurDataUrl: true } } },
    }),
    db.coupleProfile.findUnique({ where: { clientId } }),
  ]);
  return {
    profile: profile ? { tagline: profile.tagline, story: profile.story, countdownLabel: profile.countdownLabel } : null,
    moments: moments.map((m) => {
      // only expose photos that belong to this gallery and are visible
      const p = m.photo && m.photo.galleryId === access.gallery.id && m.photo.status === "READY" && !m.photo.hidden ? m.photo : null;
      return {
        id: m.id,
        title: m.title,
        date: m.date?.toISOString() ?? null,
        description: m.description,
        photo: p ? { src: mediaUrl("p", p.id, watermark ? "medium.wm" : "medium"), width: p.width ?? 1400, height: p.height ?? 933, blur: p.blurDataUrl } : null,
      };
    }),
  };
}

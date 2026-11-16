import "server-only";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import type { SessionUser } from "@/lib/auth/session";

/** The client record linked to the signed-in couple (null if the studio hasn't linked one yet). */
export async function getCoupleClient(user: SessionUser) {
  return db.client.findFirst({ where: { userId: user.id } });
}

/** Published galleries for this couple, with a signed cover thumbnail. */
export async function getCoupleGalleries(clientId: string) {
  const galleries = await db.gallery.findMany({
    where: { clientId, status: "PUBLISHED" },
    orderBy: [{ shootDate: "desc" }, { createdAt: "desc" }],
    include: { coverPhoto: { select: { id: true, status: true } }, _count: { select: { photos: { where: { status: "READY", hidden: false } } } } },
  });
  return galleries.map((g) => ({
    id: g.id,
    slug: g.slug,
    title: g.title,
    category: g.category,
    location: g.location,
    shootDate: g.shootDate,
    expiresAt: g.expiresAt,
    photoCount: g._count.photos,
    cover: g.coverPhoto?.status === "READY" ? mediaUrl("p", g.coverPhoto.id, "medium") : null,
  }));
}

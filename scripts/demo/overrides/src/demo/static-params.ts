// DEMO BUILD ONLY — lists every dynamic page to pre-render from the sample database.
import { db } from "@/lib/db";

export async function paramsFor(route: string): Promise<Record<string, string>[]> {
  switch (route) {
    case "stories/[slug]":
      return (await db.story.findMany({ where: { published: true }, select: { slug: true } })).map((s) => ({ slug: s.slug }));
    case "blog/[slug]":
      return (await db.blogPost.findMany({ where: { publishedAt: { not: null } }, select: { slug: true } })).map((p) => ({ slug: p.slug }));
    case "admin/bookings/[id]":
      return (await db.booking.findMany({ select: { id: true } })).map((r) => ({ id: r.id }));
    case "admin/clients/[id]":
      return (await db.client.findMany({ select: { id: true } })).map((r) => ({ id: r.id }));
    case "admin/invoices/[id]":
      return (await db.invoice.findMany({ select: { id: true } })).map((r) => ({ id: r.id }));
    case "admin/galleries/[id]":
      return (await db.gallery.findMany({ select: { id: true } })).map((r) => ({ id: r.id }));
    case "gallery/[slug]":
    case "gallery/[slug]/slideshow":
    case "gallery/[slug]/upload":
      return (await db.gallery.findMany({ select: { slug: true } })).map((g) => ({ slug: g.slug }));
    case "gallery/[slug]/[album]": {
      const galleries = await db.gallery.findMany({ select: { slug: true, albums: { where: { hidden: false }, select: { slug: true } } } });
      return galleries.flatMap((g) => [{ slug: g.slug, album: "all" }, ...g.albums.map((a) => ({ slug: g.slug, album: a.slug }))]);
    }
    case "guest/[token]":
      return (await db.invitation.findMany({ where: { revokedAt: null }, select: { token: true } })).map((i) => ({ token: i.token }));
    default:
      throw new Error(`No demo params for ${route}`);
  }
}

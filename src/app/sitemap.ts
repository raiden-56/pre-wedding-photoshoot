import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { LOCATIONS } from "@/content/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const statics = ["", "/portfolio", "/pre-wedding", "/wedding", "/poses", "/stories", "/about", "/packages", "/contact", "/blog", "/grid-studio"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  let dynamic: MetadataRoute.Sitemap = [];
  try {
    const [stories, posts] = await Promise.all([db.story.findMany({ where: { published: true }, select: { slug: true, createdAt: true } }), db.blogPost.findMany({ where: { publishedAt: { not: null } }, select: { slug: true, publishedAt: true } })]);
    dynamic = [
      ...stories.map((s) => ({ url: `${base}/stories/${s.slug}`, lastModified: s.createdAt })),
      ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.publishedAt ?? undefined })),
    ];
  } catch {
    // database unavailable at build time — static entries only
  }
  return [...statics, ...LOCATIONS.map((l) => ({ url: `${base}/locations/${l.slug}`, priority: 0.6 })), ...dynamic];
}

import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/** The public website represents the primary (first-created) studio. */
export const getStudio = cache(async () => {
  const studio = await db.studio.findFirst({ orderBy: { createdAt: "asc" } });
  return studio;
});

export const getPublicPackages = cache(async () => {
  const studio = await getStudio();
  if (!studio) return [];
  return db.package.findMany({ where: { studioId: studio.id, active: true }, orderBy: { order: "asc" } });
});

export const getTestimonials = cache(async () => {
  const studio = await getStudio();
  if (!studio) return [];
  return db.testimonial.findMany({ where: { studioId: studio.id, published: true }, orderBy: { order: "asc" } });
});

export const getStories = cache(async () => {
  const studio = await getStudio();
  if (!studio) return [];
  return db.story.findMany({ where: { studioId: studio.id, published: true }, orderBy: { createdAt: "asc" } });
});

export const getPortfolio = cache(async (category?: string) => {
  const studio = await getStudio();
  if (!studio) return [];
  return db.portfolioItem.findMany({ where: { studioId: studio.id, ...(category ? { category } : {}) }, orderBy: { order: "asc" } });
});

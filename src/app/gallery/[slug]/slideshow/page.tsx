import type { Metadata } from "next";
import { resolveGalleryAccess } from "@/server/gallery-access";
import { loadGalleryView } from "@/server/gallery-data";
import { GalleryGate } from "@/components/gallery/gate";
import { Slideshow } from "@/components/gallery/slideshow";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ album?: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Slideshow", robots: { index: false, follow: false } };

export default async function SlideshowPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { album } = await searchParams;
  const access = await resolveGalleryAccess({ slug });
  if (!access.ok) return <GalleryGate reason={access.reason} slug={slug} title={access.gallery?.coupleNames} />;
  const view = await loadGalleryView(access);
  const a = album ? view.albums.find((x) => x.slug === album) : null;
  const photos = a ? view.photos.filter((p) => p.albumId === a.id) : view.photos;
  return <Slideshow slug={slug} title={a ? `${view.coupleNames} · ${a.title}` : view.coupleNames} photos={photos} seconds={view.settings.slideshowSeconds} music={access.settings.slideshowMusicUrl} />;
}

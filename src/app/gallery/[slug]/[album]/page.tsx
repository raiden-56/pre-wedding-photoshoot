import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { resolveGalleryAccess } from "@/server/gallery-access";
import { loadGalleryView, loadSharedList } from "@/server/gallery-data";
import { GalleryGate } from "@/components/gallery/gate";
import { GalleryViewer } from "@/components/gallery/viewer";
import { GalleryFooter } from "@/components/gallery/footer";
import { TextEffect } from "@/components/motion/text-effect";
import { Logo } from "@/components/ui/misc";

type Props = { params: Promise<{ slug: string; album: string }>; searchParams: Promise<{ photo?: string; list?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await resolveGalleryAccess({ slug });
  return { title: a.ok ? a.gallery.title : "Private gallery", robots: { index: false, follow: false } };
}

export default async function AlbumPage({ params, searchParams }: Props) {
  const { slug, album: albumSlug } = await params;
  const { photo, list } = await searchParams;
  const access = await resolveGalleryAccess({ slug });
  if (!access.ok) return <GalleryGate reason={access.reason} slug={slug} title={access.gallery?.coupleNames} />;

  const view = await loadGalleryView(access);
  const album = albumSlug === "all" ? null : view.albums.find((a) => a.slug === albumSlug);
  if (albumSlug !== "all" && !album) notFound();
  const sharedList = list ? await loadSharedList(access.gallery.id, list) : null;
  const title = sharedList?.name ?? album?.title ?? "Every photograph";
  const count = sharedList?.photoIds.length ?? album?.count ?? view.photos.length;

  return (
    <main className="min-h-svh bg-ivory">
      <header className="container-x flex items-center justify-between py-6">
        <Link href={`/gallery/${slug}`} className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted transition hover:text-charcoal">
          <ArrowLeft className="size-4" /> {view.coupleNames}
        </Link>
        <Link href="/" aria-label="Saanjh Studio">
          <Logo />
        </Link>
      </header>
      <section className="container-x pb-10 pt-10 sm:pt-16">
        <p className="eyebrow mb-4">
          {view.title} · {count} photographs
        </p>
        <TextEffect key={title} as="h1" per="word" preset="fade-in-blur" className="font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.95]">
          {title}
        </TextEffect>
        {album?.description && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">{album.description}</p>}
      </section>
      <GalleryViewer key={albumSlug} view={view} albumId={album?.id ?? null} sharedList={sharedList} initialPhotoId={photo} />
      <GalleryFooter />
    </main>
  );
}

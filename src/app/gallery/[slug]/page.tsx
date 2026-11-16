import type { Metadata } from "next";
import Link from "next/link";
import { resolveGalleryAccess } from "@/server/gallery-access";
import { loadGalleryView, loadLoveStory } from "@/server/gallery-data";
import { formatDate } from "@/lib/utils";
import { GalleryGate } from "@/components/gallery/gate";
import { GalleryViewer } from "@/components/gallery/viewer";
import { AlbumCards, Countdown, GalleryHero, LoveStory } from "@/components/gallery/landing";
import { GalleryFooter } from "@/components/gallery/footer";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ photo?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await resolveGalleryAccess({ slug });
  return { title: a.ok ? a.gallery.title : "Private gallery", robots: { index: false, follow: false } };
}

export default async function GalleryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { photo } = await searchParams;
  const access = await resolveGalleryAccess({ slug });
  if (!access.ok) return <GalleryGate reason={access.reason} slug={slug} title={access.gallery?.coupleNames} />;

  const [view, story] = await Promise.all([loadGalleryView(access), loadLoveStory(access)]);
  const meta = [view.category, view.location, view.shootDate && formatDate(view.shootDate, { month: "long", year: "numeric" })].filter(Boolean) as string[];
  const countdown = view.settings.showCountdown && view.settings.countdownDate && new Date(view.settings.countdownDate) > new Date() ? view.settings.countdownDate : null;

  return (
    <main className="bg-ivory">
      <GalleryHero slug={slug} coupleNames={view.coupleNames} tagline={view.tagline} meta={meta} cover={view.cover} photoCount={view.photos.length} role={view.role} />

      {view.welcomeNote && (
        <section className="container-x py-24 text-center sm:py-32">
          <p className="eyebrow mb-8">A note from your photographer</p>
          <p className="font-display mx-auto max-w-3xl text-[clamp(1.7rem,3.2vw,2.8rem)] leading-[1.2] text-ink">“{view.welcomeNote}”</p>
          <p className="mt-8 text-[11px] uppercase tracking-[0.3em] text-muted">Saanjh Studio</p>
        </section>
      )}

      {countdown && (
        <section className="border-y border-line bg-white py-20 sm:py-24">
          <div className="container-x">
            <Countdown date={countdown} label={story.profile?.countdownLabel} />
          </div>
        </section>
      )}

      {view.albums.length > 1 && (
        <section className="container-x py-24 sm:py-28">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">Chapters</p>
              <h2 className="font-display text-headline">The albums</h2>
            </div>
            <Link href={`/gallery/${slug}/all`} className="hidden text-[12px] uppercase tracking-[0.2em] sm:inline">
              <span className="link-underline">Every photograph</span>
            </Link>
          </div>
          <AlbumCards slug={slug} albums={view.albums} />
        </section>
      )}

      {story.moments.length > 0 && (
        <section className="overflow-hidden bg-white py-24 sm:py-32">
          <div className="container-x">
            <div className="mb-16 text-center">
              <p className="eyebrow mb-3">Our story</p>
              <h2 className="font-display text-headline">{story.profile?.tagline ?? "How it began"}</h2>
            </div>
            <LoveStory moments={story.moments} />
          </div>
        </section>
      )}

      <div className="pt-16">
        <div className="container-x mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-3">The gallery</p>
            <h2 className="font-display text-4xl sm:text-5xl">Every frame</h2>
          </div>
          <p className="text-sm text-muted">{view.photos.length} photographs</p>
        </div>
        <GalleryViewer view={view} albumId={null} initialPhotoId={photo} />
      </div>

      <GalleryFooter />
    </main>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { SampleNote } from "@/components/site/page-hero";
import { PortfolioGallery } from "@/components/site/portfolio-gallery";
import { PHOTOS } from "@/content/photos";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const s = await db.story.findUnique({ where: { slug } });
  if (!s) return {};
  return { title: `${s.coupleNames} — ${s.title}`, description: s.excerpt, openGraph: { images: [s.coverImage] }, alternates: { canonical: `/stories/${slug}` } };
}

export default async function StoryPage({ params }: Params) {
  const { slug } = await params;
  const story = await db.story.findUnique({ where: { slug } });
  if (!story || !story.published) notFound();
  const imgs = story.images.map((src, i) => {
    const meta = PHOTOS.find((p) => p.src === src);
    return { id: `${i}`, src, width: meta?.width ?? 1600, height: meta?.height ?? 1067, alt: meta?.alt ?? story.title, category: story.category, location: story.location };
  });
  const cover = PHOTOS.find((p) => p.src === story.coverImage);
  const more = await db.story.findMany({ where: { published: true, id: { not: story.id } }, take: 2 });

  return (
    <article>
      <section className="relative h-[92svh] min-h-[560px] overflow-hidden bg-charcoal text-ivory">
        <Image src={story.coverImage} alt={cover?.alt ?? story.title} fill priority sizes="100vw" className="object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-charcoal/30" />
        <div className="container-x relative flex h-full flex-col justify-end pb-16">
          <p className="eyebrow animate-fade-up text-champagne">{story.category} · {story.location}</p>
          <h1 className="font-display mt-4 animate-fade-up text-display [animation-delay:120ms]">{story.coupleNames}</h1>
          <p className="font-display mt-3 animate-fade-up text-3xl italic text-ivory/85 [animation-delay:240ms]">{story.title}</p>
        </div>
      </section>
      <section className="container-x grid gap-10 py-20 lg:grid-cols-12">
        <aside className="space-y-5 text-sm lg:col-span-3">
          <Link href="/stories" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted hover:text-charcoal">
            <ArrowLeft className="size-3.5" /> All stories
          </Link>
          <dl className="space-y-4 border-t border-line pt-5">
            <div><dt className="eyebrow">Location</dt><dd className="mt-1">{story.location}</dd></div>
            {story.shootDate && <div><dt className="eyebrow">Photographed</dt><dd className="mt-1">{formatDate(story.shootDate, { month: "long", year: "numeric" })}</dd></div>}
            <div><dt className="eyebrow">Category</dt><dd className="mt-1">{story.category}</dd></div>
          </dl>
          {story.isSample && <SampleNote>Illustrative sample story</SampleNote>}
        </aside>
        <div className="lg:col-span-7 lg:col-start-5">
          <p className="font-display text-3xl leading-snug">{story.excerpt}</p>
          {story.body.split("\n\n").map((para, i) => (
            <p key={i} className="mt-6 text-[16px] leading-[1.85] text-ink/85">
              {para}
            </p>
          ))}
        </div>
      </section>
      <section className="container-x pb-24">
        <PortfolioGallery items={imgs} feature={false} />
        {story.videoUrl && (
          <div className="mt-12 aspect-video w-full">
            <iframe src={story.videoUrl} title={`${story.coupleNames} film`} className="h-full w-full" allow="fullscreen; picture-in-picture" loading="lazy" />
          </div>
        )}
      </section>
      {more.length > 0 && (
        <section className="border-t border-line bg-white py-20">
          <div className="container-x">
            <p className="eyebrow mb-8">More stories</p>
            <div className="grid gap-8 md:grid-cols-2">
              {more.map((m) => (
                <Link key={m.id} href={`/stories/${m.slug}`} className="group">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={m.coverImage} alt={m.title} fill sizes="50vw" className="object-cover transition duration-1000 group-hover:scale-105" />
                  </div>
                  <p className="font-display mt-4 text-3xl">{m.coupleNames}</p>
                  <p className="text-sm italic text-muted">{m.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

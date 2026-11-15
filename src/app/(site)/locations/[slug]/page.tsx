import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Sun } from "lucide-react";
import { LOCATIONS } from "@/content/site";
import { photo } from "@/content/photos";
import { PageHero } from "@/components/site/page-hero";
import { PortfolioGallery } from "@/components/site/portfolio-gallery";

type P = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LOCATIONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const l = LOCATIONS.find((x) => x.slug === slug);
  if (!l) return {};
  return {
    title: `${l.name} Pre-Wedding Photography`,
    description: `${l.headline} Best season: ${l.bestSeason}. Plan your ${l.name} pre-wedding shoot with Saanjh Studio.`,
    alternates: { canonical: `/locations/${slug}` },
    openGraph: { images: [photo(l.photos[0]).src] },
  };
}

export default async function LocationPage({ params }: P) {
  const { slug } = await params;
  const l = LOCATIONS.find((x) => x.slug === slug);
  if (!l) notFound();
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  return (
    <>
      <PageHero eyebrow={`${l.region} · Location guide`} title={<>{l.name}</>} intro={l.headline} photoId={l.photos[0]} />
      <section className="container-x grid gap-12 py-24 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="font-display text-4xl leading-tight">{l.intro}</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="border-t border-line pt-4">
              <p className="eyebrow flex items-center gap-2"><Sun className="size-3.5" /> Best season</p>
              <p className="font-display mt-2 text-2xl">{l.bestSeason}</p>
            </div>
            <div className="border-t border-line pt-4">
              <p className="eyebrow flex items-center gap-2"><Clock className="size-3.5" /> Golden hour</p>
              <p className="font-display mt-2 text-2xl">{l.goldenHour}</p>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <p className="eyebrow mb-4">Our favourite spots</p>
          <ul className="divide-y divide-line border-y border-line">
            {l.highlights.map((h, i) => (
              <li key={h} className="flex items-baseline gap-4 py-4">
                <span className="font-display text-taupe">0{i + 1}</span>
                <span className="font-display text-2xl">{h}</span>
              </li>
            ))}
          </ul>
          {mapsKey && (
            <iframe
              title={`Map of ${l.name}`}
              className="mt-8 aspect-[4/3] w-full border border-line"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${encodeURIComponent(`${l.name}, India`)}`}
            />
          )}
        </div>
      </section>
      <section className="container-x pb-24">
        <PortfolioGallery feature={false} items={l.photos.map((id) => ({ ...photo(id), category: "Pre-Wedding", location: l.name }))} />
      </section>
      <section className="bg-charcoal py-20 text-center text-ivory">
        <p className="font-display mx-auto max-w-2xl text-5xl">Dreaming of {l.name}?</p>
        <Link href="/contact" className="mt-8 inline-flex h-12 items-center bg-ivory px-8 text-[12px] uppercase tracking-[0.18em] text-charcoal">
          Plan your shoot
        </Link>
        <div className="container-x mt-14 flex flex-wrap justify-center gap-3">
          {LOCATIONS.filter((x) => x.slug !== l.slug).map((x) => (
            <Link key={x.slug} href={`/locations/${x.slug}`} className="relative h-20 w-32 overflow-hidden">
              <Image src={photo(x.photos[0]).src} alt="" fill sizes="128px" className="object-cover opacity-60 transition hover:opacity-100" />
              <span className="font-display absolute inset-0 grid place-items-center text-lg">{x.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

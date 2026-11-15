import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero, SectionHeading } from "./page-hero";
import { PortfolioGallery } from "./portfolio-gallery";
import { PackagesList } from "./packages-list";
import { ImageReveal, Reveal } from "./reveal";
import { photo } from "@/content/photos";
import { getPortfolio, getPublicPackages } from "@/server/site";

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  intro: string;
  heroPhoto: string;
  categories: string[];
  essay: { title: string; paragraphs: string[]; photos: [string, string] };
  points: { title: string; body: string }[];
  packageFilter: (name: string) => boolean;
};

export async function CategoryLanding(p: Props) {
  const [items, packages] = await Promise.all([getPortfolio(), getPublicPackages()]);
  const filtered = items.filter((i) => p.categories.includes(i.category));
  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} intro={p.intro} photoId={p.heroPhoto} />
      <section className="container-x grid gap-12 py-24 sm:py-32 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal>
            <h2 className="font-display text-5xl leading-[1.02]">{p.essay.title}</h2>
            {p.essay.paragraphs.map((t, i) => (
              <p key={i} className="mt-6 text-[15px] leading-relaxed text-muted">
                {t}
              </p>
            ))}
          </Reveal>
        </div>
        <div className="grid grid-cols-5 gap-3 lg:col-span-6 lg:col-start-7">
          <ImageReveal className="relative col-span-3 aspect-[3/4] overflow-hidden">
            <Image src={photo(p.essay.photos[0]).src} alt={photo(p.essay.photos[0]).alt} fill sizes="30vw" className="object-cover" />
          </ImageReveal>
          <ImageReveal delay={0.2} className="relative col-span-2 mt-24 aspect-[3/4] overflow-hidden">
            <Image src={photo(p.essay.photos[1]).src} alt={photo(p.essay.photos[1]).alt} fill sizes="20vw" className="object-cover" />
          </ImageReveal>
        </div>
      </section>
      <section className="bg-white py-20">
        <div className="container-x grid gap-10 md:grid-cols-3">
          {p.points.map((pt, i) => (
            <Reveal key={pt.title} delay={i * 0.08}>
              <p className="font-display text-xl text-taupe">0{i + 1}</p>
              <h3 className="font-display mt-2 text-3xl">{pt.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{pt.body}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="container-x py-24">
        <SectionHeading eyebrow="Selected work" title="Recent frames" className="mb-10" />
        <PortfolioGallery feature={false} items={filtered.map((f) => ({ id: f.id, src: f.imageUrl, width: f.width, height: f.height, alt: f.alt, category: f.category, location: f.location }))} />
      </section>
      <section className="container-x pb-28">
        <SectionHeading eyebrow="Collections" title="Ways to work with us" className="mb-10" />
        <PackagesList packages={packages.filter((x) => p.packageFilter(x.name))} />
        <Link href="/contact" className="mt-10 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em]">
          <span className="link-underline">Check your date</span> <ArrowRight className="size-4" />
        </Link>
      </section>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HomeHero } from "@/components/site/hero";
import { PhotoMarquee } from "@/components/site/photo-marquee";
import { FrameShowcase } from "@/components/site/frame-showcase";
import { PortfolioGallery } from "@/components/site/portfolio-gallery";
import { ProcessTimeline } from "@/components/site/process-timeline";
import { StoriesRail } from "@/components/site/stories-rail";
import { Testimonials } from "@/components/site/testimonials";
import { PackagesList } from "@/components/site/packages-list";
import { ImageReveal, Reveal } from "@/components/site/reveal";
import { SampleNote, SectionHeading } from "@/components/site/page-hero";
import { LOCATIONS } from "@/content/site";
import { photo } from "@/content/photos";
import { getPortfolio, getPublicPackages, getStories, getStudio, getTestimonials } from "@/server/site";

export const revalidate = 300;

export default async function HomePage() {
  const [studio, portfolio, packages, stories, testimonials] = await Promise.all([getStudio(), getPortfolio(), getPublicPackages(), getStories(), getTestimonials()]);
  const featured = portfolio.filter((p) => p.featured);
  const intro = [photo("06"), photo("28"), photo("53")];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: studio?.name ?? "Saanjh Studio",
    description: "Pre-wedding and wedding photography studio.",
    telephone: studio?.phone,
    email: studio?.email,
    address: { "@type": "PostalAddress", streetAddress: studio?.address, addressLocality: studio?.city, addressCountry: "IN" },
    areaServed: LOCATIONS.map((l) => l.name),
    image: "/photos/32.jpg",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeHero />

      {/* Intro statement — asymmetric editorial */}
      <section id="intro" className="container-x grid gap-12 py-24 sm:py-36 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Reveal>
            <p className="eyebrow mb-6">The studio</p>
            <p className="font-display text-[clamp(2rem,3.6vw,3.4rem)] leading-[1.08]">
              We photograph love the way you remember it — <em className="text-olive">golden, unhurried,</em> and a little imperfect in all the right places.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-8 max-w-lg text-[15px] leading-relaxed text-muted">
              A small team of photographers and filmmakers working across India’s beaches, palaces, backwaters and mountains. Every couple receives a private digital gallery — favourite, comment, choose your album and share with family wherever they are.
            </p>
            <Link href="/about" className="mt-8 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em]">
              <span className="link-underline">Meet the studio</span> <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
        <div className="relative grid grid-cols-6 grid-rows-6 gap-3 lg:col-span-6 lg:h-[640px]">
          <ImageReveal className="relative col-span-4 row-span-6 aspect-[3/4] overflow-hidden lg:aspect-auto">
            <Image src={intro[0].src} alt={intro[0].alt} fill sizes="(min-width:1024px) 33vw, 66vw" className="object-cover" />
          </ImageReveal>
          <ImageReveal delay={0.2} className="relative col-span-2 row-span-3 overflow-hidden">
            <Image src={intro[1].src} alt={intro[1].alt} fill sizes="16vw" className="object-cover" />
          </ImageReveal>
          <ImageReveal delay={0.35} className="relative col-span-2 row-span-3 overflow-hidden">
            <Image src={intro[2].src} alt={intro[2].alt} fill sizes="16vw" className="object-cover" />
          </ImageReveal>
        </div>
      </section>

      <section className="pb-24 sm:pb-32">
        <PhotoMarquee rows={[["34", "09", "27", "23", "16", "50", "39", "47", "30"], ["21", "41", "14", "36", "29", "19", "45", "31", "12"]]} />
      </section>

      {/* Featured photography */}
      <section className="container-x pb-24 sm:pb-32">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="Featured photography" title={<>Moments, <em>kept.</em></>} />
          <Link href="/portfolio" className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em]">
            <span className="link-underline">View the full portfolio</span> <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <PortfolioGallery items={featured.map((f) => ({ id: f.id, src: f.imageUrl, width: f.width, height: f.height, alt: f.alt, category: f.category, location: f.location }))} />
      </section>

      <FrameShowcase />

      {/* Process */}
      <section className="container-x py-24 sm:py-36">
        <SectionHeading eyebrow="Our process" title={<>From first hello <br className="hidden sm:block" />to forever.</>} intro="Six unhurried steps, designed so you can simply enjoy each other while we look after everything else." className="mb-10 max-w-3xl" />
        <ProcessTimeline />
      </section>

      {/* Stories */}
      <section className="overflow-hidden bg-white py-24 sm:py-32">
        <div className="container-x">
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <SectionHeading eyebrow="Couple stories" title="Stories worth retelling" />
              {stories.some((s) => s.isSample) && <SampleNote />}
            </div>
            <Link href="/stories" className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em]">
              <span className="link-underline">All stories</span> <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <StoriesRail stories={stories} />
        </div>
      </section>

      {/* Packages */}
      <section className="container-x py-24 sm:py-32">
        <div className="mb-14 grid gap-6 lg:grid-cols-12">
          <SectionHeading eyebrow="Collections" title="Thoughtfully designed collections" className="lg:col-span-7" />
          <p className="self-end text-[15px] leading-relaxed text-muted lg:col-span-5">
            Every celebration is different, so every collection can be tailored. Add hours, films, albums or a second location — we’ll send a custom quotation.
          </p>
        </div>
        <PackagesList packages={packages.slice(0, 4)} />
        <div className="mt-10 text-center">
          <Link href="/packages" className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em]">
            <span className="link-underline">Compare every collection &amp; add-on</span> <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-ivory-deep py-24 sm:py-32">
        <div className="container-x">
          <p className="eyebrow mb-10">Kind words</p>
          <Testimonials items={testimonials} />
        </div>
      </section>

      {/* Locations */}
      <section className="container-x py-24 sm:py-32">
        <SectionHeading eyebrow="Where we shoot" title="Places that hold the light" className="mb-12" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {LOCATIONS.map((l, i) => {
            const p = photo(l.photos[0]);
            return (
              <Reveal key={l.slug} delay={i * 0.05}>
                <Link href={`/locations/${l.slug}`} className="group relative block aspect-[3/4] overflow-hidden">
                  <Image src={p.src} alt={`${l.name} pre-wedding photography`} fill sizes="(min-width:1024px) 16vw, 50vw" className="object-cover transition duration-1000 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
                  <span className="absolute bottom-4 left-4 text-ivory">
                    <span className="block text-[10px] uppercase tracking-[0.25em] text-champagne">{l.region}</span>
                    <span className="font-display text-2xl">{l.name}</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-charcoal py-28 text-ivory sm:py-40">
        <Image src={photo("42").src} alt="" fill sizes="100vw" className="object-cover opacity-35" />
        <div className="container-x relative text-center">
          <p className="eyebrow mb-6 text-champagne">Now booking 2027</p>
          <p className="font-display mx-auto max-w-3xl text-headline">Tell us your story. We’ll find its light.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="inline-flex h-12 items-center bg-ivory px-8 text-[12px] font-medium uppercase tracking-[0.18em] text-charcoal transition hover:bg-champagne">
              Book your photoshoot
            </Link>
            <Link href="/grid-studio" className="inline-flex h-12 items-center border border-ivory/50 px-8 text-[12px] uppercase tracking-[0.18em] transition hover:bg-ivory hover:text-charcoal">
              Try Photo Grid Studio
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

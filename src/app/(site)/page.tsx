import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HomeHero } from "@/components/site/hero";
import { FrameShowcase } from "@/components/site/frame-showcase";
import { PortfolioGallery } from "@/components/site/portfolio-gallery";
import { ProcessTimeline } from "@/components/site/process-timeline";
import { StoriesRail } from "@/components/site/stories-rail";
import { Testimonials } from "@/components/site/testimonials";
import { PackagesList } from "@/components/site/packages-list";
import { ImageReveal, Reveal } from "@/components/site/reveal";
import { SampleNote, SectionHeading } from "@/components/site/page-hero";
import { LocationsStrip } from "@/components/site/locations-strip";
import { LOCATIONS } from "@/content/site";
import { photo } from "@/content/photos";
import { getPortfolio, getPublicPackages, getStories, getStudio, getTestimonials } from "@/server/site";

export const revalidate = 300;

const linkCls = "inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:text-charcoal";

export default async function HomePage() {
  const [studio, portfolio, packages, stories, testimonials] = await Promise.all([getStudio(), getPortfolio(), getPublicPackages(), getStories(), getTestimonials()]);
  const featured = portfolio.filter((p) => p.featured);
  const intro = [photo("50"), photo("28"), photo("53")];

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

      {/* Intro — text beside a three-photo composition */}
      <section id="intro" className="container-x grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow mb-4">The studio</p>
          <h2 className="font-display text-headline">We photograph love the way you remember it — golden, unhurried and a little imperfect</h2>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink/80">
            A small team of photographers and filmmakers working across India’s beaches, palaces, backwaters and mountains. Every couple receives a private online gallery to favourite, comment, choose album photographs and share with family.
          </p>
          <Link href="/about" className={`mt-6 ${linkCls}`}>
            Meet the studio <ArrowRight className="size-4" />
          </Link>
        </Reveal>
        <div className="grid h-[420px] grid-cols-5 grid-rows-2 gap-3 sm:h-[480px] lg:col-span-7">
          <ImageReveal className="relative col-span-3 row-span-2 overflow-hidden">
            <Image src={intro[0].src} alt={intro[0].alt} fill sizes="(min-width:1024px) 34vw, 60vw" className="object-cover" />
          </ImageReveal>
          <ImageReveal delay={0.1} className="relative col-span-2 overflow-hidden">
            <Image src={intro[1].src} alt={intro[1].alt} fill sizes="(min-width:1024px) 22vw, 40vw" className="object-cover" />
          </ImageReveal>
          <ImageReveal delay={0.2} className="relative col-span-2 overflow-hidden">
            <Image src={intro[2].src} alt={intro[2].alt} fill sizes="(min-width:1024px) 22vw, 40vw" className="object-cover" />
          </ImageReveal>
        </div>
      </section>

      {/* Featured photography */}
      <section className="container-x pb-20 sm:pb-28">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHeading eyebrow="Featured photography" title="Moments, kept" />
          <Link href="/portfolio" className={linkCls}>
            View the full portfolio <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <PortfolioGallery items={featured.map((f) => ({ id: f.id, src: f.imageUrl, width: f.width, height: f.height, alt: f.alt, category: f.category, location: f.location }))} />
      </section>

      <FrameShowcase />

      {/* Process */}
      <section className="container-x py-20 sm:py-28">
        <ProcessTimeline />
      </section>

      {/* Stories */}
      <section className="overflow-hidden bg-white py-20 sm:py-28">
        <div className="container-x">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <SectionHeading eyebrow="Couple stories" title="Stories worth retelling" />
              {stories.some((s) => s.isSample) && <SampleNote />}
            </div>
            <Link href="/stories" className={linkCls}>
              All stories <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <StoriesRail stories={stories} />
        </div>
      </section>

      {/* Packages */}
      <section className="container-x py-20 sm:py-28">
        <div className="mb-10 grid gap-4 lg:grid-cols-12">
          <SectionHeading eyebrow="Collections" title="Thoughtfully designed collections" className="lg:col-span-7" />
          <p className="self-end text-[15px] leading-relaxed text-ink/80 lg:col-span-5">Every celebration is different, so every collection can be tailored. Add hours, films, albums or a second location and we’ll send a custom quotation.</p>
        </div>
        <PackagesList packages={packages.slice(0, 4)} />
        <div className="mt-8">
          <Link href="/packages" className={linkCls}>
            Compare every collection and add-on <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-ivory-deep py-20 sm:py-28">
        <div className="container-x">
          <p className="eyebrow mb-8">Kind words</p>
          <Testimonials items={testimonials} />
        </div>
      </section>

      {/* Locations */}
      <section className="container-x py-20 sm:py-28">
        <SectionHeading eyebrow="Where we shoot" title="Places that hold the light" className="mb-8" />
        <LocationsStrip />
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-charcoal py-20 text-ivory sm:py-24">
        <Image src={photo("42").src} alt="" fill sizes="100vw" className="object-cover opacity-30" />
        <div className="container-x relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-champagne">Now booking 2027</p>
            <p className="font-display mt-3 text-headline">Tell us your story. We’ll find its light</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex h-12 items-center gap-2 bg-ivory px-6 text-sm font-medium text-charcoal transition-colors duration-150 hover:bg-champagne">
              Book your photoshoot <ArrowRight className="size-4" />
            </Link>
            <Link href="/grid-studio" className="inline-flex h-12 items-center border border-ivory/40 px-6 text-sm font-medium transition-colors duration-150 hover:border-ivory hover:bg-ivory/10">
              Try Photo Grid Studio
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

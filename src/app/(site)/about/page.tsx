import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { ImageReveal, Reveal } from "@/components/site/reveal";
import { photo } from "@/content/photos";

export const metadata: Metadata = {
  title: "About the Studio",
  description: "A small team of photographers and filmmakers who believe the best photographs are felt before they are seen.",
  alternates: { canonical: "/about" },
};

const values = [
  { title: "Light first", body: "We plan every shoot around the hour of light that suits your story — not the other way round." },
  { title: "Real over posed", body: "Gentle prompts, never stiff poses. The in-between moments are usually the ones you frame." },
  { title: "Made to last", body: "Archival editing, private galleries, heirloom albums. Your photographs should outlive trends." },
  { title: "Respect for your privacy", body: "Galleries are private by default. You decide who sees what, and nothing is published without your consent." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About us" title={<>Saanjh means <em>dusk</em> — the softest light of the day.</>} intro="It’s the hour we love most, and the feeling we try to bring to every photograph we make." photoId="38" />
      <section className="container-x grid gap-14 py-24 sm:py-32 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ImageReveal className="relative aspect-[4/5] overflow-hidden">
            <Image src={photo("47").src} alt={photo("47").alt} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
          </ImageReveal>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal>
            <p className="eyebrow mb-5">Our story</p>
            <p className="font-display text-4xl leading-tight">A studio built on long conversations, early mornings and a deep respect for the people in front of the lens.</p>
            <p className="mt-6 text-[15px] leading-relaxed text-muted">
              We are a small team of photographers, filmmakers and editors based in Mumbai, travelling across India for couples who want their photographs to feel honest and timeless. We take on a limited number of celebrations each season so every couple has our full attention — from the first call to the final album.
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              Alongside the photography, we built our own private gallery platform so couples can choose, comment, share with family and relive the day without ever wrestling with download links or compressed WhatsApp forwards.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="bg-white py-24">
        <div className="container-x grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.06}>
              <p className="font-display text-6xl text-champagne-deep">{i + 1}</p>
              <h2 className="font-display mt-3 text-3xl">{v.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{v.body}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="container-x py-24 text-center">
        <p className="font-display mx-auto max-w-2xl text-5xl leading-tight">Let’s plan something beautiful.</p>
        <Link href="/contact" className="mt-8 inline-flex h-12 items-center bg-charcoal px-8 text-[12px] uppercase tracking-[0.18em] text-ivory">
          Start a conversation
        </Link>
      </section>
    </>
  );
}

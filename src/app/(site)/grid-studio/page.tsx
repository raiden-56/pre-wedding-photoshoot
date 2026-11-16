import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, LayoutTemplate, Sparkles, Wand2 } from "lucide-react";
import { BUILTIN_TEMPLATES, findTemplate } from "@/lib/grid/templates";
import { TemplateBrowser } from "@/components/grid/template-browser";
import { GridHeroStack } from "@/components/grid/hero-stack";
import { Reveal } from "@/components/site/reveal";
import { TextEffect } from "@/components/motion/text-effect";

export const metadata: Metadata = {
  title: "Photo Grid Studio — wedding & pre-wedding collage maker",
  description: "Turn your favourite photographs into editorial collages, Instagram grids and story templates. 30+ layouts, Smart Auto Layout and high-resolution PNG, JPG or PDF export.",
  alternates: { canonical: "/grid-studio" },
};

const STEPS = [
  { icon: LayoutTemplate, title: "Pick a layout", body: "Start from one of the editorial templates — or let Smart Auto Layout choose for you." },
  { icon: Wand2, title: "Make it yours", body: "Drag photos in, reframe them, adjust warmth and light, and set your names in beautiful type." },
  { icon: Download, title: "Export in full quality", body: "Download as PNG, JPG or a print-ready PDF at up to twice the native resolution." },
];

export default function GridStudioPage() {
  const hero = ["centre-stage", "magazine-cover", "polaroid-scatter-5"].map((id) => findTemplate(id)!).filter(Boolean);
  return (
    <>
      <section className="relative overflow-hidden bg-charcoal pb-20 pt-36 text-ivory sm:pb-28 sm:pt-44">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(232,216,195,0.16),transparent_60%)]" />
        <div className="grain absolute inset-0" />
        <div className="container-x relative grid items-center gap-16 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow mb-6 text-champagne">Photo Grid Studio · free to use</p>
            <TextEffect as="h1" per="word" preset="fade-in-blur" className="font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95]">
              Your story, beautifully arranged.
            </TextEffect>
            <p className="mt-7 max-w-md text-[15px] leading-relaxed text-ivory/75">
              Editorial collages, Instagram grids and save-the-dates from your own photographs — designed with the same eye we bring to every album.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/grid-studio/editor" className="group inline-flex h-12 items-center gap-2 bg-ivory px-7 text-[12px] font-medium uppercase tracking-[0.18em] text-charcoal transition hover:bg-champagne">
                Start designing <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Link>
              <Link href="/grid-studio/editor?panel=auto" className="inline-flex h-12 items-center gap-2 border border-ivory/50 px-7 text-[12px] uppercase tracking-[0.18em] transition hover:bg-ivory hover:text-charcoal">
                <Sparkles className="size-4" /> Smart Auto Layout
              </Link>
            </div>
            <p className="mt-6 text-xs text-ivory/45">{BUILTIN_TEMPLATES.length} templates · works on phone and desktop · photos never leave your device unless you save to your account</p>
          </div>
          <div className="lg:col-span-6">
            <GridHeroStack templates={hero} />
          </div>
        </div>
      </section>

      <section className="container-x py-20 sm:py-28">
        <div className="grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="border-t border-charcoal/15 pt-6">
                <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-olive">
                  <s.icon className="size-4" /> 0{i + 1}
                </p>
                <h2 className="font-display mt-4 text-3xl">{s.title}</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-x pb-28">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-3">The library</p>
            <h2 className="font-display text-headline">Choose a starting point</h2>
          </div>
          <p className="max-w-sm text-sm text-muted">Previews use sample photographs. Every template keeps your photos when you switch, so feel free to experiment.</p>
        </div>
        <TemplateBrowser />
      </section>
    </>
  );
}

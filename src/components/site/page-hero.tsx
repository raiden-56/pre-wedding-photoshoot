import Image from "next/image";
import { photo } from "@/content/photos";

export function PageHero({ eyebrow, title, intro, photoId, align = "bottom" }: { eyebrow: string; title: React.ReactNode; intro?: string; photoId?: string; align?: "bottom" | "center" }) {
  if (!photoId) {
    return (
      <section className="container-x pb-16 pt-36 sm:pt-44">
        <p className="eyebrow mb-5 animate-fade-up">{eyebrow}</p>
        <h1 className="font-display max-w-5xl animate-fade-up text-headline [animation-delay:120ms]">{title}</h1>
        {intro && <p className="mt-6 max-w-2xl animate-fade-up text-[15px] leading-relaxed text-muted [animation-delay:240ms]">{intro}</p>}
      </section>
    );
  }
  const p = photo(photoId);
  return (
    <section className="relative flex h-[78svh] min-h-[520px] overflow-hidden bg-charcoal text-ivory">
      <Image src={p.src} alt={p.alt} fill priority sizes="100vw" className="object-cover opacity-80 animate-[fade-up_1.4s_ease_both]" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-charcoal/30" />
      <div className={`container-x relative z-10 flex w-full flex-col ${align === "center" ? "justify-center" : "justify-end pb-16 sm:pb-20"}`}>
        <p className="eyebrow mb-5 animate-fade-up text-champagne">{eyebrow}</p>
        <h1 className="font-display max-w-4xl animate-fade-up text-headline [animation-delay:150ms]">{title}</h1>
        {intro && <p className="mt-6 max-w-xl animate-fade-up text-[15px] leading-relaxed text-ivory/80 [animation-delay:300ms]">{intro}</p>}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, intro, className }: { eyebrow: string; title: React.ReactNode; intro?: string; className?: string }) {
  return (
    <div className={className}>
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h2 className="font-display text-headline">{title}</h2>
      {intro && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}

export function SampleNote({ children = "Illustrative sample content for development" }: { children?: React.ReactNode }) {
  return <p className="mt-3 inline-block border border-dashed border-taupe px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted">{children}</p>;
}

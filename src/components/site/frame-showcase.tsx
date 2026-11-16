import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { photo } from "@/content/photos";

/** A single printed-frame moment: one photograph mounted like an album page, with its story beside it. */
export function FrameShowcase() {
  const p = photo("39");
  return (
    <section className="bg-ivory-deep py-20 sm:py-28">
      <div className="container-x grid items-center gap-10 md:grid-cols-2 lg:gap-20">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md bg-white p-3 shadow-[0_24px_48px_-24px_rgba(36,35,33,0.35)] sm:p-4">
          <div className="relative h-full w-full">
            <Image src={p.src} alt={p.alt} fill sizes="(min-width:768px) 40vw, 90vw" className="object-cover" />
          </div>
          <p className="absolute -bottom-7 left-0 text-xs text-muted">Himachal · first light</p>
        </div>
        <div className="max-w-lg">
          <p className="eyebrow mb-4">Featured story · Himachal</p>
          <p className="font-display text-headline">“The hill was ours for exactly eleven minutes of light”</p>
          <p className="mt-5 text-[15px] leading-relaxed text-ink/80">Every gallery we deliver is designed like a printed album — curated, sequenced and made to be passed between generations.</p>
          <Link href="/stories" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:text-charcoal">
            Read the stories <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

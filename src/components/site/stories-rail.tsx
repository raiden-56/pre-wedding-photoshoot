"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

type StoryCard = { slug: string; coupleNames: string; title: string; location: string; category: string; coverImage: string; excerpt: string; shootDate: Date | string | null };

export function StoriesRail({ stories }: { stories: StoryCard[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => rail.current?.scrollBy({ left: d * rail.current.clientWidth * 0.7, behavior: "smooth" });
  return (
    <div>
      <div className="mb-6 hidden justify-end gap-2 md:flex">
        <button onClick={() => scroll(-1)} className="grid size-11 place-items-center rounded-full border border-line transition hover:border-charcoal" aria-label="Previous stories">
          <ArrowLeft className="size-4" />
        </button>
        <button onClick={() => scroll(1)} className="grid size-11 place-items-center rounded-full border border-line transition hover:border-charcoal" aria-label="Next stories">
          <ArrowRight className="size-4" />
        </button>
      </div>
      <div ref={rail} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:-mx-[4vw] sm:px-[4vw]">
        {stories.map((s, i) => (
          <Link key={s.slug} href={`/stories/${s.slug}`} className={`group w-[82vw] shrink-0 snap-start sm:w-[46vw] lg:w-[34vw] ${i % 2 ? "lg:mt-16" : ""}`}>
            <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
              <Image src={s.coverImage} alt={`${s.coupleNames} — ${s.title}`} fill sizes="(min-width:1024px) 34vw, 82vw" className="object-cover transition duration-[1.4s] ease-out group-hover:scale-[1.05]" />
              <span className="absolute left-4 top-4 bg-ivory/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]">{s.category}</span>
            </div>
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <h3 className="font-display text-3xl">{s.coupleNames}</h3>
              <span className="shrink-0 text-xs uppercase tracking-[0.18em] text-muted">{s.location}</span>
            </div>
            <p className="mt-1 text-sm italic text-muted">{s.title}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/80">{s.excerpt}</p>
            {s.shootDate && <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-taupe">{formatDate(s.shootDate, { month: "long", year: "numeric" })}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

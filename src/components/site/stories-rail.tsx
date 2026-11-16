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
        <button onClick={() => scroll(-1)} className="grid size-10 place-items-center rounded-full border border-charcoal/15 transition-colors duration-150 hover:border-charcoal" aria-label="Previous stories">
          <ArrowLeft className="size-4" />
        </button>
        <button onClick={() => scroll(1)} className="grid size-10 place-items-center rounded-full border border-charcoal/15 transition-colors duration-150 hover:border-charcoal" aria-label="Next stories">
          <ArrowRight className="size-4" />
        </button>
      </div>
      <div ref={rail} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {stories.map((s) => (
          <Link key={s.slug} href={`/stories/${s.slug}`} className="group w-[78vw] shrink-0 snap-start sm:w-[42vw] lg:w-[calc((100%-2.5rem)/3)]">
            <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
              <Image src={s.coverImage} alt={`${s.coupleNames} — ${s.title}`} fill sizes="(min-width:1024px) 34vw, 82vw" quality={85} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <span className="absolute left-3 top-3 bg-ivory/90 px-2 py-1 text-xs">{s.category}</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <h3 className="font-display text-2xl">{s.coupleNames}</h3>
              <span className="shrink-0 text-xs text-muted">{s.location}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {s.title}
              {s.shootDate ? ` · ${formatDate(s.shootDate, { month: "long", year: "numeric" })}` : ""}
            </p>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/80">{s.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

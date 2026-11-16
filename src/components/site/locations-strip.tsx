"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { LOCATIONS } from "@/content/site";
import { photo } from "@/content/photos";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Desktop: a row of slim photographs; the one you point at opens up to show
 * its season and golden hour. Phones get a simple two-column grid.
 */
export function LocationsStrip() {
  const [active, setActive] = useState(0);
  return (
    <>
      <div className="hidden h-[460px] gap-2 lg:flex">
        {LOCATIONS.map((l, i) => {
          const open = i === active;
          const p = photo(l.photos[0]);
          return (
            <Link
              key={l.slug}
              href={`/locations/${l.slug}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group relative min-w-0 overflow-hidden transition-[flex-grow] duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ flexGrow: open ? 4 : 1, flexBasis: 0 }}
              aria-label={`${l.name}, ${l.region}`}
            >
              <Image src={p.src} alt={`${l.name} pre-wedding photography`} fill sizes="(min-width:1024px) 45vw, 50vw" quality={85} className={cn("object-cover transition-transform duration-700", open ? "scale-100" : "scale-[1.08]")} />
              <span className={cn("absolute inset-0 transition-colors duration-500", open ? "bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" : "bg-charcoal/45")} />
              <span className="absolute inset-x-4 bottom-5 text-ivory">
                <span className="block text-xs text-ivory/75">{l.region}</span>
                <span className={cn("font-display block leading-tight", open ? "text-2xl" : "text-xl")}>{l.name}</span>
                <AnimatePresence>
                  {open && (
                    <motion.span key="more" className="mt-3 block max-w-sm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, delay: 0.15, ease: EASE }}>
                      <span className="block text-sm leading-relaxed text-ivory/85">{l.headline}</span>
                      <span className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ivory/70">
                        <span>Best season · {l.bestSeason}</span>
                        <span>Golden hour · {l.goldenHour}</span>
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <ArrowUpRight className={cn("absolute right-4 top-4 size-5 text-ivory transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} />
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:hidden">
        {LOCATIONS.map((l) => {
          const p = photo(l.photos[0]);
          return (
            <Link key={l.slug} href={`/locations/${l.slug}`} className="relative block aspect-[3/4] overflow-hidden">
              <Image src={p.src} alt={`${l.name} pre-wedding photography`} fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/10 to-transparent" />
              <span className="absolute inset-x-4 bottom-4 text-ivory">
                <span className="block text-xs text-ivory/75">{l.region}</span>
                <span className="font-display text-xl">{l.name}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

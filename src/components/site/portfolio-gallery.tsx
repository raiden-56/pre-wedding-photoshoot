"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lightbox } from "./lightbox";
import { cn } from "@/lib/utils";

export type PortfolioImage = { id: string; src: string; width: number; height: number; alt: string; category: string; location?: string | null };

/**
 * Editorial masonry: a large feature image, then mixed-size tiles.
 * Category filter animates with shared layout transitions.
 */
export function PortfolioGallery({ items, categories, initial = "All", feature = true }: { items: PortfolioImage[]; categories?: readonly string[]; initial?: string; feature?: boolean }) {
  const [filter, setFilter] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);
  const visible = useMemo(() => (filter === "All" ? items : items.filter((i) => i.category === filter)), [items, filter]);
  const [hero, ...rest] = visible;

  return (
    <div>
      {categories && (
        <div className="no-scrollbar -mx-4 mb-10 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn("relative h-9 shrink-0 rounded-full px-4 text-[12px] tracking-wide transition", filter === c ? "text-ivory" : "text-ink hover:bg-charcoal/5")}
            >
              {filter === c && <motion.span layoutId="pf-pill" className="absolute inset-0 rounded-full bg-charcoal" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <span className="relative">{c}</span>
            </button>
          ))}
        </div>
      )}

      {feature && hero && (
        <motion.button layout onClick={() => setOpen(0)} className="group relative mb-3 block aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9]" aria-label={`Open ${hero.alt}`}>
          <Image src={hero.src} alt={hero.alt} fill sizes="100vw" quality={85} className="object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 to-transparent opacity-80" />
          <span className="absolute bottom-5 left-5 text-left text-ivory">
            <span className="block text-xs text-ivory/80">{hero.category}</span>
            <span className="font-display text-xl sm:text-2xl">{hero.location}</span>
          </span>
        </motion.button>
      )}

      <motion.div layout className="columns-2 gap-3 md:columns-3 xl:columns-4 [&>*]:mb-3">
        <AnimatePresence mode="popLayout">
          {(feature ? rest : visible).map((it) => {
            const idx = visible.indexOf(it);
            return (
              <motion.button
                layout
                key={it.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setOpen(idx)}
                className="group relative block w-full break-inside-avoid overflow-hidden bg-ivory-deep"
                style={{ aspectRatio: `${it.width} / ${it.height}` }}
                aria-label={`Open ${it.alt}`}
              >
                <Image src={it.src} alt={it.alt} fill sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw" quality={85} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <span className="absolute inset-0 bg-charcoal/0 transition duration-500 group-hover:bg-charcoal/25" />
                <span className="absolute bottom-3 left-3 text-left text-xs text-ivory opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {it.location ?? it.category}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <Lightbox items={visible.map((v) => ({ ...v, caption: `${v.alt}${v.location ? ` — ${v.location}` : ""}` }))} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}

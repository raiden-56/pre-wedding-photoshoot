"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type T = { id: string; coupleNames: string; review: string; rating: number; photoUrl: string | null; category: string | null; location: string | null; isSample: boolean };

export function Testimonials({ items }: { items: T[] }) {
  const [i, setI] = useState(0);
  if (!items.length) return null;
  const t = items[i];
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12">
      <div className="relative aspect-[4/5] max-h-[460px] w-full overflow-hidden bg-ivory-deep lg:col-span-4">
        <AnimatePresence mode="popLayout">
          {t.photoUrl && (
            <motion.div key={t.id} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0">
              <Image src={t.photoUrl} alt={`Photograph accompanying the words of ${t.coupleNames}`} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="lg:col-span-7 lg:col-start-6">
        <AnimatePresence mode="wait">
          <motion.div key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.6 }}>
            <blockquote className="font-display text-2xl leading-snug sm:text-3xl">“{t.review}”</blockquote>
            <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-sm font-medium">{t.coupleNames}</p>
              <p className="text-sm text-muted">
                {t.category} · {t.location}
              </p>
            </div>
            {t.isSample && <p className="mt-3 text-xs text-muted">Illustrative sample testimonial</p>}
          </motion.div>
        </AnimatePresence>
        <div className="mt-8 flex gap-2">
          {items.map((x, k) => (
            <button key={x.id} onClick={() => setI(k)} className={`h-1 w-8 transition-colors duration-150 ${k === i ? "bg-charcoal" : "bg-charcoal/15 hover:bg-charcoal/30"}`} aria-label={`Show testimonial ${k + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

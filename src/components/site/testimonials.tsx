"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Star } from "lucide-react";

type T = { id: string; coupleNames: string; review: string; rating: number; photoUrl: string | null; category: string | null; location: string | null; isSample: boolean };

export function Testimonials({ items }: { items: T[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % items.length), 8000);
    return () => clearInterval(id);
  }, [items.length]);
  if (!items.length) return null;
  const t = items[i];
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12">
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep lg:col-span-5">
        <AnimatePresence mode="popLayout">
          {t.photoUrl && (
            <motion.div key={t.id} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0">
              <Image src={t.photoUrl} alt={`Photograph accompanying the words of ${t.coupleNames}`} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="lg:col-span-6 lg:col-start-7">
        <p className="font-display text-[9rem] leading-[0.6] text-champagne-deep">“</p>
        <AnimatePresence mode="wait">
          <motion.div key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.6 }}>
            <blockquote className="font-display text-3xl leading-snug sm:text-[2.6rem]">{t.review}</blockquote>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex gap-0.5 text-olive" aria-label={`${t.rating} out of 5`}>
                {Array.from({ length: t.rating }).map((_, k) => (
                  <Star key={k} className="size-3.5 fill-current" />
                ))}
              </div>
              <p className="text-sm font-medium">{t.coupleNames}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                {t.category} · {t.location}
              </p>
            </div>
            {t.isSample && <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-taupe">Illustrative sample testimonial — replace with real client words</p>}
          </motion.div>
        </AnimatePresence>
        <div className="mt-10 flex gap-2">
          {items.map((x, k) => (
            <button key={x.id} onClick={() => setI(k)} className={`h-[3px] transition-all duration-500 ${k === i ? "w-10 bg-charcoal" : "w-5 bg-line hover:bg-taupe"}`} aria-label={`Show testimonial ${k + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

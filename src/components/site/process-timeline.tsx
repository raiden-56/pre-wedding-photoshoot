"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PROCESS_STEPS } from "@/content/site";
import { photo } from "@/content/photos";

/**
 * Scroll-driven journey (GSAP ScrollTrigger). The thread draws as you scroll,
 * each step lights up, and a sticky photograph follows the active step.
 */
export function ProcessTimeline() {
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ctx = gsap.context(() => {
        if (!reduce) {
          gsap.fromTo(line.current, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top 60%", end: "bottom 70%", scrub: 0.6 } });
        }
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((el, i) => {
          ScrollTrigger.create({ trigger: el, start: "top 60%", end: "bottom 60%", onToggle: (self) => self.isActive && setActive(i) });
          if (!reduce) gsap.from(el, { opacity: 0.15, y: 40, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
        });
      }, root);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  const current = photo(PROCESS_STEPS[active].photo);

  return (
    <div ref={root} className="grid gap-12 lg:grid-cols-12">
      <div className="relative lg:col-span-6">
        <div className="absolute bottom-0 left-[1.15rem] top-0 w-px bg-line">
          <div ref={line} className="h-full w-full origin-top bg-olive" />
        </div>
        <ol className="space-y-6">
          {PROCESS_STEPS.map((s, i) => (
            <li key={s.n} data-step className="relative grid grid-cols-[2.5rem_1fr] gap-5 py-8 sm:py-12">
              <span className={`relative z-10 grid size-9 place-items-center rounded-full border text-[11px] tabular-nums transition duration-500 ${i <= active ? "border-olive bg-olive text-white" : "border-line bg-ivory text-muted"}`}>
                {s.n}
              </span>
              <div>
                <h3 className={`font-display text-5xl transition duration-500 sm:text-6xl ${i === active ? "text-charcoal" : "text-charcoal/35"}`}>{s.title}</h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">{s.body}</p>
                <div className="relative mt-5 aspect-[4/3] overflow-hidden lg:hidden">
                  <Image src={photo(s.photo).src} alt={photo(s.photo).alt} fill sizes="100vw" className="object-cover" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="hidden lg:col-span-6 lg:block">
        <div className="sticky top-28 aspect-[4/5] overflow-hidden bg-ivory-deep">
          <AnimatePresence mode="popLayout">
            <motion.div key={current.id} className="absolute inset-0" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
              <Image src={current.src} alt={current.alt} fill sizes="45vw" className="object-cover" />
            </motion.div>
          </AnimatePresence>
          <div className="absolute bottom-0 left-0 bg-ivory px-5 py-3">
            <p className="eyebrow">Step {PROCESS_STEPS[active].n}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

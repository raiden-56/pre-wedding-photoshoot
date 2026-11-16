"use client";

import { motion, useReducedMotion } from "motion/react";
import { PROCESS_STEPS } from "@/content/site";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Six steps from first hello to the delivered gallery. Each rule draws itself as the step arrives. */
export function ProcessTimeline() {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-28">
          <p className="eyebrow mb-4">Our process</p>
          <h2 className="font-display text-headline">From first hello to forever</h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink/80">Six unhurried steps, designed so you can simply enjoy each other while we look after everything else.</p>
        </div>
      </div>
      <ol className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-8">
        {PROCESS_STEPS.map((s, i) => (
          <motion.li
            key={s.n}
            className="relative pt-6"
            initial={reduce ? false : "hidden"}
            whileInView="shown"
            viewport={{ once: true, margin: "0px 0px -15% 0px" }}
            transition={{ staggerChildren: 0.08, delayChildren: (i % 2) * 0.12 }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-charcoal/10" />
            <motion.span aria-hidden className="absolute left-0 top-0 h-px w-full origin-left bg-olive" variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }} transition={{ duration: 0.9, ease: EASE }} />
            <motion.p className="text-xs tabular-nums text-olive-deep" variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}>
              {s.n}
            </motion.p>
            <motion.h3 className="font-display mt-2 text-2xl" variants={{ hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0 } }} transition={{ duration: 0.5, ease: EASE }}>
              {s.title}
            </motion.h3>
            <motion.p className="mt-2 text-sm leading-relaxed text-ink/80" variants={{ hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0 } }} transition={{ duration: 0.5, ease: EASE }}>
              {s.body}
            </motion.p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

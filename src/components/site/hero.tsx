"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { photo } from "@/content/photos";
import { TextLoop } from "@/components/motion/text-loop";
import { Magnetic } from "@/components/motion/magnetic";
import { ProgressiveBlur } from "@/components/motion/progressive-blur";

const words = ["Every", "Love", "Story", "Deserves", "Its", "Own", "Frame."];

export function HomeHero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.4 });
  const bgY = useTransform(smooth, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const bgScale = useTransform(smooth, [0, 1], [1.06, reduce ? 1.06 : 1.16]);
  const frontY = useTransform(smooth, [0, 1], ["0%", reduce ? "0%" : "-38%"]);
  const midY = useTransform(smooth, [0, 1], ["0%", reduce ? "0%" : "-22%"]);
  const textY = useTransform(smooth, [0, 1], ["0%", reduce ? "0%" : "30%"]);
  const fade = useTransform(smooth, [0, 0.7], [1, 0]);

  const main = photo("32");
  const left = photo("41");
  const right = photo("24");

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-charcoal text-ivory">
      {/* layer 1 — the photograph */}
      <motion.div className="absolute inset-0" style={{ y: bgY, scale: bgScale }}>
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { clipPath: "inset(18% 22% 18% 22%)", filter: "brightness(0.4)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)", filter: "brightness(1)" }}
          transition={{ duration: 1.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <Image src={main.src} alt={main.alt} fill priority sizes="100vw" quality={85} className="object-cover object-[50%_60%]" />
        </motion.div>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/45 via-charcoal/5 to-charcoal/55" />
      <ProgressiveBlur direction="bottom" blurIntensity={0.6} blurLayers={8} className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%]" />

      {/* layer 2 — floating prints for depth */}
      <motion.div
        style={{ y: midY }}
        initial={reduce ? false : { opacity: 0, y: 60, rotate: -8 }}
        animate={{ opacity: 1, y: 0, rotate: -5 }}
        transition={{ delay: 1.1, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-[24%] top-[16%] hidden w-[11vw] max-w-[190px] bg-ivory p-2 pb-8 shadow-2xl xl:block"
      >
        <div className="relative aspect-[4/5]">
          <Image src={left.src} alt={left.alt} fill sizes="220px" className="object-cover" />
        </div>
      </motion.div>
      <motion.div
        style={{ y: frontY }}
        initial={reduce ? false : { opacity: 0, y: 80, rotate: 9 }}
        animate={{ opacity: 1, y: 0, rotate: 4 }}
        transition={{ delay: 1.3, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-[16%] right-[6%] hidden w-[15vw] max-w-[250px] bg-ivory p-2 pb-9 shadow-2xl lg:block"
      >
        <div className="relative aspect-[4/5]">
          <Image src={right.src} alt={right.alt} fill sizes="250px" className="object-cover" />
        </div>
        <p className="font-display absolute bottom-2 left-3 text-sm italic text-charcoal/70">Agonda, 5:42 pm</p>
      </motion.div>

      {/* layer 3 — typography */}
      <motion.div style={{ y: textY, opacity: fade }} className="container-x relative z-10 flex h-full flex-col justify-end pb-24 sm:justify-center sm:pb-0">
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }} className="eyebrow mb-6 flex flex-wrap items-center gap-x-2 text-champagne">
          <span>Pre-wedding &amp; wedding photography ·</span>
          <TextLoop interval={2.6} className="min-w-[7rem]">
            {["Goa", "Udaipur", "Kerala", "Jaipur", "Coorg", "The Himalayas"].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </TextLoop>
        </motion.div>
        <h1 className="font-display max-w-[14ch] text-display">
          {words.map((w, i) => (
            <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-top">
              <motion.span
                className={`inline-block ${w === "Frame." ? "italic text-champagne" : ""}`}
                initial={reduce ? false : { y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ delay: 1 + i * 0.08, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.9 }}
          className="mt-7 max-w-md text-[15px] leading-relaxed text-ivory/85"
        >
          Beautifully captured moments, thoughtfully curated memories, and stories that stay with you forever.
        </motion.p>
        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9, duration: 0.9 }} className="mt-10 flex flex-wrap gap-3">
          <Magnetic intensity={0.25} range={120}>
            <Link href="/stories" className="group inline-flex h-12 items-center gap-2 bg-ivory px-7 text-[12px] font-medium uppercase tracking-[0.18em] text-charcoal transition-colors hover:bg-champagne">
              Explore Our Stories <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          <Magnetic intensity={0.25} range={120}>
            <Link href="/contact" className="inline-flex h-12 items-center border border-ivory/60 px-7 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ivory hover:text-charcoal">
              Book Your Photoshoot
            </Link>
          </Magnetic>
        </motion.div>
      </motion.div>

      <motion.a
        href="#intro"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4 }}
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-ivory/70"
        aria-label="Scroll to content"
      >
        Scroll
        <motion.span animate={reduce ? undefined : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <ArrowDown className="size-3.5" />
        </motion.span>
      </motion.a>
    </section>
  );
}

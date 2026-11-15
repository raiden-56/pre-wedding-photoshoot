"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { photo } from "@/content/photos";

const FrameScene = dynamic(() => import("./frame-scene"), { ssr: false, loading: () => null });

/**
 * Scroll-driven 3D moment (desktop only). The frame turns, pushes in, and
 * hands off to the real photograph. Mobile & reduced-motion get a static layout
 * and never download three.js.
 */
export function FrameShowcase() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const reduce = useReducedMotion();
  const [enable3d, setEnable3d] = useState(false);
  const [near, setNear] = useState(false);
  const p = photo("39");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px) and (pointer: fine)");
    const supportsGL = (() => {
      try {
        return !!document.createElement("canvas").getContext("webgl2");
      } catch {
        return false;
      }
    })();
    setEnable3d(mq.matches && supportsGL && !reduce);
  }, [reduce]);

  useEffect(() => {
    if (!section.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px" });
    io.observe(section.current);
    return () => io.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => (progress.current = Math.min(1, v / 0.8)));
  const photoOpacity = useTransform(scrollYProgress, [0.72, 0.86], [0, 1]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.35, 0.55], [1, 1, 0]);
  const finalText = useTransform(scrollYProgress, [0.85, 0.97], [0, 1]);

  if (!enable3d) {
    return (
      <section ref={section} className="container-x relative grid items-center gap-10 py-24 md:grid-cols-2">
        <div className="relative aspect-[4/5] bg-white p-3 shadow-[0_30px_60px_-30px_rgba(36,35,33,.45)] sm:p-5">
          <div className="relative h-full w-full">
            <Image src={p.src} alt={p.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
        <ShowcaseCopy />
      </section>
    );
  }

  return (
    <section ref={section} className="relative h-[260vh] bg-ivory-deep">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0">{near && <FrameScene src={p.src} aspect={p.width / p.height} progress={progress} />}</div>
        <motion.div style={{ opacity: textOpacity }} className="container-x pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center">
          <div className="max-w-sm">
            <p className="eyebrow mb-4">The frame</p>
            <p className="font-display text-5xl leading-[1.02]">We don’t take pictures. We make heirlooms.</p>
          </div>
        </motion.div>
        <motion.div style={{ opacity: photoOpacity }} className="absolute inset-0">
          <Image src={p.src} alt={p.alt} fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
        </motion.div>
        <motion.div style={{ opacity: finalText }} className="container-x absolute inset-x-0 bottom-14 text-ivory">
          <ShowcaseCopy light />
        </motion.div>
      </div>
    </section>
  );
}

function ShowcaseCopy({ light }: { light?: boolean }) {
  return (
    <div className="max-w-xl">
      <p className={`eyebrow mb-4 ${light ? "text-champagne" : ""}`}>Featured · Himachal</p>
      <p className="font-display text-4xl leading-tight sm:text-5xl">“The hill was ours for exactly eleven minutes of light.”</p>
      <p className={`mt-4 text-sm leading-relaxed ${light ? "text-ivory/80" : "text-muted"}`}>
        Every gallery we deliver is designed like a printed album — curated, sequenced and made to be passed between generations.
      </p>
      <Link href="/stories" className={`mt-6 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] ${light ? "text-ivory" : ""}`}>
        <span className="link-underline">Read the stories</span> <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

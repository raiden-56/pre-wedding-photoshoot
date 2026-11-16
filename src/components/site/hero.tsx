"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { photo } from "@/content/photos";

const EASE = [0.22, 1, 0.36, 1] as const;
const SLIDE_MS = 6500;

/** Each slide keeps its couple on the right so the type always sits on calm space. */
const SLIDES = [
  { id: "06", pos: "70% 35%", caption: "Golden meadow · late afternoon" },
  { id: "39", pos: "64% 55%", caption: "Hilltop · golden hour" },
  { id: "30", pos: "74% 55%", caption: "Lakeside pier · morning light" },
  { id: "49", pos: "55% 62%", caption: "Palm grove · golden sparks" },
  { id: "18", pos: "62% 50%", caption: "Woodland · afternoon sun" },
];

const HEADLINE = ["Every", "love", "story", "deserves", "its", "own", "frame"];

/**
 * The hero is the studio's idea in motion: a slow, cross-fading story of
 * photographs that, as you scroll, settles into a framed print with a white
 * mat — every love story deserves its own frame.
 */
export function HomeHero() {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // advance slides; pause when the tab is hidden
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused]);
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // scroll: full-bleed photograph → framed print
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });
  const insetY = useTransform(p, [0, 0.75], [0, 17]);
  const insetX = useTransform(p, [0, 0.75], [0, 17]);
  const insetB = useTransform(p, [0, 0.75], [0, 22]);
  const radius = useTransform(p, [0, 0.75], [0, 4]);
  const matPad = useTransform(p, [0.1, 0.75], [0, 1.6]);
  const photoClip = useMotionTemplate`inset(${insetY}% ${insetX}% ${insetB}% ${insetX}% round ${radius}px)`;
  const matClip = useMotionTemplate`inset(calc(${insetY}% - ${matPad}%) calc(${insetX}% - ${matPad}%) calc(${insetB}% - ${matPad}% * 4) calc(${insetX}% - ${matPad}%) round ${radius}px)`;
  const copyOpacity = useTransform(p, [0, 0.3], [1, 0]);
  const copyY = useTransform(p, [0, 0.3], [0, -40]);
  const captionOpacity = useTransform(p, [0.6, 0.85], [0, 1]);
  const captionY = useTransform(p, [0.6, 0.85], [16, 0]);
  const chromeOpacity = useTransform(p, [0, 0.2], [1, 0]);

  const slide = SLIDES[index];

  return (
    <section ref={wrap} className={reduce ? "relative" : "relative h-[175svh]"}>
      <div className="sticky top-0 h-[100svh] min-h-[480px] overflow-hidden bg-ivory-deep">
        {/* the white mat that appears around the print */}
        {!reduce && (
          <div className="pointer-events-none absolute inset-0 [filter:drop-shadow(0_24px_40px_rgba(36,35,33,0.22))]">
            <motion.div className="absolute inset-0 bg-white" style={{ clipPath: matClip }} />
          </div>
        )}

        {/* the photographs */}
        <motion.div className="absolute inset-0 bg-charcoal" style={reduce ? undefined : { clipPath: photoClip }}>
          {/* all slides stay mounted (and loaded) so a crossfade never reveals an empty frame */}
          {SLIDES.map((s, i) => {
            const on = i === index;
            return (
              <motion.div key={s.id} className="absolute inset-0" initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: 1.4, ease: "easeInOut" }} aria-hidden={!on}>
                <motion.div
                  className="absolute inset-0"
                  initial={reduce ? false : { scale: 1.1 }}
                  animate={{ scale: reduce ? 1 : on ? 1 : 1.1 }}
                  transition={on ? { duration: SLIDE_MS / 1000 + 1.4, ease: "linear" } : { duration: 0, delay: 1.4 }}
                >
                  <Image src={photo(s.id).src} alt={on ? photo(s.id).alt : ""} fill priority={i === 0} loading={i === 0 ? undefined : "eager"} sizes="100vw" quality={85} className="object-cover [object-position:55%_50%] sm:[object-position:var(--pos)]" style={{ "--pos": s.pos } as React.CSSProperties} />
                </motion.div>
              </motion.div>
            );
          })}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/35 to-charcoal/0" />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/40 via-transparent to-charcoal/60" />

          {/* copy */}
          <motion.div style={reduce ? undefined : { opacity: copyOpacity, y: copyY }} className="container-x relative z-10 flex h-full items-center pb-16 pt-24 text-ivory">
            <div className="max-w-xl">
              <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-sm text-champagne">
                Pre-wedding and wedding photography in India
              </motion.p>
              <h1 className="font-display mt-4 text-[2.5rem] leading-[1.05] sm:text-5xl lg:text-[3.5rem]">
                {HEADLINE.map((w, i) => (
                  <span key={i} className="mr-[0.24em] inline-block overflow-hidden pb-[0.08em] align-top last:mr-0">
                    <motion.span className="inline-block" initial={reduce ? false : { y: "105%" }} animate={{ y: "0%" }} transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: EASE }}>
                      {w}
                    </motion.span>
                  </span>
                ))}
              </h1>
              <motion.p initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.75, ease: EASE }} className="mt-5 max-w-md text-base leading-relaxed text-ivory/85 sm:text-[17px]">
                Beautifully captured moments, thoughtfully curated memories, and stories that stay with you forever.
              </motion.p>
              <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.9, ease: EASE }} className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className="group inline-flex h-12 items-center gap-2 bg-ivory px-6 text-sm font-medium text-charcoal transition-colors duration-150 hover:bg-champagne active:scale-[0.98]">
                  Book your photoshoot <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link href="/stories" className="inline-flex h-12 items-center border border-ivory/40 px-6 text-sm font-medium text-ivory transition-colors duration-150 hover:border-ivory hover:bg-ivory/10">
                  See our stories
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* slide progress + caption */}
          <motion.div style={reduce ? undefined : { opacity: chromeOpacity }} className="absolute inset-x-0 bottom-0 z-10">
            <div className="container-x flex items-end justify-between gap-6 pb-6 text-ivory">
              <div className="flex items-center gap-2" role="tablist" aria-label="Featured photographs">
                {SLIDES.map((s, i) => (
                  <button key={s.id} role="tab" aria-selected={i === index} aria-label={`Show photograph ${i + 1}: ${s.caption}`} onClick={() => setIndex(i)} className="group py-3">
                    <span className="block h-[2px] w-8 overflow-hidden bg-ivory/25 sm:w-12">
                      {i === index && <motion.span key={`${index}-${paused}`} className="block h-full origin-left bg-ivory" initial={{ scaleX: 0 }} animate={{ scaleX: paused ? 0 : 1 }} transition={{ duration: paused ? 0 : SLIDE_MS / 1000, ease: "linear" }} />}
                      {i < index && <span className="block h-full bg-ivory/70" />}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative h-5 min-w-0 flex-1 overflow-hidden text-right text-[13px] text-ivory/75">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p key={slide.id} className="absolute inset-0 truncate" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                    {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")} · {slide.caption}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* the caption under the finished print */}
        {!reduce && (
          <motion.div style={{ opacity: captionOpacity, y: captionY }} className="pointer-events-none absolute inset-x-0 bottom-[3%] text-center">
            <p className="font-display text-2xl text-charcoal sm:text-3xl">Every love story deserves its own frame</p>
            <p className="mt-1 text-[13px] text-muted">{slide.caption}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

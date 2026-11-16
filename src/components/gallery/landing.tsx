"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import type { ClientPhoto } from "@/lib/media";
import type { ViewerAlbum } from "@/server/gallery-data";
import { formatDate } from "@/lib/utils";
import { TextEffect } from "@/components/motion/text-effect";
import { ProgressiveBlur } from "@/components/motion/progressive-blur";
import { SlidingNumber } from "@/components/motion/sliding-number";
import { Tilt } from "@/components/motion/tilt";
import { Magnetic } from "@/components/motion/magnetic";
import { Logo } from "@/components/ui/misc";

type HeroProps = {
  slug: string;
  coupleNames: string;
  tagline: string | null;
  meta: string[];
  cover: ClientPhoto | null;
  photoCount: number;
  role: string;
};

/** Full-bleed cover with a clip-path reveal, parallax and per-letter title. */
export function GalleryHero({ slug, coupleNames, tagline, meta, cover, photoCount, role }: HeroProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "22%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.04, reduce ? 1.04 : 1.14]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[620px] overflow-hidden bg-charcoal text-ivory">
      {cover && (
        <motion.div className="absolute inset-0" style={{ y, scale }}>
          <motion.div
            className="absolute inset-0"
            initial={reduce ? false : { clipPath: "inset(14% 18% 14% 18%)", filter: "brightness(0.35)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)", filter: "brightness(1)" }}
            transition={{ duration: 1.9, ease: [0.76, 0, 0.24, 1] }}
          >
            {cover.blur && <div aria-hidden className="absolute inset-0 bg-cover bg-center blur-2xl" style={{ backgroundImage: `url(${cover.blur})` }} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.large} alt={cover.caption ?? `${coupleNames} cover photograph`} className="absolute inset-0 size-full object-cover" fetchPriority="high" />
          </motion.div>
        </motion.div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-charcoal/10 to-charcoal/70" />
      <ProgressiveBlur direction="bottom" blurIntensity={0.5} blurLayers={6} className="pointer-events-none absolute inset-x-0 bottom-0 h-[16%]" />

      <header className="absolute inset-x-0 top-0 z-10">
        <div className="container-x flex items-center justify-between py-6">
          <Link href="/" aria-label="Saanjh Studio">
            <Logo light />
          </Link>
          <p className="text-[10px] uppercase tracking-[0.3em] text-ivory/70">{role === "STAFF" ? "Studio preview" : "Private gallery"}</p>
        </div>
      </header>

      <motion.div style={{ y: textY, opacity: fade }} className="container-x relative z-10 flex h-full flex-col items-center justify-end pb-28 text-center">
        <motion.p initial={reduce ? false : { opacity: 0, letterSpacing: "0.6em" }} animate={{ opacity: 1, letterSpacing: "0.32em" }} transition={{ delay: 1, duration: 1.4 }} className="eyebrow mb-6 text-ivory/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]">
          {meta.join("  ·  ")}
        </motion.p>
        <TextEffect as="h1" per="char" preset="blur" delay={1.05} speedReveal={0.9} className="font-display text-[clamp(3.4rem,11vw,10rem)] leading-[0.9] [text-shadow:0_2px_30px_rgba(0,0,0,0.25)]">
          {coupleNames}
        </TextEffect>
        {tagline && (
          <motion.p initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9, duration: 1 }} className="font-display mt-5 text-2xl italic text-ivory/85 sm:text-3xl">
            {tagline}
          </motion.p>
        )}
        <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.9 }} className="mt-10 flex flex-wrap justify-center gap-3">
          <Magnetic intensity={0.2} range={110}>
            <a href="#photos" className="inline-flex h-12 items-center gap-2 bg-ivory px-7 text-[12px] font-medium uppercase tracking-[0.18em] text-charcoal transition hover:bg-champagne">
              View {photoCount} photographs <ArrowDown className="size-4" />
            </a>
          </Magnetic>
          <Magnetic intensity={0.2} range={110}>
            <Link href={`/gallery/${slug}/slideshow`} className="inline-flex h-12 items-center gap-2 border border-ivory/55 px-7 text-[12px] uppercase tracking-[0.18em] backdrop-blur-sm transition hover:bg-ivory hover:text-charcoal">
              <Play className="size-3.5" /> Slideshow
            </Link>
          </Magnetic>
        </motion.div>
      </motion.div>
    </section>
  );
}

/** Live countdown with rolling digits. */
export function Countdown({ date, label }: { date: string; label?: string | null }) {
  const target = new Date(date).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null || target <= now) return null;
  const s = Math.floor((target - now) / 1000);
  const parts = [
    { v: Math.floor(s / 86400), l: "Days" },
    { v: Math.floor((s % 86400) / 3600), l: "Hours" },
    { v: Math.floor((s % 3600) / 60), l: "Minutes" },
    { v: s % 60, l: "Seconds" },
  ];
  return (
    <div className="text-center">
      <p className="eyebrow mb-6">{formatDate(date, { day: "numeric", month: "long", year: "numeric" })}</p>
      <div className="flex items-start justify-center gap-4 sm:gap-10" role="timer" aria-label={`${parts[0].v} days ${label ?? "to go"}`}>
        {parts.map((p, i) => (
          <div key={p.l} className="flex items-start gap-4 sm:gap-10">
            <div className="flex flex-col items-center">
              <div className="font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-none tabular-nums">
                <SlidingNumber value={p.v} padStart />
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-muted">{p.l}</p>
            </div>
            {i < parts.length - 1 && <span className="font-display pt-2 text-[clamp(2rem,5vw,4rem)] leading-none text-taupe">:</span>}
          </div>
        ))}
      </div>
      <p className="font-display mt-6 text-2xl italic text-olive">{label ?? "to go"}</p>
    </div>
  );
}

export function AlbumCards({ slug, albums }: { slug: string; albums: ViewerAlbum[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {albums.map((a, i) => (
        <motion.div key={a.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} className="w-[72vw] shrink-0 snap-start sm:w-auto">
          <Tilt rotationFactor={6} isRevese>
            <Link href={`/gallery/${slug}/${a.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
                {a.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover.medium} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-[1.4s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.06]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/5 to-transparent" />
                <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-ivory/15 text-ivory opacity-0 backdrop-blur-md transition duration-500 group-hover:opacity-100">
                  <ArrowUpRight className="size-4" />
                </span>
                <div className="absolute inset-x-5 bottom-5 text-ivory">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-champagne">{String(i + 1).padStart(2, "0")} · {a.count} photographs</p>
                  <p className="font-display mt-1.5 text-3xl leading-tight">{a.title}</p>
                </div>
              </div>
            </Link>
          </Tilt>
        </motion.div>
      ))}
    </div>
  );
}

type Moment = { id: string; title: string; date: string | null; description: string | null; photo: { src: string; width: number; height: number; blur: string | null } | null };

/** Alternating timeline with a line that draws itself as you scroll. */
export function LoveStory({ moments }: { moments: Moment[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <div ref={ref} className="relative mx-auto max-w-5xl">
      <div className="absolute bottom-0 left-4 top-0 w-px bg-line md:left-1/2" />
      <motion.div style={{ scaleY }} className="absolute bottom-0 left-4 top-0 w-px origin-top bg-olive md:left-1/2" />
      <ol className="space-y-16 md:space-y-24">
        {moments.map((m, i) => {
          const right = i % 2 === 1;
          return (
            <li key={m.id} className="relative grid items-center gap-6 pl-12 md:grid-cols-2 md:gap-16 md:pl-0">
              <span className="absolute left-4 top-2 size-3 -translate-x-1/2 rounded-full border-2 border-ivory bg-olive ring-1 ring-olive md:left-1/2 md:top-1/2 md:-translate-y-1/2" />
              <motion.div
                initial={{ opacity: 0, x: right ? 40 : -40, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className={right ? "md:order-2 md:pl-4" : "md:pr-4 md:text-right"}
              >
                  {m.date && <p className="eyebrow">{formatDate(m.date, { month: "long", year: "numeric" })}</p>}
                  <h3 className="font-display mt-2 text-4xl leading-tight">{m.title}</h3>
                  {m.description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{m.description}</p>}
              </motion.div>
              {m.photo ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, clipPath: "inset(10% 10% 10% 10%)" }}
                  whileInView={{ opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0%)" }}
                  viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className={right ? "md:order-1" : ""}
                >
                    <div className="relative overflow-hidden bg-ivory-deep" style={{ aspectRatio: `${m.photo.width} / ${m.photo.height}` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.photo.src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                    </div>
                </motion.div>
              ) : (
                <div className={right ? "md:order-1" : ""} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

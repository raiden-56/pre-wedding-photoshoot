"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Maximize, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import type { ClientPhoto } from "@/lib/media";

const KB = [
  { from: { scale: 1.02, x: "0%", y: "0%" }, to: { scale: 1.14, x: "-2%", y: "-1.5%" } },
  { from: { scale: 1.14, x: "2%", y: "1%" }, to: { scale: 1.03, x: "0%", y: "0%" } },
  { from: { scale: 1.05, x: "-1.5%", y: "1.5%" }, to: { scale: 1.15, x: "1.5%", y: "-1%" } },
];

/** Full-screen Ken Burns slideshow with crossfades, progress, keyboard & optional music. */
export function Slideshow({ slug, title, photos, seconds, music }: { slug: string; title: string; photos: ClientPhoto[]; seconds: number; music: string | null }) {
  const images = photos.filter((p) => p.kind === "IMAGE");
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [chrome, setChrome] = useState(true);
  const audio = useRef<HTMLAudioElement>(null);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dur = Math.max(3, seconds);

  const go = useCallback((d: number) => setI((v) => (v + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!playing || images.length < 2) return;
    const t = setTimeout(() => go(1), dur * 1000);
    return () => clearTimeout(t);
  }, [i, playing, dur, go, images.length]);

  useEffect(() => {
    const n = images[(i + 1) % images.length];
    if (n) new Image().src = n.large;
  }, [i, images]);

  useEffect(() => {
    const wake = () => {
      setChrome(true);
      clearTimeout(idle.current);
      idle.current = setTimeout(() => setChrome(false), 2600);
    };
    const onKey = (e: KeyboardEvent) => {
      wake();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("touchstart", wake);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(idle.current);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", onKey);
    };
  }, [go]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.muted = muted;
    if (playing && !muted) a.play().catch(() => {});
    else a.pause();
  }, [muted, playing]);

  if (!images.length) {
    return (
      <div className="grid min-h-svh place-items-center bg-charcoal text-ivory">
        <div className="text-center">
          <p className="font-display text-4xl">No photographs to show yet</p>
          <Link href={`/gallery/${slug}`} className="mt-6 inline-block text-xs uppercase tracking-[0.2em] underline underline-offset-4">
            Back to gallery
          </Link>
        </div>
      </div>
    );
  }

  const p = images[i];
  const kb = KB[i % KB.length];

  return (
    <div className={`fixed inset-0 overflow-hidden bg-black text-ivory ${chrome ? "" : "cursor-none"}`}>
      <AnimatePresence initial={false}>
        <motion.div key={p.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.6, ease: "easeInOut" }}>
          {/* blurred fill behind portrait photographs */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.thumb} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-50 blur-3xl" />
          <motion.div className="absolute inset-0" initial={reduce ? false : kb.from} animate={reduce ? undefined : kb.to} transition={{ duration: dur + 1.6, ease: "linear" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.large} alt={p.caption ?? ""} className={`absolute inset-0 size-full ${p.width >= p.height ? "object-cover" : "object-contain"}`} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />

      {music && <audio ref={audio} src={music} loop preload="none" />}

      <motion.div animate={{ opacity: chrome ? 1 : 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 flex flex-col justify-between" style={{ pointerEvents: chrome ? "auto" : "none" }}>
        <div className="flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-5 py-4 sm:px-8">
          <p className="font-display text-xl">{title}</p>
          <div className="flex items-center gap-1">
            {music && (
              <Ctrl label={muted ? "Play music" : "Mute music"} onClick={() => setMuted((m) => !m)}>
                {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
              </Ctrl>
            )}
            <Ctrl label="Full screen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}>
              <Maximize className="size-[18px]" />
            </Ctrl>
            <Link href={`/gallery/${slug}`} aria-label="Exit slideshow" className="grid size-10 place-items-center rounded-full text-ivory/80 hover:bg-white/10">
              <X className="size-5" />
            </Link>
          </div>
        </div>
        <div className="bg-gradient-to-t from-black/55 to-transparent px-5 pb-6 pt-16 sm:px-8">
          <div className="flex items-center justify-center gap-3">
            <Ctrl label="Previous" onClick={() => go(-1)}>
              <ChevronLeft className="size-5" />
            </Ctrl>
            <button onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause" : "Play"} className="grid size-14 place-items-center rounded-full bg-ivory text-charcoal transition hover:bg-champagne">
              {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
            </button>
            <Ctrl label="Next" onClick={() => go(1)}>
              <ChevronRight className="size-5" />
            </Ctrl>
          </div>
          <div className="mx-auto mt-5 flex max-w-3xl items-center gap-4">
            <span className="text-[11px] tabular-nums tracking-widest text-ivory/60">{String(i + 1).padStart(2, "0")}</span>
            <div className="h-px flex-1 bg-ivory/20">
              <motion.div key={`${i}-${playing}`} className="h-px origin-left bg-ivory" initial={{ scaleX: 0 }} animate={{ scaleX: playing ? 1 : 0 }} transition={{ duration: playing ? dur : 0, ease: "linear" }} />
            </div>
            <span className="text-[11px] tabular-nums tracking-widest text-ivory/60">{String(images.length).padStart(2, "0")}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Ctrl({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid size-10 place-items-center rounded-full text-ivory/80 transition hover:bg-white/10 hover:text-ivory">
      {children}
    </button>
  );
}

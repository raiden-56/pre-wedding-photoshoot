"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxItem = { src: string; width: number; height: number; alt: string; caption?: string };

/** Lightweight immersive viewer for public portfolio images. */
export function Lightbox({ items, index, onIndex, onClose }: { items: LightboxItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const touch = useRef<number | null>(null);
  const go = useCallback((d: number) => index != null && onIndex((index + d + items.length) % items.length), [index, items.length, onIndex]);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, go, onClose]);

  const item = index != null ? items[index] : null;
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#151413]/97"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current == null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touch.current = null;
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-[82svh] w-[92vw]"
            >
              <Image src={item.src} alt={item.alt} fill sizes="92vw" quality={85} className="object-contain" priority />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-5 py-4 text-ivory/70">
            <p className="max-w-[70vw] truncate text-xs">{item.caption ?? item.alt}</p>
            <p className="text-xs tabular-nums tracking-widest">
              {String((index ?? 0) + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </p>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 grid size-11 place-items-center rounded-full text-ivory/80 hover:bg-white/10" aria-label="Close viewer">
            <X className="size-5" />
          </button>
          <button onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full text-ivory/80 hover:bg-white/10 sm:grid" aria-label="Previous photo">
            <ChevronLeft className="size-6" />
          </button>
          <button onClick={() => go(1)} className="absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full text-ivory/80 hover:bg-white/10 sm:grid" aria-label="Next photo">
            <ChevronRight className="size-6" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

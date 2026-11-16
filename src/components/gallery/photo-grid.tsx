"use client";

import { memo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Expand, Heart, Play } from "lucide-react";
import type { ClientPhoto } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useGallery } from "./context";

/**
 * Justified rows in pure CSS: each tile grows in proportion to its aspect
 * ratio, so rows fill the width without measuring anything in JS. A huge
 * trailing spacer stops the last row from stretching.
 */
export function PhotoGrid({ photos, layout, onOpen }: { photos: ClientPhoto[]; layout: "justified" | "grid"; onOpen: (index: number) => void }) {
  if (layout === "grid") {
    return (
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {photos.map((p, i) => (
          <Tile key={p.id} photo={p} index={i} onOpen={onOpen} square />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5 [--row-h:140px] sm:[--row-h:210px] lg:[--row-h:290px] 2xl:[--row-h:340px]">
      {photos.map((p, i) => (
        <Tile key={p.id} photo={p} index={i} onOpen={onOpen} />
      ))}
      <div aria-hidden style={{ flexGrow: 1e9 }} />
    </div>
  );
}

const Tile = memo(function Tile({ photo, index, onOpen, square }: { photo: ClientPhoto; index: number; onOpen: (i: number) => void; square?: boolean }) {
  const { view, isFavorite, toggle } = useGallery();
  const reduce = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const ar = photo.width / photo.height;
  const fav = isFavorite(photo.id);

  return (
    <motion.figure
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, delay: (index % 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative overflow-hidden bg-ivory-deep", square && "aspect-square")}
      style={square ? undefined : { flexGrow: ar * 100, flexBasis: `calc(var(--row-h) * ${ar.toFixed(3)})` }}
    >
      {!square && <i aria-hidden className="block" style={{ paddingBottom: `${(100 / ar).toFixed(3)}%` }} />}
      <button type="button" onClick={() => onOpen(index)} className="absolute inset-0 block size-full cursor-zoom-in" aria-label={`Open ${photo.caption ?? photo.filename}`}>
        {photo.blur && <span aria-hidden className="absolute inset-0 scale-110 bg-cover bg-center blur-xl" style={{ backgroundImage: `url(${photo.blur})` }} />}
        {photo.kind === "VIDEO" ? (
          <>
            <video src={photo.video} preload="metadata" muted playsInline className="absolute inset-0 size-full object-cover" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-14 place-items-center rounded-full bg-charcoal/50 text-ivory backdrop-blur-sm">
                <Play className="size-5 translate-x-0.5" />
              </span>
            </span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- signed, pre-sized private variants
          <img
            src={photo.thumb}
            srcSet={`${photo.thumb} 520w, ${photo.medium} 1400w`}
            sizes={square ? "(min-width:1024px) 20vw, 50vw" : `${Math.round(ar * 340)}px`}
            alt={photo.caption ?? ""}
            loading={index < 8 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            className={cn("absolute inset-0 size-full object-cover transition-[opacity,transform,filter] duration-[1.1s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.035]", loaded ? "opacity-100 blur-0" : "opacity-0 blur-sm")}
          />
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-charcoal/45 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <Expand aria-hidden className="absolute bottom-3 right-3 size-4 text-ivory opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </button>
      {view.perms.favorite && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.8 }}
          onClick={() => toggle(photo.id)}
          aria-pressed={fav}
          aria-label={fav ? "Remove from favourites" : "Add to favourites"}
          className={cn(
            "absolute left-2.5 top-2.5 grid size-9 place-items-center rounded-full backdrop-blur-md transition-all duration-300",
            fav ? "bg-ivory/90 text-danger opacity-100" : "bg-charcoal/25 text-ivory opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100",
          )}
        >
          <Heart className={cn("size-4 transition-transform", fav && "fill-current")} />
        </motion.button>
      )}
    </motion.figure>
  );
});


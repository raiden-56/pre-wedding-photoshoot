"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Download, Grid2x2, Heart, ImagePlus, LayoutDashboard, Play, Rows3, Share2, X } from "lucide-react";
import type { GalleryView } from "@/server/gallery-data";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/motion/animated-background";
import { recordGalleryOpen } from "@/server/actions/gallery";
import { GalleryProvider, useGallery } from "./context";
import { DownloadProvider, useDownloads } from "./downloads";
import { PhotoGrid } from "./photo-grid";
import { GalleryLightbox } from "./lightbox";
import { SelectionsDialog } from "./selections";
import { ShareDialog } from "./share-dialog";

type Props = {
  view: GalleryView;
  albumId: string | null;
  sharedList?: { name: string; photoIds: string[] } | null;
  initialPhotoId?: string | null;
};

export function GalleryViewer(props: Props) {
  return (
    <GalleryProvider view={props.view}>
      <DownloadProvider slug={props.view.slug}>
        <ViewerInner {...props} />
      </DownloadProvider>
    </GalleryProvider>
  );
}

function ViewerInner({ view, albumId, sharedList, initialPhotoId }: Props) {
  const { activeList } = useGallery();
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [layout, setLayout] = useState<"justified" | "grid">(view.settings.defaultView === "grid" ? "grid" : "justified");

  const photos = useMemo(() => {
    let list = albumId ? view.photos.filter((p) => p.albumId === albumId) : view.photos;
    if (sharedList) {
      const set = new Set(sharedList.photoIds);
      list = view.photos.filter((p) => set.has(p.id));
    } else if (onlyFavs) {
      const set = new Set(activeList?.photoIds ?? []);
      list = list.filter((p) => set.has(p.id));
    }
    return list;
  }, [view.photos, albumId, sharedList, onlyFavs, activeList]);

  const [index, setIndex] = useState<number | null>(() => {
    if (!initialPhotoId) return null;
    const i = photos.findIndex((p) => p.id === initialPhotoId);
    return i >= 0 ? i : null;
  });

  useEffect(() => {
    recordGalleryOpen(view.slug).catch(() => {});
  }, [view.slug]);

  return (
    <section id="photos" className="scroll-mt-4">
      <Toolbar albumId={albumId} onlyFavs={onlyFavs} setOnlyFavs={setOnlyFavs} layout={layout} setLayout={setLayout} count={photos.length} />
      {sharedList && (
        <div className="container-x mb-6 mt-2 flex items-center justify-between gap-3 border border-champagne bg-champagne/30 px-4 py-3 text-sm">
          <span>
            Viewing a shared list: <strong className="font-medium">{sharedList.name}</strong> · {sharedList.photoIds.length} photographs
          </span>
          <Link href={`/gallery/${view.slug}/all`} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em]">
            <X className="size-3.5" /> Clear
          </Link>
        </div>
      )}
      <div className="px-1.5 pb-24 sm:px-3">
        {photos.length ? (
          <PhotoGrid photos={photos} layout={layout} onOpen={setIndex} />
        ) : (
          <div className="container-x py-24 text-center">
            <Heart className="mx-auto size-6 text-taupe" />
            <p className="font-display mt-4 text-3xl">{onlyFavs ? "No favourites yet" : "Nothing here yet"}</p>
            <p className="mt-2 text-sm text-muted">{onlyFavs ? "Tap the heart on a photograph and it will appear here." : "Your photographer is still adding photographs."}</p>
          </div>
        )}
      </div>
      <GalleryLightbox photos={photos} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </section>
  );
}

function Toolbar({ albumId, onlyFavs, setOnlyFavs, layout, setLayout, count }: { albumId: string | null; onlyFavs: boolean; setOnlyFavs: (v: boolean) => void; layout: "justified" | "grid"; setLayout: (l: "justified" | "grid") => void; count: number }) {
  const { view, activeList } = useGallery();
  const { downloadZip, zipBusy } = useDownloads();
  const album = view.albums.find((a) => a.id === albumId);
  const scope = view.settings.downloadScope;
  const favCount = activeList?.photoIds.length ?? 0;
  const canAlbumZip = view.perms.download && album && ["ALBUM", "FULL"].includes(scope);
  const canFullZip = view.perms.download && scope === "FULL";

  return (
    <div className="sticky top-0 z-30 mb-3 border-b border-line/70 bg-ivory/85 backdrop-blur-xl">
      <div className="container-x flex items-center gap-3 py-2.5">
        <nav aria-label="Albums" className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center overflow-x-auto px-1">
          <AnimatedBackground defaultValue={albumId ?? "all"} className="rounded-full bg-charcoal" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}>
            {[{ id: "all", title: "All", slug: "all", count: view.photos.length }, ...view.albums].map((a) => (
              <Link
                key={a.id}
                data-id={a.id}
                href={`/gallery/${view.slug}/${a.slug}`}
                scroll={false}
                className="whitespace-nowrap px-4 py-1.5 text-[12px] tracking-wide text-ink transition-colors duration-300 data-[checked=true]:text-ivory"
              >
                {a.title} <span className="ml-1 text-[10px] tabular-nums opacity-55">{a.count}</span>
              </Link>
            ))}
          </AnimatedBackground>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          {view.perms.favorite && (
            <>
              <ToolBtn label={onlyFavs ? "Show all photographs" : "Show favourites only"} active={onlyFavs} onClick={() => setOnlyFavs(!onlyFavs)}>
                <Heart className={cn("size-4", onlyFavs && "fill-current")} />
                <motion.span key={favCount} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[11px] tabular-nums">
                  {favCount}
                </motion.span>
              </ToolBtn>
              <SelectionsDialog
                trigger={
                  <button className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-ink transition hover:bg-charcoal/5 md:inline-flex">
                    <LayoutDashboard className="size-4" /> Selections
                  </button>
                }
              />
            </>
          )}
          <ToolBtn label={layout === "justified" ? "Square grid" : "Natural rows"} onClick={() => setLayout(layout === "justified" ? "grid" : "justified")}>
            {layout === "justified" ? <Grid2x2 className="size-4" /> : <Rows3 className="size-4" />}
          </ToolBtn>
          <Link href={`/gallery/${view.slug}/slideshow${album ? `?album=${album.slug}` : ""}`} title="Slideshow" aria-label="Start slideshow" className="grid size-9 place-items-center rounded-full text-ink transition hover:bg-charcoal/5">
            <Play className="size-4" />
          </Link>
          {(canAlbumZip || canFullZip) && (
            <ToolBtn
              label={canAlbumZip ? `Download “${album!.title}”` : "Download everything"}
              disabled={zipBusy}
              onClick={() => (canAlbumZip ? downloadZip("ALBUM", album!.id, album!.title) : downloadZip("FULL", undefined, view.title))}
            >
              <Download className={cn("size-4", zipBusy && "animate-bounce")} />
            </ToolBtn>
          )}
          {view.perms.upload && view.settings.guestUploadsEnabled && (
            <Link href={`/gallery/${view.slug}/upload`} title="Add your photos" aria-label="Add your photos" className="grid size-9 place-items-center rounded-full text-ink transition hover:bg-charcoal/5">
              <ImagePlus className="size-4" />
            </Link>
          )}
          {view.perms.share && (
            <ShareDialog
              slug={view.slug}
              uploadsEnabled={view.settings.guestUploadsEnabled}
              trigger={
                <button className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-charcoal px-4 text-[12px] text-ivory transition hover:bg-ink">
                  <Share2 className="size-3.5" /> <span className="hidden sm:inline">Share</span>
                </button>
              }
            />
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {count} photographs shown
      </p>
    </div>
  );
}

function ToolBtn({ label, onClick, active, disabled, children }: { label: string; onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={active} className={cn("inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2.5 transition", active ? "bg-charcoal text-ivory" : "text-ink hover:bg-charcoal/5", disabled && "opacity-50")}>
      {children}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Download, Heart, Info, MessageCircle, Send, Wand2, X } from "lucide-react";
import { addComment, getComments, recordPhotoView } from "@/server/actions/gallery";
import type { ClientPhoto } from "@/lib/media";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { useGallery } from "./context";
import { useDownloads } from "./downloads";

type Comment = Awaited<ReturnType<typeof getComments>>[number];

/** Immersive viewer: keyboard + swipe navigation, favourites, downloads and a comment drawer. */
export function GalleryLightbox({ photos, index, onIndex, onClose }: { photos: ClientPhoto[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const { view, isFavorite, toggle } = useGallery();
  const { downloadPhoto } = useDownloads();
  const reduce = useReducedMotion();
  const [panel, setPanel] = useState<"comments" | "info" | null>(null);
  const [dir, setDir] = useState(1);
  const [hiRes, setHiRes] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const photo = index != null ? photos[index] : null;

  const go = useCallback(
    (d: number) => {
      if (index == null) return;
      setDir(d);
      onIndex((index + d + photos.length) % photos.length);
    },
    [index, photos.length, onIndex],
  );

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("textarea,input")) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key.toLowerCase() === "f" && view.perms.favorite && photo) toggle(photo.id);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, go, onClose, toggle, photo, view.perms.favorite]);

  // deep-link the open photo and record a view
  useEffect(() => {
    const url = new URL(window.location.href);
    if (photo) url.searchParams.set("photo", photo.id);
    else url.searchParams.delete("photo");
    window.history.replaceState(null, "", url);
    setHiRes(false);
    if (photo) recordPhotoView(view.slug, photo.id).catch(() => {});
  }, [photo, view.slug]);

  // preload neighbours
  useEffect(() => {
    if (index == null) return;
    for (const d of [1, -1]) {
      const n = photos[(index + d + photos.length) % photos.length];
      if (n?.kind === "IMAGE") new Image().src = n.medium;
    }
  }, [index, photos]);

  const fav = photo ? isFavorite(photo.id) : false;

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          className="fixed inset-0 z-[60] flex bg-[#141312] text-ivory"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <div
            className="relative flex min-w-0 flex-1 flex-col"
            onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
            onTouchEnd={(e) => {
              if (!touch.current) return;
              const dx = e.changedTouches[0].clientX - touch.current.x;
              const dy = e.changedTouches[0].clientY - touch.current.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
              else if (dy > 90) onClose();
              touch.current = null;
            }}
          >
            {/* top bar */}
            <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <p className="text-[11px] uppercase tabular-nums tracking-[0.3em] text-ivory/60">
                {String(index! + 1).padStart(2, "0")} <span className="text-ivory/30">/ {String(photos.length).padStart(2, "0")}</span>
              </p>
              <div className="flex items-center gap-1">
                {view.perms.favorite && (
                  <IconBtn label={fav ? "Remove from favourites (F)" : "Add to favourites (F)"} onClick={() => toggle(photo.id)} active={fav}>
                    <motion.span key={String(fav)} initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                      <Heart className={cn("size-[18px]", fav && "fill-[#e8a598] text-[#e8a598]")} />
                    </motion.span>
                  </IconBtn>
                )}
                {view.perms.comment && (
                  <IconBtn label="Comments" onClick={() => setPanel((p) => (p === "comments" ? null : "comments"))} active={panel === "comments"}>
                    <MessageCircle className="size-[18px]" />
                  </IconBtn>
                )}
                {view.perms.download && (
                  <IconBtn label="Download" onClick={() => downloadPhoto(photo.id)}>
                    <Download className="size-[18px]" />
                  </IconBtn>
                )}
                <IconBtn label="Details" onClick={() => setPanel((p) => (p === "info" ? null : "info"))} active={panel === "info"}>
                  <Info className="size-[18px]" />
                </IconBtn>
                <span className="mx-1 h-5 w-px bg-ivory/15" />
                <IconBtn label="Close (Esc)" onClick={onClose}>
                  <X className="size-5" />
                </IconBtn>
              </div>
            </div>

            {/* image stage */}
            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.div
                  key={photo.id}
                  custom={dir}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 60, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -60 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex items-center justify-center px-2 pb-4 sm:px-16"
                >
                  {photo.kind === "VIDEO" ? (
                    <video src={photo.video} controls autoPlay playsInline className="max-h-full max-w-full" />
                  ) : (
                    <div className="relative size-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.medium} alt={photo.caption ?? ""} className="absolute inset-0 size-full object-contain" draggable={false} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.large} alt="" aria-hidden onLoad={() => setHiRes(true)} className={cn("absolute inset-0 size-full object-contain transition-opacity duration-700", hiRes ? "opacity-100" : "opacity-0")} draggable={false} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <NavBtn side="left" onClick={() => go(-1)} />
              <NavBtn side="right" onClick={() => go(1)} />
            </div>

            {photo.caption && <p className="font-display px-6 pb-5 text-center text-lg italic text-ivory/75">{photo.caption}</p>}
          </div>

          <AnimatePresence>
            {panel && (
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 260, damping: 32 }}
                className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-ivory/10 bg-[#1b1a18] sm:relative"
              >
                <div className="flex items-center justify-between border-b border-ivory/10 px-5 py-4">
                  <p className="eyebrow text-champagne">{panel === "comments" ? "Notes on this photograph" : "Details"}</p>
                  <button onClick={() => setPanel(null)} className="rounded-full p-1 text-ivory/60 hover:text-ivory" aria-label="Close panel">
                    <X className="size-4" />
                  </button>
                </div>
                {panel === "comments" ? (
                  <Comments key={photo.id} photoId={photo.id} />
                ) : (
                  <dl className="space-y-4 p-5 text-sm">
                    <Row k="File" v={photo.filename} />
                    <Row k="Dimensions" v={`${photo.width} × ${photo.height}`} />
                    <Row k="Orientation" v={photo.width >= photo.height ? "Landscape" : "Portrait"} />
                    <Row k="Gallery" v={view.title} />
                  </dl>
                )}
              </motion.aside>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.25em] text-ivory/40">{k}</dt>
      <dd className="mt-1 break-all text-ivory/85">{v}</dd>
    </div>
  );
}

function IconBtn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={cn("grid size-10 place-items-center rounded-full transition-colors", active ? "bg-ivory/12 text-ivory" : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory")}>
      {children}
    </button>
  );
}

function NavBtn({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn("group absolute top-0 hidden h-full w-20 items-center sm:flex", side === "left" ? "left-0 justify-start pl-4" : "right-0 justify-end pr-4")}
    >
      <span className="grid size-11 place-items-center rounded-full border border-ivory/0 text-ivory/50 transition-all duration-300 group-hover:border-ivory/25 group-hover:text-ivory">
        <Icon className="size-5" />
      </span>
    </button>
  );
}

function Comments({ photoId }: { photoId: string }) {
  const { view } = useGallery();
  const [items, setItems] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [edit, setEdit] = useState(false);
  const [pending, start] = useTransition();

  const load = useCallback(() => getComments(view.slug, photoId).then(setItems), [view.slug, photoId]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5" data-lenis-prevent>
        {items == null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-ivory/5" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="pt-8 text-center text-sm leading-relaxed text-ivory/50">
            No notes yet. Tell the studio what you love,
            <br /> or ask for a retouch.
          </p>
        ) : (
          items.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-sm">
              <p className="flex items-center gap-2 text-[11px] text-ivory/45">
                <span className={cn("font-medium", c.fromStudio ? "text-champagne" : "text-ivory/80")}>{c.authorName}</span>
                {timeAgo(c.createdAt)}
                {c.isEditRequest && <span className="rounded-full bg-champagne/15 px-2 py-0.5 text-[10px] text-champagne">Edit request{c.resolvedAt ? " · done" : ""}</span>}
              </p>
              <p className="mt-1 leading-relaxed text-ivory/85">{c.body}</p>
              {c.replies.map((r) => (
                <div key={r.id} className="mt-3 border-l border-ivory/15 pl-3">
                  <p className="text-[11px] text-ivory/45">
                    <span className={cn("font-medium", r.fromStudio ? "text-champagne" : "text-ivory/80")}>{r.authorName}</span> · {timeAgo(r.createdAt)}
                  </p>
                  <p className="mt-1 leading-relaxed text-ivory/85">{r.body}</p>
                </div>
              ))}
            </motion.div>
          ))
        )}
      </div>
      <form
        className="border-t border-ivory/10 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          start(async () => {
            const r = await addComment(view.slug, { photoId, body, isEditRequest: edit });
            if (!r.ok) return toast.error(r.error);
            setBody("");
            setEdit(false);
            await load();
          });
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={edit ? "Describe the retouch you’d like…" : "Write a note…"}
          className="w-full resize-none rounded-sm border border-ivory/15 bg-transparent p-3 text-sm placeholder:text-ivory/35 focus:border-champagne/60 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setEdit((v) => !v)} aria-pressed={edit} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition", edit ? "bg-champagne text-charcoal" : "text-ivory/60 hover:bg-ivory/10")}>
            <Wand2 className="size-3.5" /> Edit request
          </button>
          <button disabled={pending || !body.trim()} className="inline-flex items-center gap-2 rounded-full bg-ivory px-4 py-1.5 text-xs font-medium text-charcoal transition hover:bg-champagne disabled:opacity-40">
            {pending ? "Sending…" : "Send"} <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

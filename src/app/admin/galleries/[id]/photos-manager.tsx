"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Eye, EyeOff, Heart, ImageIcon, Loader2, MessageSquare, Pencil, Plus, Star, Trash2, Video, X } from "lucide-react";
import { createAlbum, deleteAlbum, photoBulkAction, renameAlbum } from "@/server/actions/galleries";
import { Dropzone } from "@/components/admin/upload-manager";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Album = { id: string; title: string; description: string | null; count: number };
type Photo = { id: string; filename: string; kind: string; status: string; hidden: boolean; albumId: string | null; error: string | null; favorites: number; comments: number; thumb: string | null; ratio: number };

export function PhotosManager({ galleryId, coverId, albums, photos }: { galleryId: string; coverId: string | null; albums: Album[]; photos: Photo[] }) {
  const router = useRouter();
  const [album, setAlbum] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [last, setLast] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [newAlbum, setNewAlbum] = useState("");
  const [editing, setEditing] = useState<Album | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const shown = useMemo(() => (album === "all" ? photos : album === "unsorted" ? photos.filter((p) => !p.albumId) : photos.filter((p) => p.albumId === album)), [album, photos]);
  const unsorted = photos.filter((p) => !p.albumId).length;
  const processing = photos.filter((p) => p.status !== "READY" && p.status !== "FAILED").length;
  const failed = photos.filter((p) => p.status === "FAILED").length;

  const toggle = (i: number, shift: boolean) => {
    const id = shown[i].id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && last != null) {
        const [a, b] = [Math.min(last, i), Math.max(last, i)];
        for (let k = a; k <= b; k++) next.add(shown[k].id);
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLast(i);
  };

  const bulk = (action: "move" | "hide" | "show" | "delete" | "cover", albumId?: string | null) =>
    start(async () => {
      const r = await photoBulkAction(galleryId, [...selected], action, albumId);
      if (!r.ok) return toast.error(r.error);
      toast(r.message ?? "Done");
      if (action !== "cover") setSelected(new Set());
      router.refresh();
    });

  const currentAlbum = albums.find((a) => a.id === album);

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      {/* album rail */}
      <aside className="min-w-0">
        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted">Albums</p>
        <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:block md:space-y-1 md:px-0">
        {[{ id: "all", title: "All files", count: photos.length }, ...albums, ...(unsorted ? [{ id: "unsorted", title: "Unsorted", count: unsorted }] : [])].map((a) => (
          <button key={a.id} onClick={() => (setAlbum(a.id), setSelected(new Set()))} className={cn("flex shrink-0 items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm transition md:w-full", album === a.id ? "bg-charcoal text-ivory" : "hover:bg-charcoal/5")}>
            <span className="truncate">{a.title}</span>
            <span className="text-xs tabular-nums opacity-60">{a.count}</span>
          </button>
        ))}
        </div>
        <form
          className="flex gap-1 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createAlbum(galleryId, newAlbum);
              if (!r.ok) return toast.error(r.error);
              setNewAlbum("");
              router.refresh();
            });
          }}
        >
          <Input value={newAlbum} onChange={(e) => setNewAlbum(e.target.value)} placeholder="New album" className="h-9 text-sm" aria-label="New album name" />
          <Button size="icon" type="submit" variant="outline" disabled={!newAlbum.trim() || pending} aria-label="Create album" className="shrink-0 rounded-sm">
            <Plus />
          </Button>
        </form>
        {currentAlbum && (
          <div className="flex gap-1 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(currentAlbum)}>
              <Pencil /> Rename
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() =>
                start(async () => {
                  if (!confirm(`Remove the album “${currentAlbum.title}”? Its photographs are kept and move to Unsorted.`)) return;
                  const r = await deleteAlbum(currentAlbum.id);
                  if (!r.ok) return toast.error(r.error);
                  toast(r.message ?? "Album removed");
                  setAlbum("all");
                  router.refresh();
                })
              }
            >
              <Trash2 /> Remove
            </Button>
          </div>
        )}
      </aside>

      <div className="min-w-0">
        <Dropzone galleryId={galleryId} albumId={currentAlbum?.id ?? null} label={currentAlbum ? currentAlbum.title : "Unsorted"} compact />
        <p className="mb-5 mt-2 text-xs text-muted">
          Uploading into <strong className="font-medium text-ink">{currentAlbum?.title ?? "Unsorted"}</strong>. Pick an album on the left to upload straight into it.
          {processing > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-olive-deep">
              <Loader2 className="size-3 animate-spin" /> {processing} processing
            </span>
          )}
          {failed > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-danger">
              <AlertTriangle className="size-3" /> {failed} failed
            </span>
          )}
        </p>

        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted">
          <span>
            {shown.length} files · click to select, shift-click for a range
          </span>
          {shown.length > 0 && (
            <button className="underline-offset-2 hover:underline" onClick={() => setSelected(selected.size === shown.length ? new Set() : new Set(shown.map((p) => p.id)))}>
              {selected.size === shown.length ? "Clear selection" : "Select all"}
            </button>
          )}
        </div>

        {shown.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {shown.map((p, i) => {
              const on = selected.has(p.id);
              return (
                <button key={p.id} type="button" onClick={(e) => toggle(i, e.shiftKey)} className={cn("group relative aspect-square overflow-hidden bg-ivory-deep text-left outline-none transition", on && "ring-2 ring-olive ring-offset-2")} aria-pressed={on} title={p.filename}>
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt={p.filename} loading="lazy" className={cn("size-full object-cover transition duration-500 group-hover:scale-105", p.hidden && "opacity-40 grayscale")} />
                  ) : (
                    <span className="grid size-full place-items-center p-2 text-center text-[10px] text-muted">
                      {p.status === "FAILED" ? <AlertTriangle className="mb-1 size-4 text-danger" /> : p.kind === "VIDEO" ? <Video className="mb-1 size-4" /> : p.status === "READY" ? <ImageIcon className="mb-1 size-4" /> : <Loader2 className="mb-1 size-4 animate-spin" />}
                      <span className="line-clamp-2">{p.status === "FAILED" ? (p.error ?? "Processing failed") : p.filename}</span>
                    </span>
                  )}
                  <span className={cn("absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full border transition", on ? "border-olive bg-olive text-white" : "border-white/80 bg-black/20 text-transparent opacity-0 group-hover:opacity-100")}>
                    <Check className="size-3" />
                  </span>
                  <span className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-1.5 text-[10px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)]">
                    {p.id === coverId && <Star className="size-3 fill-current" />}
                    {p.hidden && <EyeOff className="size-3" />}
                    {p.favorites > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Heart className="size-3 fill-current" />
                        {p.favorites}
                      </span>
                    )}
                    {p.comments > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="size-3" />
                        {p.comments}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="border border-dashed border-line py-16 text-center text-sm text-muted">No files in this album yet.</p>
        )}
      </div>

      {/* floating bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 bg-charcoal px-4 py-3 text-ivory shadow-2xl sm:inset-x-6">
            <span className="mr-2 text-sm tabular-nums">{selected.size} selected</span>
            <Select className="h-8 w-44 border-ivory/20 bg-transparent py-0 text-xs text-ivory" value="" onChange={(e) => e.target.value && bulk("move", e.target.value === "__none" ? null : e.target.value)} aria-label="Move to album" disabled={pending}>
              <option value="">Move to…</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id} className="text-charcoal">
                  {a.title}
                </option>
              ))}
              <option value="__none" className="text-charcoal">
                Unsorted
              </option>
            </Select>
            <Button size="sm" variant="outline-light" onClick={() => bulk("hide")} disabled={pending}>
              <EyeOff /> Hide
            </Button>
            <Button size="sm" variant="outline-light" onClick={() => bulk("show")} disabled={pending}>
              <Eye /> Show
            </Button>
            {selected.size === 1 && (
              <Button size="sm" variant="outline-light" onClick={() => bulk("cover")} disabled={pending}>
                <Star /> Set as cover
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 /> Delete
            </Button>
            <button onClick={() => setSelected(new Set())} className="ml-auto grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="Clear selection">
              <X className="size-4" />
            </button>
            {pending && <Loader2 className="size-4 animate-spin" />}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title={`Permanently delete ${selected.size} file${selected.size > 1 ? "s" : ""}?`} description="Originals and every processed version are removed from storage. This can’t be undone. To keep them but hide them from the couple, use Hide instead.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => (setConfirmDelete(false), bulk("hide"))}>
              <EyeOff /> Hide instead
            </Button>
            <Button variant="danger" onClick={() => (setConfirmDelete(false), bulk("delete"))}>
              <Trash2 /> Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title="Edit album">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  const r = await renameAlbum(editing.id, String(fd.get("title")), String(fd.get("description")));
                  if (!r.ok) return toast.error(r.error);
                  setEditing(null);
                  router.refresh();
                });
              }}
            >
              <Input name="title" defaultValue={editing.title} required maxLength={80} aria-label="Album title" />
              <Textarea name="description" defaultValue={editing.description ?? ""} maxLength={500} placeholder="A line about this chapter (shown to the couple)" aria-label="Album description" />
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

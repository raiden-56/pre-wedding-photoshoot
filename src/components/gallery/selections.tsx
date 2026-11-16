"use client";

import { useState, useTransition } from "react";
import type { FavoriteListKind } from "@prisma/client";
import { motion } from "motion/react";
import { Check, Heart, Link2, Lock, Plus, Send, Trash2 } from "lucide-react";
import { createFavoriteList, deleteFavoriteList, shareFavoriteList, submitSelection } from "@/server/actions/gallery";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useGallery } from "./context";
import { useDownloads } from "./downloads";

const KIND_LABEL: Record<FavoriteListKind, string> = { PERSONAL: "Favourites", ALBUM: "Album selection", SOCIAL: "Social media", PARTNER_ONE: "Partner’s picks", PARTNER_TWO: "Partner’s picks", CUSTOM: "Custom list" };

/** Manage favourite lists: switch the active list, create album/social selections, submit, share. */
export function SelectionsDialog({ trigger }: { trigger: React.ReactNode }) {
  const { view, lists, setLists, activeListId, setActiveListId } = useGallery();
  const { downloadZip } = useDownloads();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"ALBUM" | "SOCIAL" | "CUSTOM">("ALBUM");
  const [pending, start] = useTransition();
  const canZip = view.perms.download && ["ALBUM", "FULL"].includes(view.settings.downloadScope);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent side="right" title="Your selections" description="Hearts go into the active list. Create separate lists for your album and social posts, then send them to the studio.">
        <div className="space-y-3">
          {lists.length === 0 && <p className="border border-dashed border-line p-6 text-center text-sm text-muted">Tap the heart on any photograph to start your favourites.</p>}
          {lists.map((l) => {
            const active = l.id === activeListId;
            const full = l.limit != null && l.photoIds.length >= l.limit;
            return (
              <motion.div layout key={l.id} className={cn("border bg-white p-4 transition-colors", active ? "border-olive" : "border-line")}>
                <div className="flex items-start justify-between gap-3">
                  <button className="flex-1 text-left" onClick={() => setActiveListId(l.id)}>
                    <p className="flex items-center gap-2 font-medium">
                      {active && <Check className="size-4 text-olive" />}
                      {l.name}
                      {l.submitted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-olive/15 px-2 py-0.5 text-[10px] text-olive-deep">
                          <Lock className="size-3" /> Submitted
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {KIND_LABEL[l.kind]} · {l.photoIds.length}
                      {l.limit != null ? ` of ${l.limit}` : ""} photographs
                    </p>
                  </button>
                  <Heart className={cn("size-4", l.photoIds.length ? "fill-danger/70 text-danger/70" : "text-taupe")} />
                </div>
                {l.limit != null && (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
                    <motion.div className={cn("h-full", full ? "bg-warning" : "bg-olive")} initial={false} animate={{ width: `${Math.min(100, (l.photoIds.length / l.limit) * 100)}%` }} />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {!l.submitted && l.kind !== "PERSONAL" && (
                    <Button
                      size="sm"
                      variant="olive"
                      disabled={pending || !l.photoIds.length}
                      onClick={() =>
                        start(async () => {
                          const r = await submitSelection(view.slug, l.id);
                          if (!r.ok) return toast.error(r.error);
                          setLists((prev) => prev.map((x) => (x.id === l.id ? { ...x, submitted: true } : x)));
                          toast(r.message ?? "Submitted");
                        })
                      }
                    >
                      <Send /> Send to studio
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      start(async () => {
                        const r = await shareFavoriteList(view.slug, l.id);
                        if (!r.ok) return toast.error(r.error);
                        await navigator.clipboard.writeText(r.data!.url).catch(() => {});
                        toast("Link copied", { description: "Anyone with access to the gallery can view this list." });
                      })
                    }
                  >
                    <Link2 /> Share
                  </Button>
                  {canZip && l.photoIds.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => downloadZip("SELECTION", l.id, l.name)}>
                      Download ZIP
                    </Button>
                  )}
                  {!l.submitted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-danger"
                      aria-label={`Delete ${l.name}`}
                      onClick={() =>
                        start(async () => {
                          if (!confirm(`Delete “${l.name}”? The photographs stay in the gallery.`)) return;
                          const r = await deleteFavoriteList(view.slug, l.id);
                          if (!r.ok) return toast.error(r.error);
                          setLists((prev) => prev.filter((x) => x.id !== l.id));
                          if (activeListId === l.id) setActiveListId(null);
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <form
          className="mt-8 border-t border-line pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createFavoriteList(view.slug, name, kind);
              if (!r.ok) return toast.error(r.error);
              setLists((prev) => [...prev, { id: r.data!.id, name: name.trim(), kind, limit: r.data!.limit, submitted: false, photoIds: [] }]);
              setActiveListId(r.data!.id);
              setName("");
              toast("List created", { description: "New hearts now go into this list." });
            });
          }}
        >
          <p className="eyebrow mb-3">New list</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Album picks" required maxLength={60} />
            <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="sm:w-44" aria-label="List type">
              <option value="ALBUM">Album selection</option>
              <option value="SOCIAL">Social media</option>
              <option value="CUSTOM">Custom</option>
            </Select>
            <Button type="submit" disabled={pending}>
              <Plus /> Create
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">Album and social lists follow the limits your photographer set; the counter updates as you go.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

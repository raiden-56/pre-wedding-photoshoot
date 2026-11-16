"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CloudUpload, ImagePlus, RotateCcw, TriangleAlert, X } from "lucide-react";
import { completeGuestDirectUpload, createGuestUploadTickets, finishGuestBatch } from "@/server/actions/gallery";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { cn, formatBytes } from "@/lib/utils";

type Item = { key: string; file: File; preview: string | null; progress: number; status: "ready" | "uploading" | "done" | "error"; error?: string };
type Ref = { slug: string } | { token: string };

function put(url: string, file: File, contentType: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.status === 413 ? "File too large" : `Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    xhr.send(file);
  });
}

/** Drag-and-drop uploader for family & friends. Files go straight to storage via signed tickets. */
export function GuestUploader({ galleryRef, maxFiles, maxMb, moderated, defaultName = "" }: { galleryRef: Ref; maxFiles: number; maxMb: number; moderated: boolean; defaultName?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const add = (files: FileList | File[]) => {
    setError(null);
    setDone(null);
    const next = [...files].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    setItems((prev) => {
      const merged = [...prev, ...next.map((file) => ({ key: `${file.name}-${file.size}-${file.lastModified}`, file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null, progress: 0, status: "ready" as const }))];
      const unique = merged.filter((it, i) => merged.findIndex((x) => x.key === it.key) === i);
      if (unique.length > maxFiles) setError(`You can share up to ${maxFiles} files at a time.`);
      return unique.slice(0, maxFiles);
    });
  };
  const patch = (key: string, p: Partial<Item>) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)));

  async function upload() {
    const pending = items.filter((i) => i.status === "ready" || i.status === "error");
    if (!pending.length) return;
    setBusy(true);
    setError(null);
    const r = await createGuestUploadTickets(galleryRef, pending.map((i) => ({ clientKey: i.key, name: i.file.name, size: i.file.size, type: i.file.type })), name, message);
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    let ok = 0;
    const queue = [...r.data!.tickets];
    const worker = async () => {
      for (let t = queue.shift(); t; t = queue.shift()) {
        const it = pending.find((p) => p.key === t!.clientKey)!;
        if (!t.ok) {
          patch(it.key, { status: "error", error: t.error });
          continue;
        }
        patch(it.key, { status: "uploading", progress: 0 });
        try {
          await put(t.url!, it.file, t.contentType!, (p) => patch(it.key, { progress: p }));
          if (t.direct) await completeGuestDirectUpload(t.guestUploadId!);
          patch(it.key, { status: "done", progress: 1 });
          ok++;
        } catch (e) {
          patch(it.key, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (ok) await finishGuestBatch(galleryRef, ok, name);
    setBusy(false);
    setDone(ok);
  }

  const total = items.reduce((s, i) => s + i.file.size, 0);
  const uploaded = items.reduce((s, i) => s + i.file.size * i.progress, 0);

  return (
    <div className="space-y-6">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        animate={{ scale: over ? 1.015 : 1 }}
        className={cn("relative grid place-items-center overflow-hidden border border-dashed px-6 py-14 text-center transition-colors", over ? "border-olive bg-olive/5" : "border-taupe/70 bg-white")}
      >
        <motion.span animate={{ y: over ? -6 : 0 }} className="grid size-14 place-items-center rounded-full bg-champagne/60 text-olive-deep">
          <CloudUpload className="size-6" />
        </motion.span>
        <p className="font-display mt-5 text-3xl">Drop your photographs here</p>
        <p className="mt-2 text-sm text-muted">
          Up to {maxFiles} photos or short videos · {maxMb} MB each
        </p>
        <Button type="button" variant="outline" className="mt-6" onClick={() => input.current?.click()}>
          <ImagePlus /> Choose files
        </Button>
        <input ref={input} type="file" multiple accept="image/*,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => e.target.files && add(e.target.files)} />
      </motion.div>

      <AnimatePresence>
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <AnimatePresence>
                {items.map((it) => (
                  <motion.li key={it.key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative aspect-square overflow-hidden bg-ivory-deep">
                    {it.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.preview} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center p-2 text-center text-[10px] text-muted">{it.file.name}</span>
                    )}
                    {it.status === "uploading" && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-charcoal/20">
                        <motion.span className="block h-full bg-olive" animate={{ width: `${it.progress * 100}%` }} />
                      </span>
                    )}
                    {it.status === "done" && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-olive text-white">
                        <Check className="size-3.5" />
                      </motion.span>
                    )}
                    {it.status === "error" && (
                      <span className="absolute inset-0 grid place-items-center bg-charcoal/70 p-2 text-center text-[10px] text-ivory" title={it.error}>
                        <TriangleAlert className="mx-auto mb-1 size-4" />
                        {it.error}
                      </span>
                    )}
                    {!busy && it.status !== "done" && (
                      <button onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))} className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-charcoal/60 text-ivory" aria-label={`Remove ${it.file.name}`}>
                        <X className="size-3.5" />
                      </button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="So the couple knows who shared" />
              </Field>
              <Field label="A short message (optional)">
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={1} className="min-h-[42px]" />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {items.length} file{items.length > 1 ? "s" : ""} · {formatBytes(total)}
                {busy && ` · ${Math.round((uploaded / Math.max(1, total)) * 100)}%`}
              </p>
              <Button onClick={upload} disabled={busy || !items.some((i) => i.status === "ready" || i.status === "error")}>
                {items.some((i) => i.status === "error") && !busy ? <RotateCcw /> : <CloudUpload />}
                {busy ? "Uploading…" : items.some((i) => i.status === "error") ? "Retry" : "Share photographs"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <AnimatePresence>
        {done != null && done > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border border-olive/40 bg-olive/10 p-5 text-sm">
            <p className="font-medium">Thank you — {done} file{done > 1 ? "s" : ""} shared.</p>
            <p className="mt-1 text-muted">{moderated ? "The studio will review them before they appear in the gallery." : "They’ll appear in the gallery in a moment."}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, CloudUpload, Copy, Pause, Play, RotateCcw, TriangleAlert, X } from "lucide-react";
import { cancelUpload, completeDirectUpload, createUploadTickets, getPhotoStatuses, recordUploadBatch, refreshUploadTicket } from "@/server/actions/uploads";
import { toast } from "@/components/ui/toaster";
import { cn, formatBytes } from "@/lib/utils";

export type UploadStatus = "validating" | "queued" | "uploading" | "processing" | "done" | "error" | "duplicate" | "canceled";

export type UploadItem = {
  key: string;
  file: File;
  galleryId: string;
  albumId: string | null;
  label: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  photoId?: string;
  url?: string;
  direct?: boolean;
  contentType?: string;
  preview?: string;
  batch: string;
};

type Ctx = {
  items: UploadItem[];
  paused: boolean;
  addFiles: (galleryId: string, albumId: string | null, files: File[], label: string) => void;
  pause: () => void;
  resume: () => void;
  retry: (key: string) => void;
  cancel: (key: string) => void;
  forceDuplicate: (key: string) => void;
  clearFinished: () => void;
};

const UploadContext = createContext<Ctx | null>(null);
export const useUploads = () => {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploads must be used inside UploadProvider");
  return ctx;
};

const CONCURRENCY = 3;
const ACCEPT = /\.(jpe?g|png|webp|heic|heif|mp4|mov|webm)$/i;

/**
 * Lives in the admin layout so uploads keep running while the photographer
 * navigates. Each file gets its own XHR (for progress), uploads run 3 at a time,
 * and files then move to "processing" until the server worker has generated
 * responsive derivatives.
 */
export function UploadProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [paused, setPaused] = useState(false);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const patch = useCallback((key: string, p: Partial<UploadItem>) => setItems((s) => s.map((i) => (i.key === key ? { ...i, ...p } : i))), []);

  const requestTickets = useCallback(
    async (batchItems: UploadItem[], force = false) => {
      if (!batchItems.length) return;
      const { galleryId, albumId } = batchItems[0];
      try {
        for (let i = 0; i < batchItems.length; i += 100) {
          const chunk = batchItems.slice(i, i + 100);
          const tickets = await createUploadTickets(
            galleryId,
            albumId,
            chunk.map((it) => ({ clientKey: it.key, name: it.file.name, size: it.file.size, type: it.file.type, force })),
          );
          setItems((s) =>
            s.map((it) => {
              const t = tickets.find((x) => x.clientKey === it.key);
              if (!t) return it;
              return t.ok
                ? { ...it, status: "queued", photoId: t.photoId, url: t.url, direct: t.direct, contentType: t.contentType, error: undefined }
                : { ...it, status: t.duplicate ? "duplicate" : "error", error: t.error };
            }),
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not start upload";
        setItems((s) => s.map((it) => (batchItems.some((b) => b.key === it.key) ? { ...it, status: "error", error: msg } : it)));
      }
    },
    [],
  );

  const addFiles = useCallback(
    (galleryId: string, albumId: string | null, files: File[], label: string) => {
      const batch = crypto.randomUUID();
      const accepted = files.filter((f) => ACCEPT.test(f.name) || f.type.startsWith("image/") || f.type.startsWith("video/"));
      const skipped = files.length - accepted.length;
      if (skipped) toast.error(`${skipped} file${skipped > 1 ? "s" : ""} skipped`, "Only JPG, PNG, WebP, HEIC, MP4, MOV and WebM are accepted.");
      // client-side duplicate detection within the same drop
      const seen = new Set(itemsRef.current.filter((i) => i.galleryId === galleryId && i.status !== "canceled").map((i) => `${i.file.name}:${i.file.size}`));
      const newItems: UploadItem[] = [];
      for (const file of accepted) {
        const sig = `${file.name}:${file.size}`;
        const dupe = seen.has(sig);
        seen.add(sig);
        newItems.push({
          key: crypto.randomUUID(),
          file,
          galleryId,
          albumId,
          label,
          batch,
          status: dupe ? "duplicate" : "validating",
          error: dupe ? "Already in this upload queue" : undefined,
          progress: 0,
          preview: file.type.startsWith("image/") && !/heic|heif/i.test(file.type) && file.size < 40e6 ? URL.createObjectURL(file) : undefined,
        });
      }
      setItems((s) => [...s, ...newItems]);
      void requestTickets(newItems.filter((i) => i.status === "validating"));
    },
    [requestTickets],
  );

  const startUpload = useCallback(
    (item: UploadItem) => {
      if (!item.url) return;
      patch(item.key, { status: "uploading", progress: 0, error: undefined });
      const xhr = new XMLHttpRequest();
      xhrs.current.set(item.key, xhr);
      xhr.open("PUT", item.url);
      xhr.setRequestHeader("Content-Type", item.contentType ?? item.file.type ?? "application/octet-stream");
      xhr.upload.onprogress = (e) => e.lengthComputable && patch(item.key, { progress: e.loaded / e.total });
      xhr.onload = async () => {
        xhrs.current.delete(item.key);
        if (xhr.status >= 200 && xhr.status < 300) {
          if (item.direct && item.photoId) {
            const res = await completeDirectUpload(item.photoId);
            if (!res.ok) return patch(item.key, { status: "error", error: res.error });
          }
          patch(item.key, { status: "processing", progress: 1 });
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try {
            msg = JSON.parse(xhr.responseText).error ?? msg;
          } catch {}
          patch(item.key, { status: "error", error: msg });
        }
      };
      xhr.onerror = () => {
        xhrs.current.delete(item.key);
        patch(item.key, { status: "error", error: "Network error — check your connection and retry" });
      };
      xhr.onabort = () => xhrs.current.delete(item.key);
      xhr.send(item.file);
    },
    [patch],
  );

  // scheduler
  useEffect(() => {
    if (paused) return;
    const active = items.filter((i) => i.status === "uploading").length;
    const next = items.filter((i) => i.status === "queued").slice(0, Math.max(0, CONCURRENCY - active));
    next.forEach(startUpload);
  }, [items, paused, startUpload]);

  // poll server-side processing
  useEffect(() => {
    const processing = items.filter((i) => i.status === "processing" && i.photoId);
    if (!processing.length) return;
    const t = setTimeout(async () => {
      try {
        const rows = await getPhotoStatuses(processing.map((p) => p.photoId!));
        setItems((s) =>
          s.map((it) => {
            const r = rows.find((x) => x.id === it.photoId);
            if (!r || it.status !== "processing") return it;
            if (r.status === "READY") return { ...it, status: "done" };
            if (r.status === "FAILED") return { ...it, status: "error", error: r.error ?? "Processing failed" };
            return it;
          }),
        );
      } catch {}
    }, 2500);
    return () => clearTimeout(t);
  }, [items]);

  // batch completion → notify + refresh
  const reported = useRef(new Set<string>());
  useEffect(() => {
    const batches = new Map<string, UploadItem[]>();
    items.forEach((i) => batches.set(i.batch, [...(batches.get(i.batch) ?? []), i]));
    batches.forEach((list, batch) => {
      if (reported.current.has(batch)) return;
      const settled = list.every((i) => ["done", "error", "duplicate", "canceled"].includes(i.status));
      if (!settled) return;
      reported.current.add(batch);
      const done = list.filter((i) => i.status === "done").length;
      const failed = list.filter((i) => i.status === "error").length;
      if (done) {
        void recordUploadBatch(list[0].galleryId, done);
        toast(`${done} file${done > 1 ? "s" : ""} ready in ${list[0].label}`, { description: failed ? `${failed} need attention` : "Thumbnails and web sizes generated" });
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification("Upload complete", { body: `${done} files ready in ${list[0].label}` });
        router.refresh();
      } else if (failed) toast.error(`${failed} upload${failed > 1 ? "s" : ""} failed`, "Open the upload tray to retry.");
    });
  }, [items, router]);

  // warn before leaving with active uploads
  useEffect(() => {
    const busy = items.some((i) => i.status === "uploading" || i.status === "queued" || i.status === "validating");
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [items]);

  const value = useMemo<Ctx>(
    () => ({
      items,
      paused,
      addFiles,
      pause: () => {
        setPaused(true);
        // in-flight requests can't be resumed byte-wise on a single PUT; they restart on resume
        xhrs.current.forEach((x, key) => {
          x.abort();
          patch(key, { status: "queued", progress: 0 });
        });
      },
      resume: () => setPaused(false),
      retry: async (key) => {
        const it = itemsRef.current.find((i) => i.key === key);
        if (!it) return;
        if (it.photoId) {
          const t = await refreshUploadTicket(it.photoId);
          if (t.ok) patch(key, { status: "queued", url: t.url, direct: t.direct, error: undefined, progress: 0 });
          else patch(key, { error: t.error });
        } else {
          patch(key, { status: "validating", error: undefined });
          void requestTickets([it]);
        }
      },
      cancel: (key) => {
        const it = itemsRef.current.find((i) => i.key === key);
        xhrs.current.get(key)?.abort();
        patch(key, { status: "canceled" });
        if (it?.photoId && it.status !== "done" && it.status !== "processing") void cancelUpload(it.photoId);
      },
      forceDuplicate: (key) => {
        const it = itemsRef.current.find((i) => i.key === key);
        if (!it) return;
        patch(key, { status: "validating", error: undefined });
        void requestTickets([it], true);
      },
      clearFinished: () =>
        setItems((s) =>
          s.filter((i) => {
            const finished = ["done", "canceled", "duplicate"].includes(i.status);
            if (finished && i.preview) URL.revokeObjectURL(i.preview);
            return !finished;
          }),
        ),
    }),
    [items, paused, addFiles, patch, requestTickets],
  );

  return (
    <UploadContext.Provider value={value}>
      {children}
      <UploadTray />
    </UploadContext.Provider>
  );
}

function UploadTray() {
  const { items, paused, pause, resume, retry, cancel, forceDuplicate, clearFinished } = useUploads();
  const [open, setOpen] = useState(true);
  if (!items.length) return null;
  const totalBytes = items.filter((i) => i.status !== "canceled" && i.status !== "duplicate").reduce((s, i) => s + i.file.size, 0);
  const sentBytes = items.reduce((s, i) => s + (["processing", "done"].includes(i.status) ? i.file.size : i.status === "uploading" ? i.file.size * i.progress : 0), 0);
  const overall = totalBytes ? sentBytes / totalBytes : 0;
  const active = items.filter((i) => ["uploading", "queued", "validating"].includes(i.status)).length;
  const processing = items.filter((i) => i.status === "processing").length;
  const errors = items.filter((i) => i.status === "error").length;

  return (
    <div className="fixed bottom-3 right-3 z-50 w-[calc(100vw-1.5rem)] max-w-md border border-line bg-white shadow-2xl sm:bottom-5 sm:right-5">
      <div className="flex items-center gap-3 px-4 py-3">
        <CloudUpload className="size-5 text-olive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {active ? `Uploading ${active} file${active > 1 ? "s" : ""}` : processing ? `Processing ${processing}…` : errors ? `${errors} need attention` : "Uploads complete"}
            {paused && " · paused"}
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ivory-deep">
            <div className="h-full bg-olive transition-all duration-300" style={{ width: `${Math.round(overall * 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted tabular-nums">
            {formatBytes(sentBytes)} of {formatBytes(totalBytes)} · {Math.round(overall * 100)}%
          </p>
        </div>
        {active > 0 && (
          <button onClick={paused ? resume : pause} className="grid size-8 place-items-center rounded-full hover:bg-ivory-deep" aria-label={paused ? "Resume uploads" : "Pause uploads"} title={paused ? "Resume" : "Pause (in-flight files restart on resume)"}>
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        )}
        <button onClick={() => setOpen((v) => !v)} className="grid size-8 place-items-center rounded-full hover:bg-ivory-deep" aria-label={open ? "Collapse" : "Expand"}>
          <ChevronDown className={cn("size-4 transition", !open && "rotate-180")} />
        </button>
        {!active && !processing && (
          <button onClick={clearFinished} className="grid size-8 place-items-center rounded-full hover:bg-ivory-deep" aria-label="Clear finished uploads">
            <X className="size-4" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="max-h-72 overflow-y-auto border-t border-line">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 border-b border-line/60 px-4 py-2 last:border-0">
                <div className="relative size-10 shrink-0 overflow-hidden bg-ivory-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.preview && <img src={i.preview} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">{i.file.name}</p>
                  <p className={cn("truncate text-[11px]", i.status === "error" ? "text-danger" : "text-muted")}>
                    {i.status === "uploading" && `${Math.round(i.progress * 100)}% · ${formatBytes(i.file.size)}`}
                    {i.status === "queued" && "Waiting…"}
                    {i.status === "validating" && "Checking…"}
                    {i.status === "processing" && "Generating web sizes…"}
                    {i.status === "done" && "Ready"}
                    {i.status === "canceled" && "Canceled"}
                    {(i.status === "error" || i.status === "duplicate") && i.error}
                  </p>
                  {i.status === "uploading" && (
                    <div className="mt-1 h-0.5 bg-ivory-deep">
                      <div className="h-full bg-charcoal transition-all" style={{ width: `${i.progress * 100}%` }} />
                    </div>
                  )}
                </div>
                {i.status === "done" && <Check className="size-4 text-success" />}
                {i.status === "error" && (
                  <button onClick={() => retry(i.key)} className="grid size-7 place-items-center rounded-full hover:bg-ivory-deep" aria-label="Retry">
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
                {i.status === "duplicate" && (
                  <button onClick={() => forceDuplicate(i.key)} className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] hover:bg-ivory-deep" title="Upload anyway">
                    <Copy className="size-3" /> Upload anyway
                  </button>
                )}
                {i.status === "error" && <TriangleAlert className="size-4 text-danger" />}
                {["queued", "uploading", "validating", "error"].includes(i.status) && (
                  <button onClick={() => cancel(i.key)} className="grid size-7 place-items-center rounded-full hover:bg-ivory-deep" aria-label="Cancel upload">
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Drag & drop target + file picker that feeds the global queue. */
export function Dropzone({ galleryId, albumId, label, compact }: { galleryId: string; albumId: string | null; label: string; compact?: boolean }) {
  const { addFiles } = useUploads();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const onFiles = (list: FileList | null) => {
    if (!list?.length) return;
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    addFiles(galleryId, albumId, Array.from(list), label);
  };
  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center border border-dashed text-center transition",
        compact ? "gap-1 px-4 py-5" : "gap-3 px-6 py-12",
        over ? "border-olive bg-olive/5" : "border-taupe/70 bg-white hover:border-olive",
      )}
    >
      <CloudUpload className={cn("text-olive", compact ? "size-5" : "size-8")} />
      <p className={cn("font-display", compact ? "text-lg" : "text-2xl")}>Drop photographs &amp; videos here</p>
      {!compact && <p className="text-xs text-muted">JPG, PNG, WebP, HEIC up to 80 MB · MP4, MOV, WebM up to 4 GB · up to 200 files per drop</p>}
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => (onFiles(e.target.files), (e.target.value = ""))} />
    </div>
  );
}

import "server-only";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ZipArchive } from "archiver";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { makePreview, processPhoto } from "@/server/media/process";
import { notify, notifyStudio } from "@/server/notify";

/**
 * Minimal durable job queue on PostgreSQL. Jobs survive restarts, are claimed
 * atomically (no double processing across instances) and retried with backoff.
 * Run in-process (instrumentation.ts) or as a dedicated worker: `npm run worker`.
 */
export async function enqueue(type: JobType, payload: Prisma.InputJsonValue, runAt = new Date()) {
  const job = await db.job.create({ data: { type, payload, runAt } });
  void kickWorker();
  return job;
}

type JobType = "PROCESS_PHOTO" | "GUEST_UPLOAD_PREVIEW" | "BUILD_ARCHIVE" | "GALLERY_EXPIRY_SWEEP" | "BOOKING_REMINDERS";

const handlers: Record<JobType, (payload: Record<string, string>) => Promise<void>> = {
  PROCESS_PHOTO: async ({ photoId }) => processPhoto(photoId),
  GUEST_UPLOAD_PREVIEW: async ({ guestUploadId }) => {
    const gu = await db.guestUpload.findUnique({ where: { id: guestUploadId } });
    if (!gu || gu.thumbKey || !gu.mimeType.startsWith("image/")) return;
    const { previewKey } = await makePreview(gu.key, 700);
    await db.guestUpload.update({ where: { id: gu.id }, data: { thumbKey: previewKey } });
  },
  BUILD_ARCHIVE: async ({ archiveId }) => buildArchive(archiveId),
  GALLERY_EXPIRY_SWEEP: async () => expirySweep(),
  BOOKING_REMINDERS: async () => bookingReminders(),
};

let running = false;
export async function kickWorker() {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < 50; i++) {
      const claimed = await claimNext();
      if (!claimed) break;
      await runJob(claimed);
    }
  } catch (e) {
    console.error("[jobs] worker loop error", e);
  } finally {
    running = false;
  }
}

async function claimNext(): Promise<Awaited<ReturnType<typeof db.job.findFirst>>> {
  const staleLock = new Date(Date.now() - 10 * 60_000);
  const candidate = await db.job.findFirst({
    where: { OR: [{ status: "QUEUED", runAt: { lte: new Date() } }, { status: "RUNNING", lockedAt: { lt: staleLock } }] },
    orderBy: { runAt: "asc" },
  });
  if (!candidate) return null;
  const res = await db.job.updateMany({
    where: { id: candidate.id, status: candidate.status, updatedAt: candidate.updatedAt },
    data: { status: "RUNNING", lockedAt: new Date(), attempts: { increment: 1 } },
  });
  return res.count === 1 ? { ...candidate, attempts: candidate.attempts + 1 } : claimNext();
}

async function runJob(job: { id: string; type: string; payload: Prisma.JsonValue; attempts: number; maxAttempts: number }) {
  try {
    const handler = handlers[job.type as JobType];
    if (!handler) throw new Error(`No handler for ${job.type}`);
    await handler((job.payload ?? {}) as Record<string, string>);
    await db.job.update({ where: { id: job.id }, data: { status: "DONE", lastError: null } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const final = job.attempts >= job.maxAttempts;
    await db.job.update({
      where: { id: job.id },
      data: { status: final ? "FAILED" : "QUEUED", lastError: message.slice(0, 500), runAt: new Date(Date.now() + 2 ** job.attempts * 5000) },
    });
    if (final && job.type === "BUILD_ARCHIVE") {
      await db.downloadArchive.update({ where: { id: (job.payload as { archiveId: string }).archiveId }, data: { status: "FAILED", error: message.slice(0, 300) } }).catch(() => {});
    }
  }
}

async function buildArchive(archiveId: string) {
  const archive = await db.downloadArchive.findUnique({ where: { id: archiveId }, include: { gallery: true } });
  if (!archive || archive.status === "READY") return;
  await db.downloadArchive.update({ where: { id: archiveId }, data: { status: "PROCESSING" } });

  const where: Prisma.PhotoWhereInput = { galleryId: archive.galleryId, status: "READY", hidden: false };
  if (archive.albumId) where.albumId = archive.albumId;
  if (archive.listId) where.favorites = { some: { listId: archive.listId } };
  const photos = await db.photo.findMany({ where, orderBy: [{ albumId: "asc" }, { order: "asc" }], include: { album: { select: { title: true } } } });

  const dir = await mkdtemp(path.join(os.tmpdir(), "saanjh-zip-"));
  const zipPath = path.join(dir, "archive.zip");
  try {
    await new Promise<void>(async (resolve, reject) => {
      const out = createWriteStream(zipPath);
      const zip = new ZipArchive({ zlib: { level: 0 } }); // photos are already compressed
      out.on("close", () => resolve());
      zip.on("error", reject);
      zip.pipe(out);
      const used = new Set<string>();
      for (const p of photos) {
        const variants = (p.variants ?? {}) as Record<string, string>;
        const useOriginal = archive.resolution === "HIGH" || p.kind === "VIDEO";
        const key = useOriginal ? p.originalKey : variants.large ?? p.originalKey;
        const folder = p.album?.title ? `${p.album.title}/` : "";
        let name = useOriginal ? p.filename : p.filename.replace(/\.[^.]+$/, "") + ".webp";
        while (used.has(folder + name)) name = `copy-${name}`;
        used.add(folder + name);
        // one file at a time so large galleries never open hundreds of streams at once
        const entryDone = new Promise((r) => zip.once("entry", r));
        zip.append(await storage.getStream(key), { name: folder + name });
        await entryDone;
      }
      await zip.finalize();
    });
    const { size } = await stat(zipPath);
    const key = `studios/${archive.gallery.studioId}/galleries/${archive.galleryId}/archives/${archive.id}.zip`;
    const { createReadStream } = await import("node:fs");
    await storage.putStream(key, createReadStream(zipPath), "application/zip");
    await db.$transaction([
      db.downloadArchive.update({
        where: { id: archiveId },
        data: { status: "READY", key, size: BigInt(size), photoCount: photos.length, expiresAt: new Date(Date.now() + 3 * 86400_000) },
      }),
      db.storageRecord.create({ data: { key, bytes: BigInt(size), kind: "ARCHIVE", studioId: archive.gallery.studioId, galleryId: archive.galleryId } }),
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function expirySweep() {
  const soon = new Date(Date.now() + 7 * 86400_000);
  const galleries = await db.gallery.findMany({
    where: { status: "PUBLISHED", expiresAt: { lte: soon, gte: new Date() }, expiryReminderSentAt: null },
    include: { client: { select: { userId: true } } },
  });
  for (const g of galleries) {
    const days = Math.max(0, Math.ceil(((g.expiresAt?.getTime() ?? 0) - Date.now()) / 86400_000));
    const input = {
      type: "GALLERY_EXPIRING" as const,
      title: `“${g.title}” expires in ${days} day${days === 1 ? "" : "s"}`,
      body: "Download your favourite photographs or ask the studio to extend access.",
      link: `/gallery/${g.slug}`,
    };
    if (g.client?.userId) await notify({ ...input, userIds: [g.client.userId] });
    await notifyStudio(g.studioId, { ...input, link: `/admin/galleries/${g.id}` });
    await db.gallery.update({ where: { id: g.id }, data: { expiryReminderSentAt: new Date() } });
  }
}

async function bookingReminders() {
  const inThreeDays = new Date(Date.now() + 3 * 86400_000);
  const bookings = await db.booking.findMany({
    where: { status: "CONFIRMED", eventDate: { gte: new Date(), lte: inThreeDays }, reminderSentAt: null },
    include: { client: { select: { userId: true, partner1Name: true, partner2Name: true } } },
  });
  for (const b of bookings) {
    const input = { type: "BOOKING_REMINDER" as const, title: `Upcoming: ${b.title}`, body: `${b.eventDate.toDateString()} · ${b.location ?? "Location TBC"}` };
    await notifyStudio(b.studioId, { ...input, link: `/admin/bookings/${b.id}` });
    if (b.client.userId) await notify({ ...input, userIds: [b.client.userId], link: "/dashboard/bookings" });
    await db.booking.update({ where: { id: b.id }, data: { reminderSentAt: new Date() } });
  }
}

let scheduled = false;
/** Polls for due jobs and enqueues the periodic sweeps. Safe to call more than once. */
export function startScheduler() {
  if (scheduled) return;
  scheduled = true;
  setInterval(() => void kickWorker(), 5_000).unref?.();
  const hourly = async () => {
    for (const type of ["GALLERY_EXPIRY_SWEEP", "BOOKING_REMINDERS"] as const) {
      const pending = await db.job.count({ where: { type, status: { in: ["QUEUED", "RUNNING"] } } });
      if (!pending) await enqueue(type, {});
    }
  };
  setTimeout(() => void hourly().catch(console.error), 15_000).unref?.();
  setInterval(() => void hourly().catch(console.error), 60 * 60_000).unref?.();
}

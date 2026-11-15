import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifySignedParams } from "@/lib/crypto";
import { storage } from "@/lib/storage";
import { ensureWatermarked } from "@/server/media/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Private media gateway. Every URL is HMAC-signed and expiring, minted only
 * after a server-side permission check — storage keys are never exposed.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string; id: string; variant: string }> }) {
  const { kind, id, variant } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  if (!verifySignedParams(`media:${kind}:${id}:${variant}`, sp.get("exp"), sp.get("sig"))) {
    return new NextResponse("Link expired", { status: 403 });
  }
  const [base, ...flags] = variant.split(".");
  const download = flags.includes("dl");
  const watermark = flags.includes("wm");

  let key: string | undefined;
  let type = "image/webp";
  let filename = "photo";

  if (kind === "p") {
    const photo = await db.photo.findUnique({ where: { id }, include: { gallery: { include: { studio: { select: { name: true, watermarkText: true } } } } } });
    if (!photo) return new NextResponse("Not found", { status: 404 });
    const variants = (photo.variants ?? {}) as Record<string, string>;
    filename = photo.filename;
    if (base === "original" || base === "video") {
      key = photo.originalKey;
      type = photo.mimeType;
    } else {
      key = variants[base];
      if (!key) return new NextResponse("Still processing", { status: 404 });
      if (watermark) key = await ensureWatermarked(key, photo.gallery.studio.watermarkText || photo.gallery.studio.name);
      filename = photo.filename.replace(/\.[^.]+$/, "") + ".webp";
    }
  } else if (kind === "g") {
    const gu = await db.guestUpload.findUnique({ where: { id } });
    if (!gu) return new NextResponse("Not found", { status: 404 });
    filename = gu.filename;
    if (base === "preview" && gu.thumbKey) key = gu.thumbKey;
    else {
      key = gu.key;
      type = gu.mimeType;
    }
  } else if (kind === "a") {
    const a = await db.gridAsset.findUnique({ where: { id } });
    if (!a) return new NextResponse("Not found", { status: 404 });
    filename = a.filename;
    if (base === "preview" && a.previewKey) key = a.previewKey;
    else {
      key = a.key;
      type = a.mimeType;
    }
  } else if (kind === "x") {
    const ar = await db.downloadArchive.findUnique({ where: { id }, include: { gallery: { select: { slug: true } } } });
    if (!ar?.key || ar.status !== "READY") return new NextResponse("Not ready", { status: 404 });
    if (ar.expiresAt && ar.expiresAt < new Date()) return new NextResponse("Archive expired", { status: 410 });
    key = ar.key;
    type = "application/zip";
    filename = `${ar.gallery.slug}.zip`;
  } else if (kind === "e") {
    const ex = await db.gridExport.findUnique({ where: { id }, include: { design: { select: { name: true } } } });
    if (!ex) return new NextResponse("Not found", { status: 404 });
    key = ex.key;
    type = ex.format === "pdf" ? "application/pdf" : ex.format === "png" ? "image/png" : "image/jpeg";
    filename = `${ex.design.name}.${ex.format === "jpg-hq" ? "jpg" : ex.format}`;
  }
  if (!key) return new NextResponse("Not found", { status: 404 });

  if (storage.name === "s3") {
    const url = await storage.presignGet(key, 600, download ? filename : undefined);
    return url ? NextResponse.redirect(url, 302) : new NextResponse("Not found", { status: 404 });
  }

  const st = await storage.stat(key);
  if (!st) return new NextResponse("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": download ? "private, no-store" : "private, max-age=3600",
    "X-Robots-Tag": "noindex",
    "Accept-Ranges": "bytes",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(filename)}"`;

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      const stream = await storage.getStream(key, { start, end });
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": String(end - start + 1) },
      });
    }
  }
  const stream = await storage.getStream(key);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, { headers: { ...headers, "Content-Length": String(st.size) } });
}

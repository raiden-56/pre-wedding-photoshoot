import { Readable, Transform } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifySignedParams } from "@/lib/crypto";
import { storage } from "@/lib/storage";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/media";
import { finalizeGridAsset, finalizeGuestUpload, finalizePhotoUpload } from "@/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signed upload endpoint for the local storage driver. The request body is
 * streamed straight to disk (never buffered), with a hard byte limit.
 * With STORAGE_DRIVER=s3 the browser uploads directly to the bucket instead.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  if (!verifySignedParams(`upload:${kind}:${id}`, sp.get("exp"), sp.get("sig"))) {
    return NextResponse.json({ error: "Upload link expired or invalid" }, { status: 403 });
  }
  if (!req.body) return NextResponse.json({ error: "Empty body" }, { status: 400 });

  let key: string;
  let maxBytes: number;
  let contentType = req.headers.get("content-type") ?? "application/octet-stream";

  if (kind === "photo") {
    const photo = await db.photo.findUnique({ where: { id } });
    if (!photo || photo.status !== "PENDING") return NextResponse.json({ error: "Upload already completed" }, { status: 409 });
    key = photo.originalKey;
    contentType = photo.mimeType;
    maxBytes = photo.kind === "VIDEO" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  } else if (kind === "guest") {
    const gu = await db.guestUpload.findUnique({ where: { id }, include: { gallery: { include: { settings: true } } } });
    if (!gu || gu.size > 0n) return NextResponse.json({ error: "Upload already completed" }, { status: 409 });
    key = gu.key;
    contentType = gu.mimeType;
    maxBytes = (gu.gallery.settings?.guestUploadMaxMb ?? 25) * 1024 * 1024;
  } else if (kind === "asset") {
    const asset = await db.gridAsset.findUnique({ where: { id } });
    if (!asset || asset.size > 0) return NextResponse.json({ error: "Upload already completed" }, { status: 409 });
    key = asset.key;
    contentType = asset.mimeType;
    maxBytes = 40 * 1024 * 1024;
  } else {
    return NextResponse.json({ error: "Unknown upload kind" }, { status: 400 });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return NextResponse.json({ error: "File too large" }, { status: 413 });

  let seen = 0;
  const limiter = new Transform({
    transform(chunk, _e, cb) {
      seen += chunk.length;
      if (seen > maxBytes) cb(new Error("File too large"));
      else cb(null, chunk);
    },
  });

  try {
    const body = Readable.fromWeb(req.body as never).pipe(limiter);
    await storage.putStream(key, body, contentType);
    if (kind === "photo") await finalizePhotoUpload(id);
    else if (kind === "guest") await finalizeGuestUpload(id);
    else {
      const asset = await finalizeGridAsset(id);
      return NextResponse.json({ ok: true, width: asset.width, height: asset.height });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    await storage.delete(key).catch(() => {});
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: message === "File too large" ? 413 : 500 });
  }
}

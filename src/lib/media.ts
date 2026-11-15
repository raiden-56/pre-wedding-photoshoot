import "server-only";
import { signParams } from "@/lib/crypto";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const ACCEPTED_TYPES: readonly string[] = [...IMAGE_TYPES, ...VIDEO_TYPES];
export const MAX_IMAGE_BYTES = 80 * 1024 * 1024; // 80 MB RAW-exported JPEG/PNG
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB

export const VARIANTS = {
  thumb: { width: 520, quality: 72 },
  medium: { width: 1400, quality: 80 },
  large: { width: 2400, quality: 84 },
} as const;
export type VariantName = keyof typeof VARIANTS;

export function extFromName(name: string) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name);
  return m ? `.${m[1].toLowerCase()}` : "";
}

export function normaliseMime(type: string, filename: string) {
  if (type) return type.toLowerCase();
  const ext = extFromName(filename);
  return (
    { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic", ".heif": "image/heif", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" } as Record<string, string>
  )[ext] ?? "application/octet-stream";
}

export function validateMedia(file: { name: string; size: number; type: string }) {
  const type = normaliseMime(file.type, file.name);
  if (!ACCEPTED_TYPES.includes(type)) return { ok: false as const, error: `Unsupported file type (${type || "unknown"})` };
  const isVideo = type.startsWith("video/");
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= 0) return { ok: false as const, error: "Empty file" };
  if (file.size > max) return { ok: false as const, error: `File is larger than ${Math.round(max / 1024 / 1024)} MB` };
  return { ok: true as const, type, kind: isVideo ? ("VIDEO" as const) : ("IMAGE" as const) };
}

type MediaKindPath = "p" | "g" | "a" | "x" | "e";

/** Signed, expiring URL to a private media object. Only call after an access check. */
export function mediaUrl(kind: MediaKindPath, id: string, variant: string, opts: { download?: boolean; ttl?: number } = {}) {
  const v = opts.download ? `${variant}.dl` : variant;
  return `/api/media/${kind}/${id}/${v}?${signParams(`media:${kind}:${id}:${v}`, opts.ttl)}`;
}

export type PhotoVariants = Partial<Record<VariantName | "poster", string>>;

export type ClientPhoto = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  filename: string;
  albumId: string | null;
  width: number;
  height: number;
  blur: string | null;
  caption: string | null;
  thumb: string;
  medium: string;
  large: string;
  video?: string;
  createdAt: string;
};

/** Builds browser-safe photo objects with signed variant URLs. Watermarked variants when required. */
export function toClientPhoto(
  p: { id: string; kind: "IMAGE" | "VIDEO"; filename: string; albumId: string | null; width: number | null; height: number | null; blurDataUrl: string | null; caption: string | null; createdAt: Date },
  opts: { watermark: boolean },
): ClientPhoto {
  const wm = opts.watermark ? ".wm" : "";
  return {
    id: p.id,
    kind: p.kind,
    filename: p.filename,
    albumId: p.albumId,
    width: p.width ?? 1600,
    height: p.height ?? 1067,
    blur: p.blurDataUrl,
    caption: p.caption,
    thumb: p.kind === "VIDEO" ? "" : mediaUrl("p", p.id, `thumb${wm}`),
    medium: p.kind === "VIDEO" ? "" : mediaUrl("p", p.id, `medium${wm}`),
    large: p.kind === "VIDEO" ? "" : mediaUrl("p", p.id, `large${wm}`),
    video: p.kind === "VIDEO" ? mediaUrl("p", p.id, "video") : undefined,
    createdAt: p.createdAt.toISOString(),
  };
}

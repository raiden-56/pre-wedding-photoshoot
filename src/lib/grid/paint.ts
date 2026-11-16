import { filterString, imagePlacement, layoutCells, type CellLayout } from "./layout";
import type { Background, Decoration, DesignState, FontKey, TemplateConfig, TextItem } from "./types";

/*
 * Shared drawing primitives. The DOM editor and the canvas exporter both read
 * these, so what you see while editing is what you export.
 */

/** Unit-box (100×100) SVG paths for decorations. */
export const DECORATION_PATHS: Record<Exclude<Decoration["type"], "sprockets">, { d: string; fill: boolean }> = {
  heart: { d: "M50 88 C20 66 4 50 4 30 C4 16 15 6 28 6 C38 6 46 12 50 20 C54 12 62 6 72 6 C85 6 96 16 96 30 C96 50 80 66 50 88 Z", fill: true },
  floral: {
    d: "M4 50 C30 50 70 50 96 50 M30 50 C28 38 36 30 45 29 C45 40 38 48 30 50 M70 50 C72 62 64 70 55 71 C55 60 62 52 70 50 M50 50 C46 40 49 30 56 25 C59 35 56 44 50 50 M50 50 C54 60 51 70 44 75 C41 65 44 56 50 50",
    fill: false,
  },
  corner: { d: "M0 22 L0 0 L22 0 M78 0 L100 0 L100 22 M100 78 L100 100 L78 100 M22 100 L0 100 L0 78", fill: false },
  frame: { d: "M1 1 H99 V99 H1 Z", fill: false },
  line: { d: "M0 50 H100", fill: false },
};

export function backgroundCss(bg: Background) {
  if (bg.type === "gradient") return `linear-gradient(${bg.angle}deg, ${bg.color}, ${bg.color2})`;
  if (bg.type === "image") return `${bg.color} url(${bg.src}) center/cover`;
  return bg.color;
}

export const CSS_FONTS: Record<FontKey, string> = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  script: "var(--font-serif)",
  mono: '"Courier New", ui-monospace, monospace',
};

export function cellClipCss(l: CellLayout, radius: number) {
  const shape = l.cell.shape ?? "rect";
  if (shape === "circle") return "50%";
  if (shape === "arch") return `${l.photo.w / 2}px ${l.photo.w / 2}px ${radius}px ${radius}px`;
  return `${radius}px`;
}

// ─────────────────────── Canvas export ───────────────────────

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("An image couldn’t be loaded for export"));
    img.src = src;
  });
}

function resolveFont(key: FontKey) {
  if (typeof document === "undefined") return "serif";
  const css = getComputedStyle(document.documentElement);
  const v = key === "sans" ? css.getPropertyValue("--font-sans") : key === "mono" ? CSS_FONTS.mono : css.getPropertyValue("--font-serif");
  return v.trim() || (key === "sans" ? "sans-serif" : "serif");
}

function shapePath(ctx: CanvasRenderingContext2D, l: CellLayout, radius: number) {
  const { x, y, w, h } = l.photo;
  const shape = l.cell.shape ?? "rect";
  ctx.beginPath();
  if (shape === "circle") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === "arch") {
    const r = Math.min(w / 2, h);
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + w / 2, y + r, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  } else ctx.roundRect(x, y, w, h, Math.min(radius, w / 2, h / 2));
}

function drawSprockets(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  const holeW = h * 0.55;
  const holeH = h * 0.6;
  const step = holeW * 1.9;
  ctx.fillStyle = color;
  for (let cx = x + step / 2; cx < x + w - holeW / 2; cx += step) {
    ctx.beginPath();
    ctx.roundRect(cx - holeW / 2, y + (h - holeH) / 2, holeW, holeH, holeW * 0.2);
    ctx.fill();
  }
}

function drawDecoration(ctx: CanvasRenderingContext2D, d: Decoration, W: number, H: number) {
  const x = d.x * W;
  const y = d.y * H;
  const w = d.w * W;
  const h = d.h * H;
  ctx.save();
  if (d.rotate) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((d.rotate * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  if (d.type === "sprockets") {
    drawSprockets(ctx, x, y, w, h, d.color);
  } else {
    const spec = DECORATION_PATHS[d.type];
    const p = new Path2D();
    p.addPath(new Path2D(spec.d), new DOMMatrix().translate(x, y).scale(w / 100, h / 100));
    if (spec.fill) {
      ctx.fillStyle = d.color;
      ctx.fill(p);
    } else {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = Math.max(1, W / 540);
      ctx.lineCap = "round";
      ctx.stroke(p);
    }
  }
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > max && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

function drawText(ctx: CanvasRenderingContext2D, t: TextItem, W: number, H: number) {
  const size = t.size * W;
  ctx.save();
  ctx.fillStyle = t.color;
  ctx.textBaseline = "top";
  ctx.font = `${t.italic || t.font === "script" ? "italic " : ""}${t.weight ?? 400} ${size}px ${resolveFont(t.font)}`;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(t.letterSpacing ?? 0) * size}px`;
  const text = t.uppercase ? t.text.toUpperCase() : t.text;
  const boxX = t.x * W;
  const boxW = t.w * W;
  ctx.textAlign = t.align;
  const ax = t.align === "center" ? boxX + boxW / 2 : t.align === "right" ? boxX + boxW : boxX;
  wrap(ctx, text, boxW).forEach((line, i) => ctx.fillText(line, ax, t.y * H + i * size * 1.15 + size * 0.05));
  ctx.restore();
}

/** Renders a design to a canvas at `scale` × its native size. */
export async function renderDesign(state: DesignState, template: TemplateConfig, scale = 1): Promise<HTMLCanvasElement> {
  const W = Math.round(state.width * scale);
  const H = Math.round(state.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn’t supported in this browser");
  await document.fonts?.ready;

  // background
  const bg = state.background;
  if (bg.type === "gradient") {
    const a = ((bg.angle - 90) * Math.PI) / 180;
    const r = Math.abs(W * Math.cos(a)) / 2 + Math.abs(H * Math.sin(a)) / 2;
    const g = ctx.createLinearGradient(W / 2 - Math.cos(a) * r, H / 2 - Math.sin(a) * r, W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r);
    g.addColorStop(0, bg.color);
    g.addColorStop(1, bg.color2);
    ctx.fillStyle = g;
  } else ctx.fillStyle = bg.color;
  ctx.fillRect(0, 0, W, H);
  if (bg.type === "image") {
    const img = await loadImage(bg.src);
    const p = imagePlacement(img, { w: W, h: H }, { zoom: 1, offsetX: 0, offsetY: 0, rotate: 0, flipX: false, flipY: false, fit: "cover" });
    ctx.drawImage(img, p.x, p.y, p.w, p.h);
  }

  const k = W / state.width;
  const layouts = layoutCells(template, state, W, H);
  const images = await Promise.all(state.cells.map((c) => (c.image ? loadImage(c.image.fullSrc || c.image.src).catch(() => null) : Promise.resolve(null))));

  for (const l of layouts) {
    const cs = state.cells[l.index];
    if (!cs) continue;
    const radius = (cs.radius ?? state.radius) * k;
    ctx.save();
    if (l.rotate) {
      ctx.translate(l.x + l.w / 2, l.y + l.h / 2);
      ctx.rotate((l.rotate * Math.PI) / 180);
      ctx.translate(-(l.x + l.w / 2), -(l.y + l.h / 2));
    }
    const frame = l.cell.frame ?? "none";
    if (frame !== "none") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.22)";
      ctx.shadowBlur = 24 * k;
      ctx.shadowOffsetY = 8 * k;
      ctx.fillStyle = frame === "film" ? "#151413" : "#FFFFFF";
      ctx.fillRect(l.x, l.y, l.w, l.h);
      ctx.restore();
      if (frame === "film") {
        const band = (l.photo.y - l.y) * 0.9;
        drawSprockets(ctx, l.x, l.y + band * 0.05, l.w, band, "rgba(247,244,239,0.85)");
        drawSprockets(ctx, l.x, l.photo.y + l.photo.h + band * 0.05, l.w, band, "rgba(247,244,239,0.85)");
      }
      const caption = cs.caption ?? l.cell.caption;
      if (frame === "polaroid" && caption) {
        const size = l.h * 0.075;
        ctx.fillStyle = "#3a3835";
        ctx.font = `italic 400 ${size}px ${resolveFont("serif")}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(caption, l.x + l.w / 2, l.photo.y + l.photo.h + (l.y + l.h - l.photo.y - l.photo.h) / 2);
      }
    } else if (state.shadow > 0) {
      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${Math.min(0.35, state.shadow / 60)})`;
      ctx.shadowBlur = state.shadow * 1.5 * k;
      ctx.shadowOffsetY = (state.shadow / 2) * k;
      shapePath(ctx, l, radius);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    shapePath(ctx, l, radius);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#ece6dc";
    ctx.fillRect(l.photo.x, l.photo.y, l.photo.w, l.photo.h);
    const img = images[l.index];
    if (img && cs.image) {
      const t = cs.transform;
      const p = imagePlacement({ width: img.naturalWidth, height: img.naturalHeight }, l.photo, t);
      ctx.filter = filterString(cs.filters);
      ctx.translate(l.photo.x + p.x + p.w / 2, l.photo.y + p.y + p.h / 2);
      if (t.rotate) ctx.rotate((t.rotate * Math.PI) / 180);
      ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);
      ctx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
      ctx.filter = "none";
    }
    ctx.restore();
    const bw = (cs.borderWidth ?? state.borderWidth) * k;
    if (bw > 0) {
      ctx.save();
      shapePath(ctx, l, radius);
      ctx.clip();
      shapePath(ctx, l, radius);
      ctx.lineWidth = bw * 2;
      ctx.strokeStyle = state.borderColor;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  for (const d of state.decorations) drawDecoration(ctx, d, W, H);
  for (const t of state.texts) if (t.text.trim()) drawText(ctx, t, W, H);

  if (state.watermark.enabled && state.watermark.text) {
    const size = W * 0.018;
    ctx.save();
    ctx.font = `500 ${size}px ${resolveFont("sans")}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = size * 0.6;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(state.watermark.text, W - size * 1.4, H - size * 1.2);
    ctx.restore();
  }
  return canvas;
}

export async function exportDesign(state: DesignState, template: TemplateConfig, format: "png" | "jpg" | "pdf", scale: number, filename: string) {
  const canvas = await renderDesign(state, template, scale);
  const safe = filename.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "design";
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height], hotfixes: ["px_scaling"] });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${safe}.pdf`);
    return;
  }
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, format === "png" ? "image/png" : "image/jpeg", 0.94));
  if (!blob) throw new Error("Export failed");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

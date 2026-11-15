import { DEFAULT_FILTERS, DEFAULT_TRANSFORM, type CellFilters, type CellState, type CellTransform, type DesignState, type ImageRef, type TemplateCell, type TemplateConfig } from "./types";

export type Rect = { x: number; y: number; w: number; h: number };
export type CellLayout = Rect & { index: number; cell: TemplateCell; rotate: number; z: number; photo: Rect };

const EPS = 0.002;

/**
 * Absolute geometry for every cell at a given output size. Used by the DOM
 * editor (scaled with CSS) and the canvas exporter, so both always agree.
 * Template cells are fractions of the padded content box; gaps are inset only
 * on interior edges so outer padding stays exact at every export size.
 */
export function layoutCells(template: Pick<TemplateConfig, "cells" | "width">, state: Pick<DesignState, "gap" | "padding">, W: number, H: number): CellLayout[] {
  const k = W / template.width; // scale spacing with output resolution
  const pad = state.padding * k;
  const gap = state.gap * k;
  const cw = W - pad * 2;
  const ch = H - pad * 2;
  return template.cells
    .map((cell, index) => {
      const left = cell.x <= EPS ? 0 : gap / 2;
      const top = cell.y <= EPS ? 0 : gap / 2;
      const right = cell.x + cell.w >= 1 - EPS ? 0 : gap / 2;
      const bottom = cell.y + cell.h >= 1 - EPS ? 0 : gap / 2;
      const x = pad + cell.x * cw + left;
      const y = pad + cell.y * ch + top;
      const w = Math.max(1, cell.w * cw - left - right);
      const h = Math.max(1, cell.h * ch - top - bottom);
      const photo = cell.frame === "polaroid" ? polaroidInner({ x, y, w, h }) : cell.frame === "film" ? { x: x + w * 0.04, y: y + h * 0.06, w: w * 0.92, h: h * 0.88 } : { x, y, w, h };
      return { x, y, w, h, index, cell, rotate: cell.rotate ?? 0, z: cell.z ?? 0, photo };
    })
    .sort((a, b) => a.z - b.z);
}

export function polaroidInner(r: Rect): Rect {
  const side = r.w * 0.06;
  return { x: r.x + side, y: r.y + side, w: r.w - side * 2, h: r.h - side - r.h * 0.2 };
}

/** Where the image is drawn (relative to the photo rect's top-left), before rotation. */
export function imagePlacement(img: { width: number; height: number }, box: { w: number; h: number }, t: CellTransform) {
  const scale = (t.fit === "contain" ? Math.min(box.w / img.width, box.h / img.height) : Math.max(box.w / img.width, box.h / img.height)) * t.zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  const overflowX = Math.max(0, w - box.w);
  const overflowY = Math.max(0, h - box.h);
  const x = (box.w - w) / 2 + (t.offsetX * overflowX) / 2;
  const y = (box.h - h) / 2 + (t.offsetY * overflowY) / 2;
  return { x, y, w, h };
}

export function filterString(f: CellFilters) {
  const parts = [`brightness(${f.brightness}%)`, `contrast(${f.contrast}%)`, `saturate(${f.saturation}%)`];
  if (f.warmth > 0) parts.push(`sepia(${f.warmth * 0.45}%)`);
  if (f.warmth < 0) parts.push(`hue-rotate(${f.warmth * 0.25}deg)`);
  return parts.join(" ");
}

export function emptyCell(caption?: string): CellState {
  return { image: null, transform: { ...DEFAULT_TRANSFORM }, filters: { ...DEFAULT_FILTERS }, caption };
}

export function createDesignState(tpl: TemplateConfig, images: ImageRef[] = [], watermarkText = ""): DesignState {
  return {
    version: 1,
    templateId: tpl.id,
    width: tpl.width,
    height: tpl.height,
    background: tpl.background,
    gap: tpl.gap,
    padding: tpl.padding,
    radius: tpl.radius,
    borderWidth: tpl.borderWidth,
    borderColor: tpl.borderColor,
    shadow: tpl.shadow,
    cells: tpl.cells.map((c, i) => ({ ...emptyCell(c.caption), image: images[i] ?? null })),
    texts: tpl.texts.map((t) => ({ ...t })),
    decorations: tpl.decorations.map((d) => ({ ...d })),
    watermark: { enabled: false, text: watermarkText },
  };
}

/** Switch template while keeping the user's photos (in order) and text edits where roles match. */
export function applyTemplate(state: DesignState, tpl: TemplateConfig): DesignState {
  const images = state.cells.map((c) => c.image).filter(Boolean) as ImageRef[];
  const next = createDesignState(tpl, images, state.watermark.text);
  next.watermark = state.watermark;
  next.texts = next.texts.map((t) => {
    const prev = t.role ? state.texts.find((p) => p.role === t.role) : undefined;
    return prev ? { ...t, text: prev.text } : t;
  });
  return next;
}

export function templateAspect(tpl: Pick<TemplateConfig, "width" | "height">) {
  return tpl.width / tpl.height;
}

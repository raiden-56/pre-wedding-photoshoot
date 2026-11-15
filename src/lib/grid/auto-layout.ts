import { BUILTIN_TEMPLATES } from "./templates";
import { layoutCells } from "./layout";
import type { ImageRef, TemplateConfig, TemplateStyle } from "./types";

/*
 * Smart Auto Layout
 * -----------------
 * Given a set of photographs and a desired style, choose the template whose
 * cell shapes best fit the photos' orientations, then assign each photo to the
 * cell where it will be cropped least. Hero (largest) cells are assigned first
 * and prefer photos the user selected earlier.
 */

export const AUTO_STYLES: { key: string; label: string; styles: TemplateStyle[]; blurb: string }[] = [
  { key: "editorial", label: "Editorial", styles: ["editorial", "magazine", "cinematic"], blurb: "Asymmetric, magazine-like compositions" },
  { key: "minimal", label: "Minimal", styles: ["minimal", "instagram"], blurb: "Clean grids and quiet white space" },
  { key: "wedding", label: "Wedding Story", styles: ["wedding", "luxury", "heart"], blurb: "Hero photograph with supporting moments" },
  { key: "cinematic", label: "Cinematic", styles: ["cinematic", "film"], blurb: "Wide frames and film strips" },
  { key: "playful", label: "Playful", styles: ["polaroid", "timeline", "story", "travel"], blurb: "Polaroids, timelines and journals" },
];

export type AutoSuggestion = { template: TemplateConfig; assignment: ImageRef[]; score: number; used: number };

const logRatio = (a: number, b: number) => Math.abs(Math.log(a / b));

function assign(tpl: TemplateConfig, photos: ImageRef[]) {
  const cells = layoutCells(tpl, { gap: tpl.gap, padding: tpl.padding }, tpl.width, tpl.height)
    .map((c) => ({ index: c.index, ar: c.photo.w / c.photo.h, area: c.photo.w * c.photo.h }))
    .sort((a, b) => b.area - a.area);
  const totalArea = cells.reduce((s, c) => s + c.area, 0);
  const remaining = photos.map((p, order) => ({ p, order, ar: p.width / p.height }));
  const result: ImageRef[] = new Array(tpl.cells.length);
  let cost = 0;
  for (const cell of cells) {
    let best = 0;
    let bestCost = Infinity;
    remaining.forEach((r, i) => {
      // crop cost dominates; earlier-selected photos get a gentle priority for big cells
      const c = logRatio(cell.ar, r.ar) + r.order * 0.015;
      if (c < bestCost) {
        bestCost = c;
        best = i;
      }
    });
    const [picked] = remaining.splice(best, 1);
    result[cell.index] = picked.p;
    cost += logRatio(cell.ar, picked.ar) * (cell.area / totalArea);
  }
  return { result, cost };
}

export function suggestLayouts(photos: ImageRef[], styleKey: string, extraTemplates: TemplateConfig[] = [], limit = 4): AutoSuggestion[] {
  if (photos.length < 2) return [];
  const style = AUTO_STYLES.find((s) => s.key === styleKey) ?? AUTO_STYLES[0];
  const pool = [...extraTemplates, ...BUILTIN_TEMPLATES].filter((t) => style.styles.includes(t.style) && t.cells.length <= photos.length && t.cells.length >= 2);
  const candidates = pool.length ? pool : BUILTIN_TEMPLATES.filter((t) => t.cells.length <= photos.length);
  return candidates
    .map((tpl) => {
      const { result, cost } = assign(tpl, photos);
      // prefer using as many of the chosen photos as possible
      const unused = (photos.length - tpl.cells.length) / photos.length;
      return { template: tpl, assignment: result, used: tpl.cells.length, score: cost + unused * 0.9 };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

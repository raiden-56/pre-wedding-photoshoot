import type { Decoration, TemplateCell, TemplateConfig, TextItem } from "./types";

/*
 * Built-in template library. Each template is pure data — the editor, preview
 * thumbnails, Smart Auto Layout and the canvas exporter all read the same config,
 * so adding a template never requires editor changes.
 */

const IVORY = "#F7F4EF";
const CHAMPAGNE = "#E8D8C3";
const CHARCOAL = "#242321";
const OLIVE = "#777A68";
const WHITE = "#FFFFFF";

const SQ = { width: 1080, height: 1080 };
const PORTRAIT = { width: 1080, height: 1350 };
const STORY = { width: 1080, height: 1920 };
const LANDSCAPE = { width: 1920, height: 1080 };

const grid = (cols: number, rows: number, skip: (c: number, r: number) => boolean = () => false): TemplateCell[] => {
  const cells: TemplateCell[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!skip(c, r)) cells.push({ x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows });
  return cells;
};

const t = (id: string, text: string, x: number, y: number, w: number, size: number, extra: Partial<TextItem> = {}): TextItem => ({
  id,
  text,
  x,
  y,
  w,
  size,
  font: "serif",
  align: "center",
  color: CHARCOAL,
  ...extra,
});

const d = (id: string, type: Decoration["type"], x: number, y: number, w: number, h: number, color = CHARCOAL, rotate = 0): Decoration => ({ id, type, x, y, w, h, color, rotate });

const base = {
  gap: 12,
  padding: 0,
  radius: 0,
  borderWidth: 0,
  borderColor: WHITE,
  shadow: 0,
  background: { type: "color" as const, color: WHITE },
  texts: [] as TextItem[],
  decorations: [] as Decoration[],
  tags: [] as string[],
};

export const BUILTIN_TEMPLATES: TemplateConfig[] = [
  {
    ...base,
    id: "duo-side-by-side",
    name: "Side by Side",
    description: "Two portraits, perfectly balanced.",
    style: "minimal",
    ...SQ,
    gap: 10,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
    tags: ["Instagram Collages"],
    popular: true,
  },
  {
    ...base,
    id: "duo-over-under",
    name: "Over & Under",
    description: "Two landscapes stacked for a tall post.",
    style: "minimal",
    ...PORTRAIT,
    padding: 36,
    gap: 18,
    background: { type: "color", color: IVORY },
    cells: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    ...base,
    id: "before-after",
    name: "Then & Now",
    description: "A before-and-after split with labels.",
    style: "editorial",
    ...LANDSCAPE,
    gap: 6,
    background: { type: "color", color: CHARCOAL },
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
    texts: [
      t("l", "BEFORE", 0.03, 0.9, 0.2, 0.014, { font: "sans", align: "left", color: WHITE, letterSpacing: 0.3, weight: 600 }),
      t("r", "AFTER", 0.77, 0.9, 0.2, 0.014, { font: "sans", align: "right", color: WHITE, letterSpacing: 0.3, weight: 600 }),
    ],
    tags: ["Landscape Collages"],
  },
  {
    ...base,
    id: "golden-ratio-3",
    name: "Golden Ratio",
    description: "One hero portrait and two quiet supporting frames.",
    style: "editorial",
    ...PORTRAIT,
    gap: 10,
    cells: [
      { x: 0, y: 0, w: 0.618, h: 1 },
      { x: 0.618, y: 0, w: 0.382, h: 0.5 },
      { x: 0.618, y: 0.5, w: 0.382, h: 0.5 },
    ],
    popular: true,
    tags: ["Portrait Collages", "Pre-Wedding Collages"],
  },
  {
    ...base,
    id: "triptych",
    name: "Triptych",
    description: "Three tall panels in a gallery-white mount.",
    style: "minimal",
    ...LANDSCAPE,
    padding: 70,
    gap: 28,
    background: { type: "color", color: IVORY },
    cells: grid(3, 1),
    tags: ["Landscape Collages"],
  },
  {
    ...base,
    id: "editorial-three",
    name: "Editorial Three",
    description: "A wide opener over two details, with a headline.",
    style: "magazine",
    ...PORTRAIT,
    padding: 48,
    gap: 14,
    background: { type: "color", color: IVORY },
    cells: [
      { x: 0, y: 0.1, w: 1, h: 0.5 },
      { x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
    texts: [t("title", "Aarav & Ananya", 0.05, 0.025, 0.9, 0.062, { role: "names", italic: true }), t("sub", "GOA · DECEMBER", 0.05, 0.088, 0.9, 0.013, { font: "sans", letterSpacing: 0.4, color: OLIVE, role: "location" })],
    tags: ["Pre-Wedding Collages"],
  },
  {
    ...base,
    id: "classic-four",
    name: "Classic Four",
    description: "An even 2×2 grid with hairline gaps.",
    style: "instagram",
    ...SQ,
    gap: 8,
    cells: grid(2, 2),
    popular: true,
  },
  {
    ...base,
    id: "portrait-four",
    name: "Portrait Four",
    description: "Four frames with names and date beneath.",
    style: "luxury",
    ...PORTRAIT,
    padding: 54,
    gap: 16,
    background: { type: "color", color: IVORY },
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0, w: 0.5, h: 0.42 },
      { x: 0, y: 0.42, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.42, w: 0.5, h: 0.42 },
    ],
    texts: [t("names", "Aarav & Ananya", 0.1, 0.875, 0.8, 0.055, { role: "names" }), t("date", "12 · 12 · 2026", 0.1, 0.94, 0.8, 0.014, { font: "sans", letterSpacing: 0.4, color: OLIVE, role: "date" })],
    decorations: [d("l1", "line", 0.3, 0.865, 0.4, 0.001, CHAMPAGNE)],
    tags: ["Wedding Collages", "Instagram Collages"],
  },
  {
    ...base,
    id: "magazine-four",
    name: "Magazine Spread",
    description: "Asymmetric editorial layout with a dominant image.",
    style: "magazine",
    ...PORTRAIT,
    gap: 10,
    cells: [
      { x: 0, y: 0, w: 0.64, h: 0.62 },
      { x: 0.64, y: 0, w: 0.36, h: 0.31 },
      { x: 0.64, y: 0.31, w: 0.36, h: 0.31 },
      { x: 0, y: 0.62, w: 1, h: 0.38 },
    ],
    isNew: true,
  },
  {
    ...base,
    id: "film-strip-4",
    name: "Film Strip",
    description: "Four frames on a 35mm strip — made for stories.",
    style: "film",
    ...STORY,
    padding: 0,
    gap: 34,
    background: { type: "color", color: "#141312" },
    cells: [
      { x: 0.13, y: 0.04, w: 0.74, h: 0.23 },
      { x: 0.13, y: 0.27, w: 0.74, h: 0.23 },
      { x: 0.13, y: 0.5, w: 0.74, h: 0.23 },
      { x: 0.13, y: 0.73, w: 0.74, h: 0.23 },
    ],
    decorations: [d("s1", "sprockets", 0.025, 0, 0.07, 1, IVORY), d("s2", "sprockets", 0.905, 0, 0.07, 1, IVORY)],
    texts: [t("frame", "SAANJH 400", 0.13, 0.975, 0.74, 0.016, { font: "mono", color: "#E3A35A", align: "left", letterSpacing: 0.2 })],
    tags: ["Story Templates", "Cinematic Layouts"],
    popular: true,
  },
  {
    ...base,
    id: "cinema-reel",
    name: "Cinema Reel",
    description: "Horizontal film reel with four wide frames.",
    style: "film",
    ...LANDSCAPE,
    gap: 26,
    background: { type: "color", color: "#141312" },
    cells: [
      { x: 0.02, y: 0.17, w: 0.24, h: 0.66 },
      { x: 0.26, y: 0.17, w: 0.24, h: 0.66 },
      { x: 0.5, y: 0.17, w: 0.24, h: 0.66 },
      { x: 0.74, y: 0.17, w: 0.24, h: 0.66 },
    ],
    decorations: [d("s1", "sprockets", 0, 0.03, 1, 0.1, IVORY, 90), d("s2", "sprockets", 0, 0.87, 1, 0.1, IVORY, 90)],
    tags: ["Cinematic Layouts", "Landscape Collages"],
  },
  {
    ...base,
    id: "editorial-five",
    name: "Editorial Five",
    description: "A cinematic centre frame flanked by four details.",
    style: "cinematic",
    ...LANDSCAPE,
    gap: 10,
    cells: [
      { x: 0.25, y: 0, w: 0.5, h: 1 },
      { x: 0, y: 0, w: 0.25, h: 0.5 },
      { x: 0, y: 0.5, w: 0.25, h: 0.5 },
      { x: 0.75, y: 0, w: 0.25, h: 0.5 },
      { x: 0.75, y: 0.5, w: 0.25, h: 0.5 },
    ],
    popular: true,
    tags: ["Landscape Collages"],
  },
  {
    ...base,
    id: "wedding-story-5",
    name: "Wedding Story",
    description: "A hero photograph over four supporting moments.",
    style: "wedding",
    ...PORTRAIT,
    padding: 40,
    gap: 12,
    background: { type: "color", color: IVORY },
    cells: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.25, h: 0.26 },
      { x: 0.25, y: 0.6, w: 0.25, h: 0.26 },
      { x: 0.5, y: 0.6, w: 0.25, h: 0.26 },
      { x: 0.75, y: 0.6, w: 0.25, h: 0.26 },
    ],
    texts: [t("names", "Aarav & Ananya", 0.05, 0.89, 0.9, 0.05, { role: "names", italic: true }), t("date", "THE WEDDING · 12.12.2026", 0.05, 0.948, 0.9, 0.013, { font: "sans", color: OLIVE, letterSpacing: 0.4, role: "date" })],
    tags: ["Wedding Collages"],
    popular: true,
  },
  {
    ...base,
    id: "travel-journal-5",
    name: "Travel Journal",
    description: "One sweeping landscape and four postcards.",
    style: "travel",
    ...LANDSCAPE,
    padding: 48,
    gap: 16,
    background: { type: "color", color: "#EFE9E0" },
    cells: [
      { x: 0, y: 0, w: 0.6, h: 0.86 },
      { x: 0.6, y: 0, w: 0.2, h: 0.43 },
      { x: 0.8, y: 0, w: 0.2, h: 0.43 },
      { x: 0.6, y: 0.43, w: 0.2, h: 0.43 },
      { x: 0.8, y: 0.43, w: 0.2, h: 0.43 },
    ],
    texts: [t("loc", "Coorg, Karnataka", 0.03, 0.915, 0.5, 0.028, { align: "left", italic: true, role: "location" }), t("coords", "12.3375° N · 75.8069° E", 0.55, 0.925, 0.42, 0.011, { font: "mono", align: "right", color: OLIVE })],
    tags: ["Landscape Collages", "Pre-Wedding Collages"],
    isNew: true,
  },
  {
    ...base,
    id: "masonry-six",
    name: "Masonry Six",
    description: "Staggered columns like a printed contact wall.",
    style: "editorial",
    ...PORTRAIT,
    gap: 8,
    cells: [
      { x: 0, y: 0, w: 0.333, h: 0.4 },
      { x: 0, y: 0.4, w: 0.333, h: 0.6 },
      { x: 0.333, y: 0, w: 0.334, h: 0.6 },
      { x: 0.333, y: 0.6, w: 0.334, h: 0.4 },
      { x: 0.667, y: 0, w: 0.333, h: 0.45 },
      { x: 0.667, y: 0.45, w: 0.333, h: 0.55 },
    ],
    tags: ["Portrait Collages"],
  },
  {
    ...base,
    id: "cinematic-six",
    name: "Cinematic Six",
    description: "Six letterboxed frames with a title card.",
    style: "cinematic",
    ...LANDSCAPE,
    padding: 60,
    gap: 14,
    background: { type: "color", color: CHARCOAL },
    cells: [
      { x: 0, y: 0.14, w: 0.333, h: 0.43 },
      { x: 0.333, y: 0.14, w: 0.334, h: 0.43 },
      { x: 0.667, y: 0.14, w: 0.333, h: 0.43 },
      { x: 0, y: 0.57, w: 0.333, h: 0.43 },
      { x: 0.333, y: 0.57, w: 0.334, h: 0.43 },
      { x: 0.667, y: 0.57, w: 0.333, h: 0.43 },
    ],
    texts: [t("title", "A Love Story in Six Scenes", 0.1, 0.03, 0.8, 0.026, { color: IVORY, italic: true, role: "title" })],
    tags: ["Cinematic Layouts", "Landscape Collages"],
  },
  {
    ...base,
    id: "contact-sheet-6",
    name: "Contact Sheet",
    description: "Six squares with frame numbers, like a darkroom proof.",
    style: "film",
    ...SQ,
    padding: 64,
    gap: 22,
    background: { type: "color", color: "#1B1A18" },
    cells: grid(3, 2).map((c) => ({ ...c, y: c.y * 0.9 + 0.05, h: c.h * 0.9 })),
    texts: [t("n", "01   02   03   04   05   06", 0, 0.945, 1, 0.012, { font: "mono", color: "#E3A35A", letterSpacing: 0.3 })],
    tags: ["Instagram Collages"],
  },
  {
    ...base,
    id: "eight-moments",
    name: "Eight Moments",
    description: "Mixed sizes for an eventful day.",
    style: "wedding",
    ...PORTRAIT,
    gap: 8,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.3 },
      { x: 0.5, y: 0, w: 0.25, h: 0.3 },
      { x: 0.75, y: 0, w: 0.25, h: 0.3 },
      { x: 0, y: 0.3, w: 0.25, h: 0.35 },
      { x: 0.25, y: 0.3, w: 0.5, h: 0.35 },
      { x: 0.75, y: 0.3, w: 0.25, h: 0.35 },
      { x: 0, y: 0.65, w: 0.5, h: 0.35 },
      { x: 0.5, y: 0.65, w: 0.5, h: 0.35 },
    ],
    tags: ["Wedding Collages"],
  },
  {
    ...base,
    id: "instagram-nine",
    name: "Instagram Nine",
    description: "The classic 3×3 square grid.",
    style: "instagram",
    ...SQ,
    gap: 6,
    cells: grid(3, 3),
    popular: true,
  },
  {
    ...base,
    id: "wedding-wall-12",
    name: "Wedding Wall",
    description: "Twelve frames around one hero moment.",
    style: "wedding",
    ...PORTRAIT,
    gap: 6,
    cells: (() => {
      const cells: TemplateCell[] = [{ x: 0, y: 0, w: 2 / 3, h: 2 / 5 }];
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 3; c++) {
          if (r < 2 && c < 2) continue;
          cells.push({ x: c / 3, y: r / 5, w: 1 / 3, h: 1 / 5 });
        }
      return cells;
    })(),
    tags: ["Wedding Collages"],
  },
  {
    ...base,
    id: "photo-wall-16",
    name: "Photo Wall",
    description: "Sixteen even tiles — the whole celebration at a glance.",
    style: "instagram",
    ...SQ,
    gap: 4,
    cells: grid(4, 4),
  },
  {
    ...base,
    id: "heart-sixteen",
    name: "Heart of Sixteen",
    description: "Sixteen squares arranged into a heart.",
    style: "heart",
    ...SQ,
    padding: 70,
    gap: 8,
    background: { type: "color", color: "#F3E6DA" },
    cells: grid(5, 5, (c, r) => {
      const map = ["01010", "11111", "11111", "01110", "00100"];
      return map[r][c] === "0";
    }),
    tags: ["Wedding Collages", "Pre-Wedding Collages"],
    isNew: true,
  },
  {
    ...base,
    id: "polaroid-trio",
    name: "Polaroid Trio",
    description: "Three instant prints scattered on linen.",
    style: "polaroid",
    ...SQ,
    gap: 0,
    shadow: 0.5,
    background: { type: "color", color: CHAMPAGNE },
    cells: [
      { x: 0.06, y: 0.1, w: 0.42, h: 0.5, rotate: -6, frame: "polaroid", caption: "first date", z: 1 },
      { x: 0.5, y: 0.06, w: 0.42, h: 0.5, rotate: 5, frame: "polaroid", caption: "the proposal", z: 2 },
      { x: 0.28, y: 0.46, w: 0.42, h: 0.5, rotate: -1.5, frame: "polaroid", caption: "forever", z: 3 },
    ],
    tags: ["Polaroid Layouts", "Pre-Wedding Collages"],
    popular: true,
  },
  {
    ...base,
    id: "polaroid-scatter-5",
    name: "Polaroid Scatter",
    description: "Five prints tumbling down the page.",
    style: "polaroid",
    ...PORTRAIT,
    gap: 0,
    shadow: 0.5,
    background: { type: "color", color: IVORY },
    cells: [
      { x: 0.04, y: 0.04, w: 0.44, h: 0.34, rotate: -5, frame: "polaroid", caption: "", z: 1 },
      { x: 0.52, y: 0.08, w: 0.44, h: 0.34, rotate: 4, frame: "polaroid", caption: "", z: 2 },
      { x: 0.28, y: 0.33, w: 0.44, h: 0.34, rotate: -2, frame: "polaroid", caption: "", z: 3 },
      { x: 0.04, y: 0.62, w: 0.44, h: 0.34, rotate: 3, frame: "polaroid", caption: "", z: 4 },
      { x: 0.52, y: 0.6, w: 0.44, h: 0.34, rotate: -4, frame: "polaroid", caption: "", z: 5 },
    ],
    tags: ["Polaroid Layouts"],
  },
  {
    ...base,
    id: "centre-stage",
    name: "Centre Stage",
    description: "The couple under an arch, framed by four corners.",
    style: "luxury",
    ...PORTRAIT,
    padding: 50,
    gap: 14,
    background: { type: "color", color: IVORY },
    cells: [
      { x: 0.24, y: 0.04, w: 0.52, h: 0.66, shape: "arch", z: 2 },
      { x: 0, y: 0.04, w: 0.22, h: 0.32 },
      { x: 0, y: 0.38, w: 0.22, h: 0.32 },
      { x: 0.78, y: 0.04, w: 0.22, h: 0.32 },
      { x: 0.78, y: 0.38, w: 0.22, h: 0.32 },
    ],
    texts: [t("names", "Aarav & Ananya", 0.05, 0.8, 0.9, 0.07, { role: "names", italic: true }), t("date", "TWELFTH OF DECEMBER, TWENTY TWENTY-SIX", 0.05, 0.89, 0.9, 0.0125, { font: "sans", letterSpacing: 0.35, color: OLIVE, role: "date" })],
    decorations: [d("f1", "floral", 0.42, 0.74, 0.16, 0.05, OLIVE)],
    tags: ["Wedding Collages"],
    isNew: true,
  },
  {
    ...base,
    id: "magazine-cover",
    name: "Magazine Cover",
    description: "A full-bleed cover with masthead and cover lines.",
    style: "magazine",
    ...PORTRAIT,
    gap: 0,
    cells: [
      { x: 0, y: 0, w: 1, h: 1, z: 0 },
      { x: 0.66, y: 0.66, w: 0.28, h: 0.13, z: 2 },
      { x: 0.66, y: 0.81, w: 0.28, h: 0.13, z: 2 },
    ],
    borderWidth: 0,
    texts: [
      t("mast", "SAANJH", 0.04, 0.03, 0.92, 0.17, { color: WHITE, letterSpacing: 0.05 }),
      t("issue", "THE LOVE ISSUE · VOL. 01", 0.04, 0.215, 0.92, 0.013, { font: "sans", color: WHITE, letterSpacing: 0.45 }),
      t("names", "Aarav & Ananya", 0.05, 0.8, 0.55, 0.06, { color: WHITE, align: "left", italic: true, role: "names" }),
      t("line", "Two hearts. One beautiful story.", 0.05, 0.885, 0.55, 0.018, { font: "sans", color: WHITE, align: "left", role: "caption" }),
    ],
    tags: ["Portrait Collages"],
    popular: true,
  },
  {
    ...base,
    id: "story-trio",
    name: "Story Trio",
    description: "Three stacked frames with a title — sized for stories.",
    style: "story",
    ...STORY,
    padding: 64,
    gap: 20,
    background: { type: "color", color: IVORY },
    cells: [
      { x: 0, y: 0.12, w: 1, h: 0.293 },
      { x: 0, y: 0.413, w: 1, h: 0.293 },
      { x: 0, y: 0.706, w: 1, h: 0.294 },
    ],
    texts: [t("title", "our little forever", 0.05, 0.035, 0.9, 0.075, { italic: true, role: "title" })],
    tags: ["Story Templates", "Instagram Collages"],
  },
  {
    ...base,
    id: "timeline-four",
    name: "Love Timeline",
    description: "Four chapters in order, with a thread through time.",
    style: "timeline",
    ...LANDSCAPE,
    padding: 80,
    gap: 40,
    background: { type: "color", color: IVORY },
    cells: [
      { x: 0, y: 0.05, w: 0.25, h: 0.62 },
      { x: 0.25, y: 0.05, w: 0.25, h: 0.62 },
      { x: 0.5, y: 0.05, w: 0.25, h: 0.62 },
      { x: 0.75, y: 0.05, w: 0.25, h: 0.62 },
    ],
    decorations: [d("tl", "line", 0.05, 0.775, 0.9, 0.0015, OLIVE), d("h1", "heart", 0.488, 0.758, 0.024, 0.036, OLIVE)],
    texts: [
      t("a", "First Meeting", 0.06, 0.82, 0.2, 0.017, { italic: true }),
      t("b", "First Date", 0.29, 0.82, 0.2, 0.017, { italic: true }),
      t("c", "The Proposal", 0.51, 0.82, 0.2, 0.017, { italic: true }),
      t("e", "Forever", 0.74, 0.82, 0.2, 0.017, { italic: true }),
    ],
    tags: ["Landscape Collages", "Pre-Wedding Collages"],
  },
  {
    ...base,
    id: "champagne-duo",
    name: "Champagne Duo",
    description: "Two arched portraits with elegant serif lettering.",
    style: "luxury",
    ...PORTRAIT,
    padding: 70,
    gap: 30,
    background: { type: "color", color: "#EADCC8" },
    cells: [
      { x: 0, y: 0.04, w: 0.5, h: 0.66, shape: "arch" },
      { x: 0.5, y: 0.04, w: 0.5, h: 0.66, shape: "arch" },
    ],
    texts: [
      t("names", "Aarav & Ananya", 0.05, 0.79, 0.9, 0.068, { role: "names" }),
      t("loc", "UDAIPUR", 0.05, 0.885, 0.9, 0.013, { font: "sans", letterSpacing: 0.6, color: OLIVE, role: "location" }),
    ],
    decorations: [d("c1", "corner", 0.03, 0.02, 0.94, 0.96, "#B5A99A")],
    tags: ["Wedding Collages", "Pre-Wedding Collages"],
  },
  {
    ...base,
    id: "gallery-frame",
    name: "Gallery Frame",
    description: "A single photograph matted like a fine-art print.",
    style: "minimal",
    ...PORTRAIT,
    padding: 110,
    gap: 0,
    background: { type: "color", color: WHITE },
    cells: [{ x: 0, y: 0, w: 1, h: 0.86 }],
    texts: [t("cap", "Aarav & Ananya · Goa", 0, 0.885, 1, 0.016, { font: "sans", color: "#8a857d", letterSpacing: 0.2, role: "caption" })],
    decorations: [d("fr", "frame", 0.035, 0.028, 0.93, 0.944, "#D8D2C8")],
  },
  {
    ...base,
    id: "landscape-mosaic-7",
    name: "Landscape Mosaic",
    description: "Seven frames in a wide editorial mosaic.",
    style: "editorial",
    ...LANDSCAPE,
    gap: 8,
    cells: [
      { x: 0, y: 0, w: 0.4, h: 0.6 },
      { x: 0, y: 0.6, w: 0.2, h: 0.4 },
      { x: 0.2, y: 0.6, w: 0.2, h: 0.4 },
      { x: 0.4, y: 0, w: 0.3, h: 1 },
      { x: 0.7, y: 0, w: 0.3, h: 0.34 },
      { x: 0.7, y: 0.34, w: 0.3, h: 0.33 },
      { x: 0.7, y: 0.67, w: 0.3, h: 0.33 },
    ],
    tags: ["Landscape Collages", "Cinematic Layouts"],
  },
  {
    ...base,
    id: "save-the-date",
    name: "Save the Date",
    description: "Story-sized announcement with a countdown feel.",
    style: "story",
    ...STORY,
    padding: 80,
    gap: 18,
    background: { type: "gradient", color: "#F7F4EF", color2: "#E8D8C3", angle: 180 },
    cells: [
      { x: 0, y: 0.17, w: 1, h: 0.52, shape: "arch" },
      { x: 0, y: 0.71, w: 0.5, h: 0.15 },
      { x: 0.5, y: 0.71, w: 0.5, h: 0.15 },
    ],
    texts: [
      t("st", "SAVE THE DATE", 0.05, 0.05, 0.9, 0.02, { font: "sans", letterSpacing: 0.55, color: OLIVE }),
      t("names", "Aarav & Ananya", 0.05, 0.085, 0.9, 0.08, { italic: true, role: "names" }),
      t("date", "12 . 12 . 2026", 0.05, 0.895, 0.9, 0.05, { role: "date" }),
    ],
    tags: ["Story Templates", "Wedding Collages"],
    isNew: true,
  },
];

const COUNT_CATEGORIES: Record<number, string> = {
  2: "2-Photo Grids",
  3: "3-Photo Grids",
  4: "4-Photo Grids",
  5: "5-Photo Grids",
  6: "6-Photo Grids",
  8: "8-Photo Grids",
  9: "9-Photo Grids",
  12: "12-Photo Grids",
  16: "16-Photo Grids",
};

const STYLE_CATEGORIES: Partial<Record<TemplateConfig["style"], string>> = {
  minimal: "Minimal Layouts",
  editorial: "Magazine Layouts",
  magazine: "Magazine Layouts",
  cinematic: "Cinematic Layouts",
  film: "Cinematic Layouts",
  polaroid: "Polaroid Layouts",
  wedding: "Wedding Collages",
  heart: "Wedding Collages",
  luxury: "Wedding Collages",
  story: "Story Templates",
  instagram: "Instagram Collages",
  travel: "Landscape Collages",
  timeline: "Pre-Wedding Collages",
};

export const TEMPLATE_CATEGORIES = [
  "All Templates",
  "2-Photo Grids",
  "3-Photo Grids",
  "4-Photo Grids",
  "5-Photo Grids",
  "6-Photo Grids",
  "8-Photo Grids",
  "9-Photo Grids",
  "12-Photo Grids",
  "16-Photo Grids",
  "Instagram Collages",
  "Portrait Collages",
  "Landscape Collages",
  "Wedding Collages",
  "Pre-Wedding Collages",
  "Cinematic Layouts",
  "Minimal Layouts",
  "Magazine Layouts",
  "Polaroid Layouts",
  "Story Templates",
] as const;

export function orientationOf(t: Pick<TemplateConfig, "width" | "height">) {
  const r = t.width / t.height;
  return r > 1.05 ? "Landscape" : r < 0.95 ? "Portrait" : "Square";
}

export function categoriesFor(tpl: TemplateConfig): string[] {
  const cats = new Set<string>(tpl.tags);
  const c = COUNT_CATEGORIES[tpl.cells.length];
  if (c) cats.add(c);
  const s = STYLE_CATEGORIES[tpl.style];
  if (s) cats.add(s);
  const o = orientationOf(tpl);
  if (o === "Portrait" && tpl.height / tpl.width < 1.5) cats.add("Portrait Collages");
  if (o === "Landscape") cats.add("Landscape Collages");
  if (tpl.width === 1080 && (tpl.height === 1080 || tpl.height === 1350)) cats.add("Instagram Collages");
  if (tpl.height === 1920 && tpl.width === 1080) cats.add("Story Templates");
  return [...cats];
}

export function aspectLabel(tpl: Pick<TemplateConfig, "width" | "height">) {
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const k = g(tpl.width, tpl.height);
  return `${tpl.width / k}:${tpl.height / k}`;
}

export function findTemplate(id: string, extra: TemplateConfig[] = []) {
  return [...extra, ...BUILTIN_TEMPLATES].find((t) => t.id === id) ?? null;
}

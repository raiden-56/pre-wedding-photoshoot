// Shared types for Photo Grid Studio. Pure TS (used on client and server).

export type CellShape = "rect" | "circle" | "arch";
export type CellFrame = "none" | "polaroid" | "film";

/** Fractions (0–1) of the padded content box. */
export type TemplateCell = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  z?: number;
  shape?: CellShape;
  frame?: CellFrame;
  /** caption placeholder for polaroid frames */
  caption?: string;
};

export type FontKey = "serif" | "sans" | "script" | "mono";

export type TextItem = {
  id: string;
  text: string;
  /** fractions of the full canvas */
  x: number;
  y: number;
  w: number;
  font: FontKey;
  /** fraction of canvas width */
  size: number;
  align: "left" | "center" | "right";
  color: string;
  weight?: number;
  italic?: boolean;
  letterSpacing?: number;
  uppercase?: boolean;
  /** semantic role used for auto-fill from couple data */
  role?: "names" | "date" | "location" | "caption" | "title";
};

export type DecorationType = "line" | "sprockets" | "floral" | "frame" | "heart" | "corner";

export type Decoration = {
  id: string;
  type: DecorationType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  rotate?: number;
};

export type Background =
  | { type: "color"; color: string }
  | { type: "gradient"; color: string; color2: string; angle: number }
  | { type: "image"; color: string; src: string };

export type TemplateStyle =
  | "minimal"
  | "editorial"
  | "magazine"
  | "cinematic"
  | "film"
  | "polaroid"
  | "wedding"
  | "heart"
  | "luxury"
  | "travel"
  | "timeline"
  | "instagram"
  | "story";

export type TemplateConfig = {
  id: string;
  name: string;
  description: string;
  style: TemplateStyle;
  /** extra categories beyond the auto-derived ones */
  tags: string[];
  width: number;
  height: number;
  cells: TemplateCell[];
  gap: number;
  padding: number;
  radius: number;
  borderWidth: number;
  borderColor: string;
  shadow: number;
  background: Background;
  texts: TextItem[];
  decorations: Decoration[];
  isNew?: boolean;
  popular?: boolean;
};

export type CellTransform = {
  /** 1 = exactly covers the cell */
  zoom: number;
  /** -1..1 of available overflow */
  offsetX: number;
  offsetY: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  fit: "cover" | "contain";
};

export type CellFilters = { brightness: number; contrast: number; saturation: number; warmth: number };

export type ImageRef = {
  source: "asset" | "photo";
  id: string;
  /** preview-quality URL for the editor */
  src: string;
  /** high quality URL for export */
  fullSrc: string;
  width: number;
  height: number;
  name?: string;
};

export type CellState = {
  image: ImageRef | null;
  transform: CellTransform;
  filters: CellFilters;
  caption?: string;
  borderWidth?: number;
  radius?: number;
};

export type DesignState = {
  version: 1;
  templateId: string;
  width: number;
  height: number;
  background: Background;
  gap: number;
  padding: number;
  radius: number;
  borderWidth: number;
  borderColor: string;
  shadow: number;
  cells: CellState[];
  texts: TextItem[];
  decorations: Decoration[];
  watermark: { enabled: boolean; text: string };
};

export const DEFAULT_TRANSFORM: CellTransform = { zoom: 1, offsetX: 0, offsetY: 0, rotate: 0, flipX: false, flipY: false, fit: "cover" };
export const DEFAULT_FILTERS: CellFilters = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };

export const FONT_STACKS: Record<FontKey, string> = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: 'Manrope, "Helvetica Neue", Arial, sans-serif',
  script: '"Cormorant Garamond", Georgia, serif',
  mono: '"Courier New", ui-monospace, monospace',
};

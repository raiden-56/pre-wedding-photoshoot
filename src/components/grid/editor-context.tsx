"use client";

import { createContext, useContext } from "react";
import type { DesignState, ImageRef, TemplateConfig } from "@/lib/grid/types";

export type Library = {
  device: ImageRef[];
  uploads: ImageRef[];
  galleries: { id: string; title: string; photos: ImageRef[] }[];
  samples: ImageRef[];
};

export type EditorApi = {
  state: DesignState;
  template: TemplateConfig;
  set: (next: DesignState | ((prev: DesignState) => DesignState)) => void;
  selectedCell: number | null;
  setSelectedCell: (i: number | null) => void;
  selectedText: string | null;
  setSelectedText: (id: string | null) => void;
  library: Library;
  signedIn: boolean;
  uploading: number;
  addFiles: (files: FileList | File[]) => void;
  placeImage: (img: ImageRef, cell?: number) => void;
  switchTemplate: (tpl: TemplateConfig, images?: ImageRef[]) => void;
  loadDesign: (id: string) => void;
};

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor() {
  const c = useContext(EditorContext);
  if (!c) throw new Error("useEditor outside EditorContext");
  return c;
}

export const IMAGE_MIME = "application/x-grid-image";

import { PHOTOS } from "@/content/photos";
import { asset } from "@/lib/demo";
import type { ImageRef } from "./types";

/** Public demo photographs (CC0) so anyone can try the studio without uploading. */
const IDS = ["32", "41", "24", "06", "28", "53", "34", "09", "27", "23", "16", "50", "39", "47", "30", "21", "14", "36", "29", "19"];

export const SAMPLE_IMAGES: ImageRef[] = IDS.map((id) => PHOTOS.find((p) => p.id === id))
  .filter((p): p is (typeof PHOTOS)[number] => !!p)
  .map((p) => ({ source: "sample", id: p.id, src: asset(p.src), fullSrc: asset(p.src), width: p.width, height: p.height, name: p.alt }));

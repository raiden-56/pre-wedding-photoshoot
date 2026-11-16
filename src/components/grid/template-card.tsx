"use client";

import Link from "next/link";
import { useMemo } from "react";
import useMeasure from "react-use-measure";
import { ArrowUpRight } from "lucide-react";
import { createDesignState } from "@/lib/grid/layout";
import { aspectLabel } from "@/lib/grid/templates";
import { SAMPLE_IMAGES } from "@/lib/grid/samples";
import type { ImageRef, TemplateConfig } from "@/lib/grid/types";
import { DesignCanvas } from "./design-canvas";

/** Live, to-scale preview of a template filled with sample photographs. */
export function TemplatePreview({ template, images, offset = 0, className }: { template: TemplateConfig; images?: ImageRef[]; offset?: number; className?: string }) {
  const [ref, bounds] = useMeasure();
  const state = useMemo(() => {
    const pool = images ?? SAMPLE_IMAGES;
    const imgs = template.cells.map((_, i) => pool[(i + offset) % pool.length]);
    return createDesignState(template, imgs);
  }, [template, images, offset]);
  return (
    <div ref={ref} className={className} style={{ aspectRatio: `${template.width} / ${template.height}` }}>
      {bounds.width > 0 && <DesignCanvas state={state} template={template} width={bounds.width} />}
    </div>
  );
}

export function TemplateCard({ template, index }: { template: TemplateConfig; index: number }) {
  return (
    <Link href={`/grid-studio/editor?template=${template.id}`} className="group block">
      <div className="relative grid aspect-square place-items-center overflow-hidden bg-ivory-deep p-[9%] transition-colors duration-500 group-hover:bg-champagne/60">
        <TemplatePreview template={template} offset={index * 3} className={`${template.height > template.width ? "h-full" : "w-full"} shadow-[0_18px_40px_-18px_rgba(36,35,33,0.45)] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1 group-hover:scale-[1.02]`} />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {template.isNew && <span className="rounded-full bg-charcoal px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-ivory">New</span>}
          {template.popular && <span className="rounded-full bg-ivory px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-charcoal">Popular</span>}
        </div>
        <span className="absolute bottom-3 right-3 grid size-9 translate-y-2 place-items-center rounded-full bg-charcoal text-ivory opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="font-display text-xl leading-tight">{template.name}</p>
        <p className="shrink-0 text-[11px] tabular-nums text-muted">
          {template.cells.length} photos · {aspectLabel(template)}
        </p>
      </div>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted">{template.description}</p>
    </Link>
  );
}

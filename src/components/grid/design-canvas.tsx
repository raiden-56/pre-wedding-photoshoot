"use client";

import { memo, useRef } from "react";
import { ImagePlus } from "lucide-react";
import { filterString, imagePlacement, layoutCells, type CellLayout } from "@/lib/grid/layout";
import { backgroundCss, cellClipCss, CSS_FONTS, DECORATION_PATHS } from "@/lib/grid/paint";
import type { CellTransform, Decoration, DesignState, TemplateConfig } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

export type CanvasHandlers = {
  selectedCell?: number | null;
  selectedText?: string | null;
  onSelectCell?: (i: number | null) => void;
  onSelectText?: (id: string | null) => void;
  onTransform?: (i: number, t: Partial<CellTransform>) => void;
  onMoveText?: (id: string, x: number, y: number) => void;
  onDropImage?: (cell: number, data: DataTransfer) => void;
};

/**
 * DOM rendering of a design at native resolution, scaled down with a CSS
 * transform. Geometry comes from the same `layoutCells` the exporter uses.
 */
export const DesignCanvas = memo(function DesignCanvas({ state, template, width, interactive, className, ...h }: { state: DesignState; template: TemplateConfig; width: number; interactive?: boolean; className?: string } & CanvasHandlers) {
  const k = width / state.width;
  const layouts = layoutCells(template, state, state.width, state.height);
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ width, height: state.height * k }} onPointerDown={interactive ? (e) => e.target === e.currentTarget && (h.onSelectCell?.(null), h.onSelectText?.(null)) : undefined}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: state.width, height: state.height, transform: `scale(${k})`, background: backgroundCss(state.background) }} onPointerDown={interactive ? (e) => e.target === e.currentTarget && (h.onSelectCell?.(null), h.onSelectText?.(null)) : undefined}>
        {layouts.map((l) => (
          <Cell key={l.index} l={l} state={state} k={k} interactive={interactive} h={h} />
        ))}
        {state.decorations.map((d) => (
          <Deco key={d.id} d={d} W={state.width} H={state.height} />
        ))}
        {state.texts.map((t) => (
          <TextNode key={t.id} t={t} state={state} k={k} interactive={interactive} selected={h.selectedText === t.id} h={h} />
        ))}
        {state.watermark.enabled && state.watermark.text && (
          <span className="pointer-events-none absolute font-medium text-white/80" style={{ right: state.width * 0.025, bottom: state.width * 0.02, fontSize: state.width * 0.018, fontFamily: CSS_FONTS.sans, textShadow: "0 0 10px rgba(0,0,0,.35)" }}>
            {state.watermark.text}
          </span>
        )}
      </div>
    </div>
  );
});

function Cell({ l, state, k, interactive, h }: { l: CellLayout; state: DesignState; k: number; interactive?: boolean; h: CanvasHandlers }) {
  const cs = state.cells[l.index];
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  if (!cs) return null;
  const radius = cs.radius ?? state.radius;
  const bw = cs.borderWidth ?? state.borderWidth;
  const frame = l.cell.frame ?? "none";
  const selected = interactive && h.selectedCell === l.index;
  const img = cs.image;
  const p = img ? imagePlacement(img, l.photo, cs.transform) : null;
  const caption = cs.caption ?? l.cell.caption;
  const shadow = frame !== "none" ? `0 ${8}px ${24}px rgba(0,0,0,.22)` : state.shadow > 0 ? `0 ${state.shadow / 2}px ${state.shadow * 1.5}px rgba(0,0,0,${Math.min(0.35, state.shadow / 60)})` : undefined;

  return (
    <div
      className="absolute"
      style={{ left: l.x, top: l.y, width: l.w, height: l.h, zIndex: l.z, transform: l.rotate ? `rotate(${l.rotate}deg)` : undefined, background: frame === "film" ? "#151413" : frame === "polaroid" ? "#fff" : undefined, boxShadow: frame !== "none" ? shadow : undefined }}
    >
      {frame === "film" && (
        <>
          <Sprockets top={0} h={(l.photo.y - l.y) * 0.9} w={l.w} />
          <Sprockets top={l.photo.y - l.y + l.photo.h} h={(l.photo.y - l.y) * 0.9} w={l.w} />
        </>
      )}
      <div
        className={cn("absolute overflow-hidden bg-[#ece6dc]", interactive && "cursor-pointer")}
        style={{ left: l.photo.x - l.x, top: l.photo.y - l.y, width: l.photo.w, height: l.photo.h, borderRadius: cellClipCss(l, radius), boxShadow: frame === "none" ? shadow : undefined }}
        onPointerDown={
          interactive
            ? (e) => {
                e.stopPropagation();
                h.onSelectCell?.(l.index);
                h.onSelectText?.(null);
                if (img && p) {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  drag.current = { x: e.clientX, y: e.clientY, ox: cs.transform.offsetX, oy: cs.transform.offsetY };
                }
              }
            : undefined
        }
        onPointerMove={
          interactive
            ? (e) => {
                if (!drag.current || !p) return;
                const ovX = Math.max(1, p.w - l.photo.w);
                const ovY = Math.max(1, p.h - l.photo.h);
                const dx = ((e.clientX - drag.current.x) / k) * (cs.transform.flipX ? -1 : 1);
                const dy = ((e.clientY - drag.current.y) / k) * (cs.transform.flipY ? -1 : 1);
                const clamp = (v: number) => Math.max(-1, Math.min(1, v));
                h.onTransform?.(l.index, { offsetX: p.w > l.photo.w ? clamp(drag.current.ox + (dx * 2) / ovX) : 0, offsetY: p.h > l.photo.h ? clamp(drag.current.oy + (dy * 2) / ovY) : 0 });
              }
            : undefined
        }
        onPointerUp={interactive ? () => (drag.current = null) : undefined}
        onWheel={
          interactive && img
            ? (e) => {
                if (h.selectedCell !== l.index) return;
                h.onTransform?.(l.index, { zoom: Math.max(1, Math.min(4, cs.transform.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06))) });
              }
            : undefined
        }
        onDragOver={interactive ? (e) => e.preventDefault() : undefined}
        onDrop={
          interactive
            ? (e) => {
                e.preventDefault();
                h.onDropImage?.(l.index, e.dataTransfer);
              }
            : undefined
        }
        draggable={interactive && !!img ? false : undefined}
      >
        {img && p ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none"
            style={{
              left: p.x,
              top: p.y,
              width: p.w,
              height: p.h,
              filter: filterString(cs.filters),
              transform: `rotate(${cs.transform.rotate}deg) scale(${cs.transform.flipX ? -1 : 1}, ${cs.transform.flipY ? -1 : 1})`,
            }}
          />
        ) : interactive ? (
          <span className="absolute inset-0 grid place-items-center border-dashed border-[#b5a99a] text-[#777a68]" style={{ borderWidth: 2 / k }}>
            <ImagePlus style={{ width: 28 / k, height: 28 / k }} strokeWidth={1.5} />
          </span>
        ) : null}
        {bw > 0 && <span className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 0 ${bw}px ${state.borderColor}`, borderRadius: cellClipCss(l, radius) }} />}
        {selected && <span className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 0 ${3 / k}px #777A68`, borderRadius: cellClipCss(l, radius) }} />}
      </div>
      {frame === "polaroid" && caption && (
        <span className="pointer-events-none absolute inset-x-0 grid place-items-center italic text-[#3a3835]" style={{ top: l.photo.y - l.y + l.photo.h, bottom: 0, fontSize: l.h * 0.075, fontFamily: CSS_FONTS.serif }}>
          {caption}
        </span>
      )}
    </div>
  );
}

function Sprockets({ top, h, w }: { top: number; h: number; w: number }) {
  const holeW = h * 0.55;
  const step = holeW * 1.9;
  return <span className="pointer-events-none absolute left-0" style={{ top: top + h * 0.05, width: w, height: h, backgroundImage: `linear-gradient(90deg, transparent ${(step - holeW) / 2}px, rgba(247,244,239,.85) ${(step - holeW) / 2}px, rgba(247,244,239,.85) ${(step + holeW) / 2}px, transparent ${(step + holeW) / 2}px)`, backgroundSize: `${step}px ${h * 0.6}px`, backgroundRepeat: "repeat-x", backgroundPosition: `0 ${h * 0.2}px` }} />;
}

function Deco({ d, W, H }: { d: Decoration; W: number; H: number }) {
  const style = { left: d.x * W, top: d.y * H, width: d.w * W, height: d.h * H, transform: d.rotate ? `rotate(${d.rotate}deg)` : undefined };
  if (d.type === "sprockets") return <span className="pointer-events-none absolute" style={style}><Sprockets top={0} h={d.h * H} w={d.w * W} /></span>;
  const spec = DECORATION_PATHS[d.type];
  return (
    <svg className="pointer-events-none absolute overflow-visible" style={style} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path d={spec.d} fill={spec.fill ? d.color : "none"} stroke={spec.fill ? "none" : d.color} strokeWidth={Math.max(1, W / 540)} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

function TextNode({ t, state, k, interactive, selected, h }: { t: DesignState["texts"][number]; state: DesignState; k: number; interactive?: boolean; selected: boolean; h: CanvasHandlers }) {
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  if (!t.text.trim() && !interactive) return null;
  const size = t.size * state.width;
  return (
    <div
      className={cn("absolute whitespace-pre-wrap", interactive && "cursor-move", selected && "outline-dashed")}
      style={{
        left: t.x * state.width,
        top: t.y * state.height,
        width: t.w * state.width,
        fontFamily: CSS_FONTS[t.font],
        fontSize: size,
        lineHeight: 1.15,
        fontStyle: t.italic || t.font === "script" ? "italic" : undefined,
        fontWeight: t.weight ?? 400,
        letterSpacing: `${t.letterSpacing ?? 0}em`,
        textTransform: t.uppercase ? "uppercase" : undefined,
        textAlign: t.align,
        color: t.color,
        zIndex: 50,
        outlineColor: "#777A68",
        outlineWidth: 2 / k,
        outlineOffset: 6 / k,
      }}
      onPointerDown={
        interactive
          ? (e) => {
              e.stopPropagation();
              h.onSelectText?.(t.id);
              h.onSelectCell?.(null);
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y };
            }
          : undefined
      }
      onPointerMove={
        interactive
          ? (e) => {
              if (!drag.current) return;
              const nx = drag.current.tx + (e.clientX - drag.current.x) / k / state.width;
              const ny = drag.current.ty + (e.clientY - drag.current.y) / k / state.height;
              h.onMoveText?.(t.id, Math.max(-0.2, Math.min(1, nx)), Math.max(-0.05, Math.min(1, ny)));
            }
          : undefined
      }
      onPointerUp={interactive ? () => (drag.current = null) : undefined}
    >
      {t.text || (interactive ? "Your text" : "")}
    </div>
  );
}

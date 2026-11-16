"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlignCenter, AlignLeft, AlignRight, Check, CloudUpload, FlipHorizontal2, FlipVertical2, Italic, Loader2, Plus, RotateCcw, RotateCw, Sparkles, Trash2, Type } from "lucide-react";
import { BUILTIN_TEMPLATES, categoriesFor, TEMPLATE_CATEGORIES } from "@/lib/grid/templates";
import { AUTO_STYLES, suggestLayouts, type AutoSuggestion } from "@/lib/grid/auto-layout";
import { DEFAULT_FILTERS, DEFAULT_TRANSFORM, type Background, type CellFilters, type ImageRef, type TextItem } from "@/lib/grid/types";
import { deleteGridDesign, listGridDesigns } from "@/server/actions/grid";
import { Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { cn, timeAgo } from "@/lib/utils";
import { IMAGE_MIME, useEditor } from "./editor-context";
import { TemplatePreview } from "./template-card";

const SWATCHES = ["#242321", "#3A3835", "#777A68", "#B5A99A", "#E8D8C3", "#F7F4EF", "#FFFFFF", "#A5524A"];
const BACKGROUNDS: Background[] = [
  { type: "color", color: "#FFFFFF" },
  { type: "color", color: "#F7F4EF" },
  { type: "color", color: "#E8D8C3" },
  { type: "color", color: "#242321" },
  { type: "color", color: "#777A68" },
  { type: "gradient", color: "#F7F4EF", color2: "#E8D8C3", angle: 180 },
  { type: "gradient", color: "#E8D8C3", color2: "#B5A99A", angle: 160 },
  { type: "gradient", color: "#3A3835", color2: "#242321", angle: 180 },
];

export function PanelTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">{children}</p>
      {action}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block py-1.5">
      <span className="mb-1.5 flex justify-between text-xs">
        <span className="text-ink">{label}</span>
        <span className="tabular-nums text-muted">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#777A68]" />
    </label>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SWATCHES.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={`Colour ${c}`} className={cn("size-7 rounded-full border border-charcoal/15 transition", value.toLowerCase() === c.toLowerCase() && "ring-2 ring-olive ring-offset-2")} style={{ background: c }} />
      ))}
      <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-charcoal/15 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" aria-label="Custom colour">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

// ───────────────────────── Templates ─────────────────────────

export function TemplatesPanel() {
  const { state, switchTemplate, signedIn, loadDesign } = useEditor();
  const [cat, setCat] = useState("All Templates");
  const [designs, setDesigns] = useState<Awaited<ReturnType<typeof listGridDesigns>> | null>(null);
  const images = useMemo(() => state.cells.map((c) => c.image).filter(Boolean) as ImageRef[], [state.cells]);
  const items = cat === "All Templates" ? BUILTIN_TEMPLATES : BUILTIN_TEMPLATES.filter((t) => categoriesFor(t).includes(cat));

  useEffect(() => {
    if (signedIn) listGridDesigns().then(setDesigns);
  }, [signedIn]);

  return (
    <div>
      {signedIn && designs && designs.length > 0 && (
        <div className="mb-7">
          <PanelTitle>My designs</PanelTitle>
          <ul className="space-y-1">
            {designs.slice(0, 6).map((d) => (
              <li key={d.id} className="group flex items-center gap-2">
                <button onClick={() => loadDesign(d.id)} className="flex-1 truncate rounded px-2 py-1.5 text-left text-sm hover:bg-charcoal/5">
                  {d.name} <span className="text-xs text-muted">· {timeAgo(d.updatedAt)}</span>
                </button>
                <button
                  aria-label={`Delete ${d.name}`}
                  className="rounded p-1.5 text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
                  onClick={async () => {
                    if (!confirm(`Delete “${d.name}”? This can’t be undone.`)) return;
                    const r = await deleteGridDesign(d.id);
                    if (!r.ok) return toast.error(r.error);
                    setDesigns((prev) => prev?.filter((x) => x.id !== d.id) ?? null);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <PanelTitle>Layouts</PanelTitle>
      <Select value={cat} onChange={(e) => setCat(e.target.value)} className="mb-4" aria-label="Template category">
        {TEMPLATE_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        {items.map((t) => {
          const active = t.id === state.templateId;
          return (
            <button key={t.id} onClick={() => switchTemplate(t)} className={cn("group text-left", active && "pointer-events-none")}>
              <div className={cn("grid aspect-square place-items-center bg-ivory-deep p-2.5 transition", active ? "ring-2 ring-olive" : "group-hover:bg-champagne/60")}>
                <TemplatePreview template={t} images={images.length ? images : undefined} className={t.height > t.width ? "h-full" : "w-full"} />
              </div>
              <p className="mt-1.5 truncate text-xs">{t.name}</p>
              <p className="text-[10px] text-muted">{t.cells.length} photos</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Photos ─────────────────────────

function Thumb({ img, onClick, selected, badge }: { img: ImageRef; onClick: () => void; selected?: boolean; badge?: number }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(IMAGE_MIME, JSON.stringify(img));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onClick}
      className={cn("group relative aspect-square overflow-hidden bg-ivory-deep", selected && "ring-2 ring-olive ring-offset-1")}
      title={img.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.src} alt={img.name ?? ""} loading="lazy" draggable={false} className="size-full object-cover transition duration-500 group-hover:scale-105" />
      {badge != null && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-olive text-[10px] font-medium text-white">{badge}</span>}
    </button>
  );
}

export function PhotosPanel() {
  const { library, placeImage, addFiles, uploading, signedIn, state, set } = useEditor();
  const input = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<string>(() => (library.device.length || library.uploads.length ? "mine" : "samples"));
  const mine = [...library.device, ...library.uploads];
  const tabs = [{ id: "mine", label: "Yours", n: mine.length }, ...library.galleries.map((g) => ({ id: g.id, label: g.title, n: g.photos.length })), { id: "samples", label: "Samples", n: library.samples.length }];
  const list = tab === "mine" ? mine : tab === "samples" ? library.samples : (library.galleries.find((g) => g.id === tab)?.photos ?? []);
  const empty = state.cells.filter((c) => !c.image).length;

  useEffect(() => {
    if (library.device.length && tab === "samples") setTab("mine");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library.device.length]);

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="mb-5 flex w-full flex-col items-center gap-2 border border-dashed border-taupe/80 bg-white px-4 py-6 text-center transition hover:border-olive"
      >
        {uploading ? <Loader2 className="size-5 animate-spin text-olive" /> : <CloudUpload className="size-5 text-olive" />}
        <span className="text-sm">{uploading ? `Uploading ${uploading}…` : "Add photos from your device"}</span>
        <span className="text-[11px] text-muted">{signedIn ? "Saved to your account so designs reopen anywhere" : "Stay on this device — sign in to keep them with saved designs"}</span>
      </button>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && addFiles(e.target.files)} />

      {!signedIn && (
        <p className="mb-5 text-[11px] leading-relaxed text-muted">
          Booked with us?{" "}
          <Link href="/login?next=/grid-studio/editor" className="underline underline-offset-2">
            Sign in
          </Link>{" "}
          to use photographs from your private gallery.
        </p>
      )}

      <div className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs transition", tab === t.id ? "bg-charcoal text-ivory" : "bg-charcoal/5 text-ink hover:bg-charcoal/10")}>
            {t.label.length > 22 ? `${t.label.slice(0, 20)}…` : t.label} <span className="opacity-50">{t.n}</span>
          </button>
        ))}
      </div>

      {list.length ? (
        <>
          {empty > 0 && (
            <button
              className="mb-3 inline-flex items-center gap-1.5 text-xs text-olive-deep underline-offset-2 hover:underline"
              onClick={() => {
                const used = new Set(state.cells.flatMap((c) => (c.image ? [c.image.src] : [])));
                const pool = list.filter((i) => !used.has(i.src));
                let k = 0;
                set((s) => ({ ...s, cells: s.cells.map((c) => (c.image || k >= pool.length ? c : { ...c, image: pool[k++], transform: { ...DEFAULT_TRANSFORM } })) }));
              }}
            >
              <Sparkles className="size-3.5" /> Fill {empty} empty frame{empty > 1 ? "s" : ""}
            </button>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            {list.map((img) => (
              <Thumb key={`${img.source}-${img.id}`} img={img} onClick={() => placeImage(img)} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">Tap to place in the selected frame, or drag onto any frame.</p>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted">No photographs here yet.</p>
      )}
    </div>
  );
}

// ───────────────────────── Smart Auto Layout ─────────────────────────

export function AutoLayoutPanel() {
  const { library, state, switchTemplate } = useEditor();
  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...library.device, ...library.uploads, ...library.galleries.flatMap((g) => g.photos), ...library.samples].filter((i) => (seen.has(i.src) ? false : (seen.add(i.src), true)));
  }, [library]);
  const [picked, setPicked] = useState<ImageRef[]>(() => state.cells.map((c) => c.image).filter(Boolean) as ImageRef[]);
  const [style, setStyle] = useState(AUTO_STYLES[0].key);
  const [results, setResults] = useState<AutoSuggestion[] | null>(null);

  const toggle = (img: ImageRef) => {
    setResults(null);
    setPicked((p) => (p.some((x) => x.src === img.src) ? p.filter((x) => x.src !== img.src) : p.length >= 16 ? p : [...p, img]));
  };

  return (
    <div>
      <div className="mb-5 bg-charcoal p-4 text-ivory">
        <p className="flex items-center gap-2 font-display text-2xl">
          <Sparkles className="size-4 text-champagne" /> Smart Auto Layout
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ivory/70">Choose 2–16 photographs and a mood. We match each photo’s shape to the frame where it will be cropped least, and put your first picks in the biggest frames.</p>
      </div>

      <PanelTitle action={picked.length > 0 && <button onClick={() => (setPicked([]), setResults(null))} className="text-[11px] text-muted underline-offset-2 hover:underline">Clear</button>}>
        1 · Photographs ({picked.length}/16)
      </PanelTitle>
      <div className="grid max-h-56 grid-cols-4 gap-1 overflow-y-auto pr-1" data-lenis-prevent>
        {all.map((img) => {
          const i = picked.findIndex((p) => p.src === img.src);
          return <Thumb key={`${img.source}-${img.id}`} img={img} onClick={() => toggle(img)} selected={i >= 0} badge={i >= 0 ? i + 1 : undefined} />;
        })}
      </div>

      <div className="mt-6">
        <PanelTitle>2 · Mood</PanelTitle>
        <div className="grid grid-cols-2 gap-1.5">
          {AUTO_STYLES.map((s) => (
            <button key={s.key} onClick={() => (setStyle(s.key), setResults(null))} className={cn("border px-3 py-2.5 text-left transition", style === s.key ? "border-charcoal bg-charcoal text-ivory" : "border-line bg-white hover:border-charcoal/40")}>
              <span className="block text-sm">{s.label}</span>
              <span className={cn("mt-0.5 block text-[10px] leading-snug", style === s.key ? "text-ivory/60" : "text-muted")}>{s.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={picked.length < 2}
        onClick={() => setResults(suggestLayouts(picked, style))}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 bg-olive text-[12px] font-medium uppercase tracking-[0.16em] text-white transition hover:bg-olive-deep disabled:opacity-40"
      >
        <Sparkles className="size-4" /> {picked.length < 2 ? "Pick at least 2 photos" : "Suggest layouts"}
      </button>

      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <PanelTitle>3 · Pick one</PanelTitle>
            {results.length === 0 ? (
              <p className="text-sm text-muted">No layout fits that selection — try another mood or more photos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {results.map((r, i) => (
                  <motion.button key={r.template.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }} onClick={() => switchTemplate(r.template, r.assignment)} className="group text-left">
                    <div className="grid aspect-square place-items-center bg-ivory-deep p-2.5 transition group-hover:bg-champagne/60">
                      <TemplatePreview template={r.template} images={r.assignment} className={r.template.height > r.template.width ? "h-full" : "w-full"} />
                    </div>
                    <p className="mt-1.5 truncate text-xs">{r.template.name}</p>
                    <p className="text-[10px] text-muted">
                      uses {r.used} of {picked.length}
                      {i === 0 ? " · best fit" : ""}
                    </p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Text ─────────────────────────

export function TextPanel() {
  const { state, set, selectedText, setSelectedText } = useEditor();
  const t = state.texts.find((x) => x.id === selectedText) ?? null;
  const patch = (p: Partial<TextItem>) => t && set((s) => ({ ...s, texts: s.texts.map((x) => (x.id === t.id ? { ...x, ...p } : x)) }));

  return (
    <div>
      <PanelTitle
        action={
          <button
            onClick={() => {
              const id = `t${Date.now().toString(36)}`;
              set((s) => ({ ...s, texts: [...s.texts, { id, text: "Your words here", x: 0.1, y: 0.45, w: 0.8, size: 0.05, font: "serif", align: "center", color: s.background.type === "color" && s.background.color === "#242321" ? "#F7F4EF" : "#242321", italic: true }] }));
              setSelectedText(id);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-charcoal px-3 py-1.5 text-[11px] text-ivory"
          >
            <Plus className="size-3.5" /> Add text
          </button>
        }
      >
        Words
      </PanelTitle>
      <ul className="mb-6 space-y-1">
        {state.texts.length === 0 && <li className="py-4 text-center text-sm text-muted">This layout has no text yet.</li>}
        {state.texts.map((x) => (
          <li key={x.id}>
            <button onClick={() => setSelectedText(x.id)} className={cn("flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm transition", x.id === selectedText ? "bg-charcoal text-ivory" : "hover:bg-charcoal/5")}>
              <Type className="size-3.5 shrink-0 opacity-60" />
              <span className="truncate">{x.text || "Empty text"}</span>
            </button>
          </li>
        ))}
      </ul>

      {t && (
        <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 border-t border-line pt-5">
          <textarea value={t.text} onChange={(e) => patch({ text: e.target.value })} rows={2} className="field resize-none" aria-label="Text" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={t.font} onChange={(e) => patch({ font: e.target.value as TextItem["font"] })} aria-label="Font">
              <option value="serif">Cormorant (serif)</option>
              <option value="script">Cormorant italic</option>
              <option value="sans">Manrope (sans)</option>
              <option value="mono">Typewriter</option>
            </Select>
            <div className="flex items-center justify-end gap-0.5">
              {(["left", "center", "right"] as const).map((a) => {
                const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                return (
                  <button key={a} onClick={() => patch({ align: a })} aria-label={`Align ${a}`} className={cn("grid size-9 place-items-center rounded", t.align === a ? "bg-charcoal text-ivory" : "hover:bg-charcoal/5")}>
                    <Icon className="size-4" />
                  </button>
                );
              })}
              <button onClick={() => patch({ italic: !t.italic })} aria-label="Italic" aria-pressed={!!t.italic} className={cn("grid size-9 place-items-center rounded", t.italic ? "bg-charcoal text-ivory" : "hover:bg-charcoal/5")}>
                <Italic className="size-4" />
              </button>
            </div>
          </div>
          <Slider label="Size" value={Math.round(t.size * 1000)} min={8} max={200} onChange={(v) => patch({ size: v / 1000 })} />
          <Slider label="Letter spacing" value={Math.round((t.letterSpacing ?? 0) * 100)} min={-5} max={60} onChange={(v) => patch({ letterSpacing: v / 100 })} />
          <Slider label="Box width" value={Math.round(t.w * 100)} min={10} max={100} onChange={(v) => patch({ w: v / 100 })} format={(v) => `${v}%`} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!t.uppercase} onChange={(e) => patch({ uppercase: e.target.checked })} className="accent-[#777A68]" /> Uppercase
          </label>
          <Swatches value={t.color} onChange={(c) => patch({ color: c })} />
          <button
            onClick={() => {
              set((s) => ({ ...s, texts: s.texts.filter((x) => x.id !== t.id) }));
              setSelectedText(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-danger"
          >
            <Trash2 className="size-3.5" /> Remove text
          </button>
        </motion.div>
      )}
      <p className="mt-6 text-[11px] text-muted">Drag text on the canvas to move it.</p>
    </div>
  );
}

// ───────────────────────── Style ─────────────────────────

export function StylePanel() {
  const { state, set } = useEditor();
  const patch = (p: Partial<typeof state>) => set((s) => ({ ...s, ...p }));
  return (
    <div className="space-y-7">
      <section>
        <PanelTitle>Spacing</PanelTitle>
        <Slider label="Gap between photos" value={state.gap} min={0} max={80} onChange={(v) => patch({ gap: v })} format={(v) => `${v}px`} />
        <Slider label="Outer margin" value={state.padding} min={0} max={160} onChange={(v) => patch({ padding: v })} format={(v) => `${v}px`} />
        <Slider label="Corner radius" value={state.radius} min={0} max={120} onChange={(v) => patch({ radius: v })} format={(v) => `${v}px`} />
      </section>
      <section>
        <PanelTitle>Border & depth</PanelTitle>
        <Slider label="Border" value={state.borderWidth} min={0} max={40} onChange={(v) => patch({ borderWidth: v })} format={(v) => `${v}px`} />
        {state.borderWidth > 0 && (
          <div className="mb-3 mt-1">
            <Swatches value={state.borderColor} onChange={(c) => patch({ borderColor: c })} />
          </div>
        )}
        <Slider label="Shadow" value={state.shadow} min={0} max={40} onChange={(v) => patch({ shadow: v })} />
      </section>
      <section>
        <PanelTitle>Background</PanelTitle>
        <div className="grid grid-cols-4 gap-2">
          {BACKGROUNDS.map((b, i) => {
            const active = JSON.stringify(b) === JSON.stringify(state.background);
            return <button key={i} onClick={() => patch({ background: b })} aria-label={`Background ${i + 1}`} className={cn("aspect-square border border-charcoal/10 transition", active && "ring-2 ring-olive ring-offset-2")} style={{ background: b.type === "gradient" ? `linear-gradient(${b.angle}deg, ${b.color}, ${b.color2})` : b.color }} />;
          })}
        </div>
        <div className="mt-3">
          <Swatches value={state.background.color} onChange={(c) => patch({ background: { type: "color", color: c } })} />
        </div>
      </section>
      <section>
        <PanelTitle>Watermark</PanelTitle>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={state.watermark.enabled} onChange={(e) => patch({ watermark: { ...state.watermark, enabled: e.target.checked } })} className="accent-[#777A68]" /> Add a small signature
        </label>
        {state.watermark.enabled && <input value={state.watermark.text} onChange={(e) => patch({ watermark: { ...state.watermark, text: e.target.value.slice(0, 40) } })} placeholder="© Aarav & Ananya" className="field mt-2" aria-label="Watermark text" />}
      </section>
    </div>
  );
}

// ───────────────────────── Cell inspector ─────────────────────────

const PRESETS: { label: string; f: CellFilters }[] = [
  { label: "Original", f: DEFAULT_FILTERS },
  { label: "Warm", f: { brightness: 104, contrast: 102, saturation: 108, warmth: 35 } },
  { label: "Film", f: { brightness: 102, contrast: 92, saturation: 82, warmth: 22 } },
  { label: "Soft", f: { brightness: 108, contrast: 88, saturation: 92, warmth: 8 } },
  { label: "Mono", f: { brightness: 102, contrast: 112, saturation: 0, warmth: 0 } },
  { label: "Cool", f: { brightness: 100, contrast: 104, saturation: 95, warmth: -40 } },
];

export function CellInspector({ index }: { index: number }) {
  const { state, set, template, setSelectedCell } = useEditor();
  const cell = state.cells[index];
  if (!cell) return null;
  const t = cell.transform;
  const f = cell.filters;
  const patchT = (p: Partial<typeof t>) => set((s) => ({ ...s, cells: s.cells.map((c, i) => (i === index ? { ...c, transform: { ...c.transform, ...p } } : c)) }));
  const patchF = (p: Partial<CellFilters>) => set((s) => ({ ...s, cells: s.cells.map((c, i) => (i === index ? { ...c, filters: { ...c.filters, ...p } } : c)) }));
  const isPolaroid = template.cells[index]?.frame === "polaroid";

  return (
    <div className="space-y-6">
      <PanelTitle action={<button onClick={() => setSelectedCell(null)} className="text-[11px] text-muted hover:text-charcoal">Done</button>}>Frame {index + 1}</PanelTitle>
      {!cell.image ? (
        <p className="text-sm text-muted">Empty frame — drag a photo here or tap one in Photos.</p>
      ) : (
        <>
          <section>
            <Slider label="Zoom" value={Math.round(t.zoom * 100)} min={100} max={400} onChange={(v) => patchT({ zoom: v / 100 })} format={(v) => `${v}%`} />
            <Slider label="Straighten" value={t.rotate} min={-45} max={45} onChange={(v) => patchT({ rotate: v })} format={(v) => `${v}°`} />
            <div className="mt-2 flex flex-wrap gap-1">
              <IconAction label="Rotate left" onClick={() => patchT({ rotate: ((t.rotate - 90 + 540) % 360) - 180 })}>
                <RotateCcw className="size-4" />
              </IconAction>
              <IconAction label="Rotate right" onClick={() => patchT({ rotate: ((t.rotate + 90 + 540) % 360) - 180 })}>
                <RotateCw className="size-4" />
              </IconAction>
              <IconAction label="Flip horizontally" active={t.flipX} onClick={() => patchT({ flipX: !t.flipX })}>
                <FlipHorizontal2 className="size-4" />
              </IconAction>
              <IconAction label="Flip vertically" active={t.flipY} onClick={() => patchT({ flipY: !t.flipY })}>
                <FlipVertical2 className="size-4" />
              </IconAction>
              <button onClick={() => patchT({ fit: t.fit === "cover" ? "contain" : "cover", zoom: 1, offsetX: 0, offsetY: 0 })} className="ml-auto rounded-full border border-line px-3 text-xs hover:border-charcoal/40">
                {t.fit === "cover" ? "Fit whole photo" : "Fill frame"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted">Drag the photo to reframe · scroll to zoom</p>
          </section>
          <section>
            <PanelTitle>Look</PanelTitle>
            <div className="mb-4 grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => {
                const active = JSON.stringify(p.f) === JSON.stringify(f);
                return (
                  <button key={p.label} onClick={() => patchF(p.f)} className={cn("rounded-sm border py-1.5 text-xs transition", active ? "border-charcoal bg-charcoal text-ivory" : "border-line hover:border-charcoal/40")}>
                    {active && <Check className="mr-1 inline size-3" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
            <Slider label="Brightness" value={f.brightness} min={50} max={150} onChange={(v) => patchF({ brightness: v })} />
            <Slider label="Contrast" value={f.contrast} min={50} max={150} onChange={(v) => patchF({ contrast: v })} />
            <Slider label="Saturation" value={f.saturation} min={0} max={180} onChange={(v) => patchF({ saturation: v })} />
            <Slider label="Warmth" value={f.warmth} min={-100} max={100} onChange={(v) => patchF({ warmth: v })} />
          </section>
        </>
      )}
      {isPolaroid && (
        <section>
          <PanelTitle>Caption</PanelTitle>
          <input value={cell.caption ?? template.cells[index]?.caption ?? ""} onChange={(e) => set((s) => ({ ...s, cells: s.cells.map((c, i) => (i === index ? { ...c, caption: e.target.value.slice(0, 40) } : c)) }))} className="field" aria-label="Polaroid caption" />
        </section>
      )}
      {cell.image && (
        <button onClick={() => set((s) => ({ ...s, cells: s.cells.map((c, i) => (i === index ? { ...c, image: null, transform: { ...DEFAULT_TRANSFORM }, filters: { ...DEFAULT_FILTERS } } : c)) }))} className="inline-flex items-center gap-1.5 text-xs text-danger">
          <Trash2 className="size-3.5" /> Remove photo
        </button>
      )}
    </div>
  );
}

function IconAction({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} aria-pressed={active} className={cn("grid size-9 place-items-center rounded-full border transition", active ? "border-charcoal bg-charcoal text-ivory" : "border-line hover:border-charcoal/40")}>
      {children}
    </button>
  );
}


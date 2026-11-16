"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import useMeasure from "react-use-measure";
import { ArrowLeft, ChevronDown, Download, ImageIcon, LayoutTemplate, Loader2, Palette, Redo2, Save, Sparkles, Type, Undo2, X } from "lucide-react";
import { applyTemplate, createDesignState } from "@/lib/grid/layout";
import { BUILTIN_TEMPLATES, findTemplate } from "@/lib/grid/templates";
import { SAMPLE_IMAGES } from "@/lib/grid/samples";
import { exportDesign } from "@/lib/grid/paint";
import { DEFAULT_FILTERS, DEFAULT_TRANSFORM, type DesignState, type ImageRef, type TemplateConfig } from "@/lib/grid/types";
import { createGridAsset, finishGridAsset, getGridSources, loadGridDesign, saveGridDesign } from "@/server/actions/grid";
import { toast } from "@/components/ui/toaster";
import { TransitionPanel } from "@/components/motion/transition-panel";
import { cn } from "@/lib/utils";
import { DesignCanvas } from "./design-canvas";
import { EditorContext, IMAGE_MIME, type EditorApi, type Library } from "./editor-context";
import { useHistory } from "./use-history";
import { AutoLayoutPanel, CellInspector, PhotosPanel, StylePanel, TemplatesPanel, TextPanel } from "./panels";

const TABS = [
  { id: "templates", label: "Layouts", icon: LayoutTemplate },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "auto", label: "Auto", icon: Sparkles },
  { id: "text", label: "Text", icon: Type },
  { id: "style", label: "Style", icon: Palette },
] as const;
type Tab = (typeof TABS)[number]["id"];

const DRAFT_KEY = "saanjh-grid-draft-v1";

function readDraft(): { name: string; state: DesignState } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function imageSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve({ width: i.naturalWidth, height: i.naturalHeight });
    i.onerror = () => reject(new Error("Couldn’t read that image"));
    i.src = url;
  });
}

function put(url: string, file: File, type: string) {
  return fetch(url, { method: "PUT", body: file, headers: { "Content-Type": type } }).then((r) => {
    if (!r.ok) throw new Error(r.status === 413 ? "File too large" : "Upload failed");
  });
}

export function GridEditor({ initialTemplateId, designId, initialPanel }: { initialTemplateId?: string; designId?: string; initialPanel?: string }) {
  const startTpl = findTemplate(initialTemplateId ?? "") ?? findTemplate("editorial-five") ?? BUILTIN_TEMPLATES[0];
  const history = useHistory<DesignState>(createDesignState(startTpl));
  const { state, set, reset, undo, redo, canUndo, canRedo } = history;
  const template = useMemo(() => findTemplate(state.templateId) ?? startTpl, [state.templateId, startTpl]);

  const [name, setName] = useState("Untitled design");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialPanel) ? (initialPanel as Tab) : initialTemplateId ? "photos" : "templates");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [library, setLibrary] = useState<Library>({ device: [], uploads: [], galleries: [], samples: SAMPLE_IMAGES });
  const [signedIn, setSignedIn] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const ready = useRef(false);

  // initial load: account sources, saved design or local draft
  useEffect(() => {
    getGridSources()
      .then((s) => {
        setSignedIn(s.signedIn);
        setLibrary((l) => ({ ...l, uploads: s.uploads, galleries: s.galleries }));
      })
      .catch(() => {});
    if (designId) {
      loadGridDesign(designId).then((r) => {
        if (!r.ok) return toast.error(r.error);
        reset(r.data!.state);
        setName(r.data!.name);
        setSavedId(r.data!.id);
      });
    } else if (!initialTemplateId) {
      const d = readDraft();
      if (d?.state?.version === 1 && findTemplate(d.state.templateId)) {
        const hadLocal = d.state.cells.some((c) => c.image?.source === "local");
        reset({ ...d.state, cells: d.state.cells.map((c) => (c.image?.source === "local" ? { ...c, image: null } : c)) });
        setName(d.name || "Untitled design");
        if (hadLocal) toast.info("Draft restored", "Photos from your device need adding again after a reload.");
      }
    }
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autosave draft locally
  useEffect(() => {
    if (!ready.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, state }));
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [state, name]);

  const placeImage = useCallback(
    (img: ImageRef, cell?: number) => {
      set((s) => {
        const target = cell ?? selectedCell ?? s.cells.findIndex((c) => !c.image);
        const idx = target >= 0 ? target : 0;
        return { ...s, cells: s.cells.map((c, i) => (i === idx ? { ...c, image: img, transform: { ...DEFAULT_TRANSFORM }, filters: c.image ? c.filters : { ...DEFAULT_FILTERS } } : c)) };
      });
    },
    [set, selectedCell],
  );

  const switchTemplate = useCallback(
    (tpl: TemplateConfig, images?: ImageRef[]) => {
      set((s) => {
        if (!images) return applyTemplate(s, tpl);
        const next = createDesignState(tpl, images, s.watermark.text);
        next.watermark = s.watermark;
        next.texts = next.texts.map((t) => {
          const prev = t.role ? s.texts.find((p) => p.role === t.role) : undefined;
          return prev ? { ...t, text: prev.text } : t;
        });
        return next;
      });
      setSelectedCell(null);
      setSelectedText(null);
    },
    [set],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 30);
      if (!list.length) return;
      setUploading((n) => n + list.length);
      const added: ImageRef[] = [];
      await Promise.all(
        list.map(async (file) => {
          try {
            if (signedIn) {
              const t = await createGridAsset({ name: file.name, size: file.size, type: file.type });
              if (!t.ok) throw new Error(t.error);
              await put(t.data!.url, file, t.data!.contentType);
              const done = await finishGridAsset(t.data!.id);
              if (!done.ok) throw new Error(done.error);
              added.push(done.data!);
            } else {
              const url = URL.createObjectURL(file);
              const { width, height } = await imageSize(url);
              added.push({ source: "local", id: `${file.name}-${file.size}-${file.lastModified}`, src: url, fullSrc: url, width, height, name: file.name });
            }
          } catch (e) {
            toast.error(`${file.name}`, e instanceof Error ? e.message : "Couldn’t add this photo");
          } finally {
            setUploading((n) => n - 1);
          }
        }),
      );
      if (!added.length) return;
      setLibrary((l) => (signedIn ? { ...l, uploads: [...added, ...l.uploads] } : { ...l, device: [...added, ...l.device] }));
      // drop new photos straight into empty frames
      set((s) => {
        let k = 0;
        return { ...s, cells: s.cells.map((c) => (c.image || k >= added.length ? c : { ...c, image: added[k++], transform: { ...DEFAULT_TRANSFORM } })) };
      });
    },
    [signedIn, set],
  );

  const loadDesign = useCallback(
    async (id: string) => {
      const r = await loadGridDesign(id);
      if (!r.ok) return toast.error(r.error);
      reset(r.data!.state);
      setName(r.data!.name);
      setSavedId(r.data!.id);
      window.history.replaceState(null, "", `/grid-studio/editor?design=${id}`);
    },
    [reset],
  );

  const save = async () => {
    if (!signedIn) {
      toast.info("Your draft is kept in this browser", "Sign in to save designs to your account and reopen them anywhere.");
      return;
    }
    setSaving(true);
    const r = await saveGridDesign({ id: savedId ?? undefined, name, state });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    setSavedId(r.data!.id);
    window.history.replaceState(null, "", `/grid-studio/editor?design=${r.data!.id}`);
    toast("Design saved");
  };

  const doExport = async (format: "png" | "jpg" | "pdf", scale: number) => {
    setExportOpen(false);
    setExporting(format);
    try {
      await exportDesign(state, template, format, scale, name);
      toast("Exported", { description: `${Math.round(state.width * scale)} × ${Math.round(state.height * scale)} px ${format.toUpperCase()}` });
    } catch (e) {
      toast.error("Export failed", e instanceof Error ? e.message : undefined);
    } finally {
      setExporting(null);
    }
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedCell != null) {
        set((s) => ({ ...s, cells: s.cells.map((c, i) => (i === selectedCell ? { ...c, image: null } : c)) }));
      } else if (e.key === "Escape") {
        setSelectedCell(null);
        setSelectedText(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, set, selectedCell]);

  const api: EditorApi = { state, template, set, selectedCell, setSelectedCell, selectedText, setSelectedText, library, signedIn, uploading, addFiles, placeImage, switchTemplate, loadDesign };

  const onDropImage = (cell: number, dt: DataTransfer) => {
    const raw = dt.getData(IMAGE_MIME);
    if (raw) {
      try {
        placeImage(JSON.parse(raw) as ImageRef, cell);
        setSelectedCell(cell);
      } catch {}
      return;
    }
    if (dt.files.length) {
      setSelectedCell(cell);
      addFiles(dt.files);
    }
  };

  const panel = (
    <TransitionPanel
      activeIndex={TABS.findIndex((t) => t.id === tab)}
      transition={{ duration: 0.25, ease: "easeOut" }}
      variants={{ enter: { opacity: 0, y: 8, filter: "blur(4px)" }, center: { opacity: 1, y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -8, filter: "blur(4px)" } }}
    >
      {[<TemplatesPanel key="t" />, <PhotosPanel key="p" />, <AutoLayoutPanel key="a" />, <TextPanel key="x" />, <StylePanel key="s" />]}
    </TransitionPanel>
  );

  return (
    <EditorContext.Provider value={api}>
      <div className="flex h-dvh flex-col overflow-hidden bg-[#EFEAE2] text-charcoal">
        {/* top bar */}
        <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-ivory px-3 sm:px-4">
          <Link href="/grid-studio" className="grid size-9 place-items-center rounded-full hover:bg-charcoal/5" aria-label="Back to Grid Studio">
            <ArrowLeft className="size-4" />
          </Link>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} className="font-display min-w-0 max-w-[40vw] flex-1 truncate rounded bg-transparent px-2 py-1 text-xl hover:bg-charcoal/5 focus:bg-white focus:outline-none sm:max-w-xs sm:flex-none" aria-label="Design name" />
          <span className="hidden text-[11px] text-muted md:inline">
            {template.name} · {state.width}×{state.height}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" className="grid size-9 place-items-center rounded-full hover:bg-charcoal/5 disabled:opacity-30">
              <Undo2 className="size-4" />
            </button>
            <button onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className="grid size-9 place-items-center rounded-full hover:bg-charcoal/5 disabled:opacity-30">
              <Redo2 className="size-4" />
            </button>
            <button onClick={save} disabled={saving} className="ml-1 hidden h-9 items-center gap-1.5 rounded-full border border-charcoal/20 px-4 text-[12px] transition hover:border-charcoal sm:inline-flex">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} {savedId ? "Saved" : "Save"}
            </button>
            <div className="relative">
              <button onClick={() => setExportOpen((v) => !v)} disabled={!!exporting} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-charcoal px-4 text-[12px] text-ivory transition hover:bg-ink disabled:opacity-60" aria-expanded={exportOpen}>
                {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Export <ChevronDown className="size-3" />
              </button>
              <AnimatePresence>
                {exportOpen && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-11 z-50 w-64 border border-line bg-white p-2 shadow-xl">
                    {(
                      [
                        ["png", 1, "PNG", "Lossless · best for Instagram"],
                        ["jpg", 1, "JPG", "Smaller file · great for sharing"],
                        ["png", 2, "PNG · 2×", "Extra sharp for print"],
                        ["pdf", 2, "PDF · 2×", "Print-ready document"],
                      ] as const
                    ).map(([f, s, label, hint]) => (
                      <button key={label} onClick={() => doExport(f, s)} className="flex w-full items-center justify-between gap-3 rounded px-3 py-2.5 text-left hover:bg-charcoal/5">
                        <span>
                          <span className="block text-sm">{label}</span>
                          <span className="block text-[11px] text-muted">{hint}</span>
                        </span>
                        <span className="text-[10px] tabular-nums text-muted">
                          {state.width * s}×{state.height * s}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* desktop rail + panel */}
          <nav className="hidden w-[72px] shrink-0 flex-col items-center gap-1 border-r border-line bg-ivory py-3 md:flex" aria-label="Editor tools">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn("relative flex w-14 flex-col items-center gap-1 rounded-lg py-2.5 text-[10px] transition", tab === t.id ? "text-charcoal" : "text-muted hover:text-charcoal")} aria-current={tab === t.id}>
                {tab === t.id && <motion.span layoutId="rail-active" className="absolute inset-0 rounded-lg bg-charcoal/[0.07]" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
                <t.icon className="relative size-[18px]" />
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </nav>
          <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-r border-line bg-ivory p-5 md:block" data-lenis-prevent>
            {panel}
          </aside>

          {/* stage */}
          <Stage state={state} template={template} selectedCell={selectedCell} selectedText={selectedText} setSelectedCell={setSelectedCell} setSelectedText={setSelectedText} set={set} onDropImage={onDropImage} />

          {/* inspector (desktop) */}
          <AnimatePresence>
            {selectedCell != null && (
              <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-line bg-ivory p-5 lg:block" data-lenis-prevent>
                <CellInspector index={selectedCell} />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* mobile: inspector sheet, tool sheet and tab bar */}
        <AnimatePresence>
          {(sheetOpen || selectedCell != null) && (
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="fixed inset-x-0 bottom-[60px] z-40 max-h-[52dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-ivory p-5 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.25)] md:hidden lg:hidden" data-lenis-prevent>
              <button onClick={() => (setSheetOpen(false), setSelectedCell(null))} className="absolute right-3 top-3 grid size-8 place-items-center rounded-full hover:bg-charcoal/5" aria-label="Close panel">
                <X className="size-4" />
              </button>
              {selectedCell != null ? <CellInspector index={selectedCell} /> : panel}
            </motion.div>
          )}
        </AnimatePresence>
        {selectedCell != null && (
          <div className="fixed bottom-6 right-6 z-40 hidden w-[300px] md:block lg:hidden">
            <div className="max-h-[60dvh] overflow-y-auto border border-line bg-ivory p-5 shadow-2xl" data-lenis-prevent>
              <CellInspector index={selectedCell} />
            </div>
          </div>
        )}
        <nav className="z-50 flex h-[60px] shrink-0 items-stretch border-t border-line bg-ivory md:hidden" aria-label="Editor tools">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedCell(null);
                if (tab === t.id) setSheetOpen((v) => !v);
                else {
                  setTab(t.id);
                  setSheetOpen(true);
                }
              }}
              className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px]", tab === t.id && sheetOpen ? "text-charcoal" : "text-muted")}
            >
              <t.icon className="size-[18px]" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </EditorContext.Provider>
  );
}

function Stage({ state, template, selectedCell, selectedText, setSelectedCell, setSelectedText, set, onDropImage }: { state: DesignState; template: TemplateConfig; selectedCell: number | null; selectedText: string | null; setSelectedCell: (i: number | null) => void; setSelectedText: (id: string | null) => void; set: EditorApi["set"]; onDropImage: (cell: number, dt: DataTransfer) => void }) {
  const [ref, b] = useMeasure();
  const pad = b.width < 640 ? 20 : 56;
  const width = Math.max(0, Math.min(b.width - pad * 2, (b.height - pad * 2) * (state.width / state.height)));
  return (
    <main
      ref={ref}
      className="relative grid min-w-0 flex-1 place-items-center overflow-hidden bg-[radial-gradient(circle_at_center,#F5F1EA,#E6DFD4)]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedCell(null);
          setSelectedText(null);
        }
      }}
    >
      {width > 0 && (
        <motion.div key={state.templateId} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="shadow-[0_30px_70px_-30px_rgba(36,35,33,0.45)]">
          <DesignCanvas
            state={state}
            template={template}
            width={width}
            interactive
            selectedCell={selectedCell}
            selectedText={selectedText}
            onSelectCell={setSelectedCell}
            onSelectText={setSelectedText}
            onTransform={(i, t) => set((s) => ({ ...s, cells: s.cells.map((c, j) => (j === i ? { ...c, transform: { ...c.transform, ...t } } : c)) }))}
            onMoveText={(id, x, y) => set((s) => ({ ...s, texts: s.texts.map((t) => (t.id === id ? { ...t, x, y } : t)) }))}
            onDropImage={onDropImage}
          />
        </motion.div>
      )}
      <p className="pointer-events-none absolute left-1/2 top-2 hidden -translate-x-1/2 whitespace-nowrap text-[11px] text-muted xl:block">Click a frame to edit · drag photos in from the panel · Ctrl+Z to undo</p>
    </main>
  );
}

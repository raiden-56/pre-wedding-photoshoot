"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Info, TriangleAlert } from "lucide-react";

type Toast = { id: number; title: string; description?: string; tone: "success" | "error" | "info" };
const listeners = new Set<(t: Toast) => void>();
let counter = 0;

export function toast(title: string, opts: { description?: string; tone?: Toast["tone"] } = {}) {
  const t: Toast = { id: ++counter, title, description: opts.description, tone: opts.tone ?? "success" };
  listeners.forEach((l) => l(t));
}
toast.error = (title: string, description?: string) => toast(title, { description, tone: "error" });
toast.info = (title: string, description?: string) => toast(title, { description, tone: "info" });

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const add = (t: Toast) => {
      setItems((s) => [...s.slice(-3), t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 4800);
    };
    listeners.add(add);
    return () => void listeners.delete(add);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-6 sm:translate-x-0" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex gap-3 border border-line bg-charcoal px-4 py-3 text-ivory shadow-xl"
            role={t.tone === "error" ? "alert" : "status"}
          >
            <span className="mt-0.5">
              {t.tone === "success" ? <Check className="size-4 text-champagne" /> : t.tone === "error" ? <TriangleAlert className="size-4 text-[#e6a198]" /> : <Info className="size-4 text-champagne" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-ivory/70">{t.description}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BUILTIN_TEMPLATES, categoriesFor, TEMPLATE_CATEGORIES } from "@/lib/grid/templates";
import { AnimatedBackground } from "@/components/motion/animated-background";
import { TemplateCard } from "./template-card";

export function TemplateBrowser() {
  const [cat, setCat] = useState<string>("All Templates");
  const items = useMemo(() => (cat === "All Templates" ? BUILTIN_TEMPLATES : BUILTIN_TEMPLATES.filter((t) => categoriesFor(t).includes(cat))), [cat]);
  const counts = useMemo(() => Object.fromEntries(TEMPLATE_CATEGORIES.map((c) => [c, c === "All Templates" ? BUILTIN_TEMPLATES.length : BUILTIN_TEMPLATES.filter((t) => categoriesFor(t).includes(c)).length])), []);

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-10 overflow-x-auto px-4">
        <div className="flex w-max gap-1 rounded-full border border-line bg-white p-1">
          <AnimatedBackground defaultValue={cat} onValueChange={(v) => v && setCat(v)} className="rounded-full bg-charcoal" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}>
            {TEMPLATE_CATEGORIES.filter((c) => counts[c] > 0).map((c) => (
              <button key={c} data-id={c} type="button" className="whitespace-nowrap px-4 py-2 text-[12px] text-ink transition-colors duration-300 data-[checked=true]:text-ivory">
                {c.replace(" Templates", "")} <span className="ml-1 text-[10px] tabular-nums opacity-50">{counts[c]}</span>
              </button>
            ))}
          </AnimatedBackground>
        </div>
      </div>
      <motion.div layout className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {items.map((t, i) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.5, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}>
              <TemplateCard template={t} index={i} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

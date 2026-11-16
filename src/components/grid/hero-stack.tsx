"use client";

import { motion, useReducedMotion } from "motion/react";
import type { TemplateConfig } from "@/lib/grid/types";
import { Tilt } from "@/components/motion/tilt";
import { TemplatePreview } from "./template-card";

const POSES = [
  { x: "-18%", y: "8%", r: -8, w: "46%", z: 1, d: 0.5 },
  { x: "0%", y: "-4%", r: 0, w: "54%", z: 3, d: 0.3 },
  { x: "18%", y: "10%", r: 7, w: "46%", z: 2, d: 0.7 },
];

/** Three live template previews fanned out like prints on a table. */
export function GridHeroStack({ templates }: { templates: TemplateConfig[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[620px]">
      {templates.slice(0, 3).map((t, i) => {
        const p = POSES[i];
        return (
          <motion.div
            key={t.id}
            className="absolute left-1/2 top-1/2"
            style={{ width: p.w, zIndex: p.z }}
            initial={reduce ? false : { opacity: 0, x: "-50%", y: "-30%", rotate: 0, scale: 0.9 }}
            animate={{ opacity: 1, x: `calc(-50% + ${p.x})`, y: `calc(-50% + ${p.y})`, rotate: p.r, scale: 1 }}
            transition={{ delay: p.d, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div animate={reduce ? undefined : { y: [0, i % 2 ? 8 : -8, 0] }} transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}>
              <Tilt rotationFactor={8} isRevese>
                <TemplatePreview template={t} offset={i * 5} className="w-full shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)]" />
              </Tilt>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

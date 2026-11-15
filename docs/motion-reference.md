# Motion & layout reference

Reference: [motionsites.ai](https://motionsites.ai/) — a curated library of motion-led landing pages
(portfolio, fashion, 3D, scroll-driven). We borrow its *techniques*, not its look: our palette stays
ivory / champagne / charcoal / olive, with no neon, glow or purple gradients.

## Patterns we adopt

| Pattern seen on motionsites | Where we use it | Implementation |
|---|---|---|
| Weighted smooth scrolling | Whole public site | `lenis` via `components/site/smooth-scroll.tsx` (synced with GSAP ScrollTrigger; off for reduced motion) |
| Oversized display type with staggered word reveal | Home hero | Motion, `components/site/hero.tsx` |
| Rotating keyword in the hero line | Hero eyebrow (locations) | Motion Primitives `TextLoop` |
| Magnetic CTAs | Hero buttons | Motion Primitives `Magnetic` |
| Soft progressive blur instead of heavy gradient scrims | Bottom of hero image | Motion Primitives `ProgressiveBlur` |
| Endless image strips / marquees | Home, below the intro | Motion Primitives `InfiniteSlider` (`components/site/photo-marquee.tsx`) |
| Scroll-pinned 3D object handing off to a real image | “The frame” section | React Three Fiber, `frame-showcase.tsx` |
| Scroll-scrubbed timeline with sticky media | Our process | GSAP ScrollTrigger, `process-timeline.tsx` |
| In-view reveals | Section headings & images | `Reveal` / `ImageReveal` or Motion Primitives `InView` |

## Libraries

- **motion** (Framer Motion) — UI transitions, layout animations.
- **gsap** + ScrollTrigger — scroll-scrubbed storytelling.
- **lenis** — smooth scroll.
- **Motion Primitives** (`components/motion/*`, installed through the shadcn registry in `components.json`).
  Add more with `npx shadcn@latest add @motion-primitives/<name>`.
- **@react-three/fiber** + three — the single purposeful WebGL moment.

## Rules

- Respect `prefers-reduced-motion` everywhere; motion is decoration, never required to read content.
- One WebGL canvas at most per page, lazy-loaded, desktop only.
- Animate `transform` / `opacity` / `clip-path`; never layout properties on scroll.
- Run `/unslop` (Claude Code plugin, enabled in `.claude/settings.json`) on any new screen before shipping.

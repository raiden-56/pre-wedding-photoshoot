# Motion & layout reference

Reference: [motionsites.ai](https://motionsites.ai/) — a curated library of motion-led landing pages
(portfolio, fashion, 3D, scroll-driven). We borrow its *techniques*, not its look: our palette stays
ivory / champagne / charcoal / olive, with no neon, glow or purple gradients.

## Patterns we adopt

| Pattern seen on motionsites | Where we use it | Implementation |
|---|---|---|
| Weighted smooth scrolling | Whole public site | `lenis` via `components/site/smooth-scroll.tsx` (off for reduced motion) |
| Cross-fading slideshow with slow zoom + progress bars | Home hero | Motion, `components/site/hero.tsx` (all slides preloaded; pauses when the tab is hidden) |
| Scroll turns the full-bleed photo into a matted, framed print | Home hero → “Every love story deserves its own frame” | `useScroll` → animated `clip-path` on the photo and a white mat |
| Word-by-word headline rise | Home hero | Motion, masked spans |
| Rules that draw in as each step arrives | Our process | `whileInView` + `scaleX` (`process-timeline.tsx`) |
| Expanding photo strip | Where we shoot (desktop) | `flex-grow` transition, details fade in (`locations-strip.tsx`) |
| In-view reveals | Section headings & images | `Reveal` / `ImageReveal` or Motion Primitives `InView` |
| Clip-path cover reveal + per-letter title | Couple gallery cover, gates | Motion + Motion Primitives `TextEffect` (`components/gallery/landing.tsx`, `gate.tsx`) |
| Rolling digits | Wedding countdown | Motion Primitives `SlidingNumber` |
| Sliding pill behind the active tab | Gallery album nav, Grid Studio categories | Motion Primitives `AnimatedBackground` |
| Tilt-on-hover cards | Album chapters, Grid Studio hero | Motion Primitives `Tilt` |
| Self-drawing timeline line | Love-story timeline | `useScroll` → `scaleY` |
| Ken Burns crossfade | Gallery slideshow | Motion (`components/gallery/slideshow.tsx`) |
| Fanned, floating prints | Grid Studio hero | Live template previews + `Tilt` (`components/grid/hero-stack.tsx`) |
| Blur-crossfade panels | Grid Studio tool panels | Motion Primitives `TransitionPanel` |

## Libraries

- **motion** (Framer Motion) — UI transitions, layout animations.
- **gsap** + ScrollTrigger — scroll-scrubbed storytelling.
- **lenis** — smooth scroll.
- **Motion Primitives** (`components/motion/*`, installed through the shadcn registry in `components.json`).
  Add more with `npx shadcn@latest add @motion-primitives/<name>`.
- **@react-three/fiber** + three — the single purposeful WebGL moment.

## Homepage (unslop pass)

The homepage was unslopped for a calmer, more professional first screen: the hero fits one viewport with a single photograph, display type was reduced (hero 40–56px, section titles 30–42px), labels are sentence case, and looping or scroll-jacked effects were removed (marquee, parallax, magnetic buttons, the scroll-pinned 3D frame and the GSAP process timeline). `gsap`, `three` and `@react-three/fiber` are no longer imported anywhere.

## Rules

- Respect `prefers-reduced-motion` everywhere; motion is decoration, never required to read content.
- One WebGL canvas at most per page, lazy-loaded, desktop only.
- Animate `transform` / `opacity` / `clip-path`; never layout properties on scroll.
- Run `/unslop` (Claude Code plugin, enabled in `.claude/settings.json`) on any new screen before shipping.

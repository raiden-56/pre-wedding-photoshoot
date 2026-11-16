# Saanjh Studio — Pre-Wedding & Wedding Photography Platform

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma + PostgreSQL · Motion · GSAP · Lenis · Motion Primitives · React Three Fiber.

Design tooling: the [unslop](https://github.com/heydamir/unslop) Claude Code plugin is enabled for this project in `.claude/settings.json` (run `/unslop` on a screen). Motion and layout guidelines, referenced from [motionsites.ai](https://motionsites.ai/), are in [docs/motion-reference.md](docs/motion-reference.md).

> **Work in progress.** Public website, auth, database, upload pipeline, background jobs, the photographer dashboard (including the gallery workspace), couple galleries, guest invitations and uploads, and Photo Grid Studio are built. Still to come: the couple dashboard (`/dashboard`), the album designer UI, and a few admin list pages (uploads, payments, packages, testimonials, notifications, settings).

## Quick start

```bash
npm install
cp .env.example .env          # set APP_SECRET to 32+ random characters
npm run db:local              # starts an embedded PostgreSQL on :5433 (keep it running)
npx prisma db push
npm run db:seed               # fictional sample data + processes sample photos
npm run dev                   # http://localhost:3100
```

Development logins are listed at the top of `prisma/seed.ts`.

## What's here

- **Public site** — cinematic hero, scroll-driven 3D frame, GSAP process timeline, portfolio masonry + lightbox, stories, packages, locations, blog, inquiry form (saved to DB + studio notification), SEO (sitemap, robots, JSON-LD).
- **Auth & roles** — DB-backed sessions (httpOnly cookie, hashed tokens), bcrypt, rate-limited login, studio registration, couple account setup links. Every action re-checks role and studio ownership server-side.
- **Private media** — originals stored outside `public/`, served only via HMAC-signed expiring URLs; S3-compatible driver with presigned uploads; sharp derivatives (thumb/medium/large WebP), lazy watermarking.
- **Uploads** — signed upload tickets, streamed to storage (no buffering), per-file progress, 3-way concurrency, pause/resume, retry, cancel, duplicate detection, background processing via a PostgreSQL job queue.
- **Dashboard** — overview with revenue/booking charts, clients, photoshoots (list + calendar), inquiries → quotations → bookings, payments (manual + Razorpay with server-side verification and signed webhook), invoices.
- **Couple galleries** (`/gallery/[slug]`) — cinematic cover, countdown, album chapters, love-story timeline, justified photo grid, lightbox with favourites / comments / edit requests / downloads (PIN + ZIP), selection lists with limits and submit-to-studio, family sharing with QR codes, Ken Burns slideshow, guest uploads.
- **Invitations** (`/guest/[token]`) — personal invitation entry (optional password) and QR upload portals for wedding guests.
- **Gallery workspace** (`/admin/galleries/[id]`) — albums, uploads, multi-select bulk actions, selections with “copy filenames”, comment replies, guest-upload moderation, album-design review, sharing, settings, guarded deletion, activity.
- **Photo Grid Studio** (`/grid-studio`) — 32 data-driven templates, drag-and-drop editor (reframe, zoom, straighten, filters, text, style, undo/redo), Smart Auto Layout, PNG / JPG / PDF export from the same layout math as the editor, saved designs and gallery photos for signed-in users.

## Sample content

Photographs are CC0 works (originally Unsplash, via Wikimedia Commons) — credits in `prisma/photo-credits.json` and at `/credits`. Couples, testimonials, stories and prices are fictional and flagged as samples in the UI.

## Static demo (GitHub Pages)

A read-only demo of the whole app — public site, studio dashboard, couple dashboard, private galleries and Grid Studio — runs on GitHub Pages without a backend. Sign-in screens offer **Continue as a guest** instead of a login form, and every page shows the seeded sample data captured at build time. Anything that would change data shows a “read-only demo” notice.

```bash
npm run db:local       # the sample database must be running while building
npm run build:demo     # → demo-out/ (served from /pre-wedding-photoshoot/)
npm run deploy:demo    # force-pushes demo-out/ to the gh-pages branch
```

`scripts/build-demo.mjs` never touches `src/`: it copies the project to `.demo-build/`, swaps in demo stand-ins from `scripts/demo/overrides` (no sessions, read-only actions, static media URLs), pre-renders every route and copies the gallery photographs in as static files. Guest mode only appears in this build (`NEXT_PUBLIC_DEMO=1`); the real app keeps normal sign-in.

# Saanjh Studio — Pre-Wedding & Wedding Photography Platform

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma + PostgreSQL · Motion · GSAP · Lenis · Motion Primitives · React Three Fiber.

Design tooling: the [unslop](https://github.com/heydamir/unslop) Claude Code plugin is enabled for this project in `.claude/settings.json` (run `/unslop` on a screen). Motion and layout guidelines, referenced from [motionsites.ai](https://motionsites.ai/), are in [docs/motion-reference.md](docs/motion-reference.md).

> **Work in progress.** Public website, auth, database, upload pipeline, background jobs and most of the photographer dashboard are built. The admin gallery detail workspace, couple-facing gallery pages, couple dashboard and the Photo Grid Studio UI are still to come (their server actions, access control and template engine already exist).

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
- **Photo Grid Studio engine** — 32 data-driven templates, shared layout math for editor and exporter, Smart Auto Layout.

## Sample content

Photographs are CC0 works (originally Unsplash, via Wikimedia Commons) — credits in `prisma/photo-credits.json` and at `/credits`. Couples, testimonials, stories and prices are fictional and flagged as samples in the UI.

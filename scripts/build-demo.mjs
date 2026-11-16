#!/usr/bin/env node
/**
 * Builds the static, read-only demo of the app for GitHub Pages.
 *
 *   npm run db:local        # sample database must be running (data is captured at build time)
 *   npm run build:demo      # → demo-out/
 *
 * The real source is never modified. The project is copied to .demo-build/,
 * server-only pieces are swapped for demo stand-ins (no sessions, read-only
 * actions, static media), every page is pre-rendered with the sample data,
 * and the private gallery photos are copied in as plain files.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const BUILD = path.join(ROOT, ".demo-build");
const OUT = path.join(ROOT, "demo-out");
const BASE = process.env.DEMO_BASE_PATH ?? "/pre-wedding-photoshoot";
const OVERRIDES = path.join(ROOT, "scripts/demo/overrides");
const log = (m) => console.log(`› ${m}`);

const read = (p) => fs.readFileSync(path.join(BUILD, p), "utf8").replace(/\r\n/g, "\n");
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(BUILD, p)), { recursive: true });
  fs.writeFileSync(path.join(BUILD, p), s);
};
const rm = (p) => fs.rmSync(path.join(BUILD, p), { recursive: true, force: true });
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

// ───────────── 1. fresh copy ─────────────
log("Copying project to .demo-build");
fs.rmSync(BUILD, { recursive: true, force: true });
fs.mkdirSync(BUILD, { recursive: true });
for (const f of ["src", "public", "prisma", "package.json", "package-lock.json", "tsconfig.json", "postcss.config.mjs", "components.json", ".env"]) {
  if (fs.existsSync(path.join(ROOT, f))) fs.cpSync(path.join(ROOT, f), path.join(BUILD, f), { recursive: true });
}
fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(BUILD, "node_modules"), "junction");
fs.cpSync(OVERRIDES, BUILD, { recursive: true });

// ───────────── 2. config ─────────────
write(
  "next.config.ts",
  `import type { NextConfig } from "next";
import path from "node:path";
const nextConfig: NextConfig = {
  output: "export",
  basePath: ${JSON.stringify(BASE)},
  trailingSlash: true,
  pageExtensions: ["tsx"],
  images: { loader: "custom", loaderFile: "./src/demo/image-loader.ts" },
  env: { NEXT_PUBLIC_DEMO: "1", NEXT_PUBLIC_BASE_PATH: ${JSON.stringify(BASE)} },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ["sharp", "archiver", "embedded-postgres", "nodemailer"],
  turbopack: { root: ${JSON.stringify(ROOT.replace(/\\/g, "/"))} },
};
export default nextConfig;
`,
);
write(
  "src/demo/image-loader.ts",
  `const BASE = ${JSON.stringify(BASE)};
export default function demoLoader({ src, width }: { src: string; width: number }) {
  const s = src.startsWith("/") && !src.startsWith(BASE + "/") ? BASE + src : src;
  return s.includes("?") ? s : \`\${s}?w=\${width}\`;
}
`,
);

// ───────────── 3. remove what needs a server ─────────────
// pageExtensions ["tsx"] already drops every .ts route handler, proxy, instrumentation, robots and sitemap.
rm("src/app/(auth)/set-password");

// ───────────── 4. pages: static rendering + pre-listed params ─────────────
write("src/app/layout.tsx", read("src/app/layout.tsx").replace(/(import "\.\/globals\.css";\n)/, `$1\nexport const dynamic = "force-static";\n`));
for (const file of walk(path.join(BUILD, "src/app")).filter((f) => f.endsWith("page.tsx"))) {
  let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  s = s.replace(/^export const dynamic = "force-dynamic";\n/m, "").replace(/^export const revalidate = \d+;\n/m, "");
  // bound server actions can't be passed to client components without a server — the demo ActionButton ignores them anyway
  s = s.replace(/action=\{\w+\.bind\(null(?:, [^}]*)?\)\}/g, "action={undefined as never}");
  const rel = path.relative(path.join(BUILD, "src/app"), file).replace(/\\/g, "/");
  const route = rel.replace(/\/page\.tsx$/, "").replace(/\([^)]+\)\//g, "");
  if (/\[/.test(route) && !/generateStaticParams/.test(s)) {
    s += `\nexport const dynamicParams = false;\nexport async function generateStaticParams() {\n  const { paramsFor } = await import("@/demo/static-params");\n  return paramsFor(${JSON.stringify(route)});\n}\n`;
  }
  fs.writeFileSync(file, s);
}

// ───────────── 5. server actions → read-only stand-ins ─────────────
const SPECIAL = {
  logoutAction: `{ if (typeof window !== "undefined") window.location.href = ${JSON.stringify(BASE + "/")}; }`,
  loginAction: `({ error: DEMO_MESSAGE })`,
  registerAction: `({ error: DEMO_MESSAGE })`,
  setPasswordAction: `({ error: DEMO_MESSAGE })`,
  recordGalleryOpen: `undefined`,
  recordPhotoView: `undefined`,
  getComments: `[]`,
  listInvitations: `[]`,
  getGridSources: `({ signedIn: false, name: null, galleries: [], uploads: [] })`,
  listGridDesigns: `[]`,
  createUploadTickets: `[]`,
  getPhotoStatuses: `[]`,
};
for (const f of fs.readdirSync(path.join(BUILD, "src/server/actions"))) {
  const src = read(`src/server/actions/${f}`);
  const names = [...src.matchAll(/^export async function (\w+)/gm)].map((m) => m[1]);
  const types = [...src.matchAll(/^export type (\w+)/gm)].map((m) => m[1]);
  const body = names
    .map((n) => {
      const r = SPECIAL[n] ?? `({ ok: false as const, error: DEMO_MESSAGE })`;
      return r.startsWith("{") ? `export async function ${n}(..._args: any[]): Promise<any> ${r}` : `export async function ${n}(..._args: any[]): Promise<any> {\n  return ${r};\n}`;
    })
    .join("\n");
  write(`src/server/actions/${f}`, `// DEMO BUILD ONLY — read-only stand-ins for ${f}\n/* eslint-disable */\nimport { DEMO_MESSAGE } from "@/lib/demo";\n${types.map((t) => `export type ${t} = any;`).join("\n")}\n${body}\n`);
}

// ───────────── 6. galleries: open as the couple, media as static files ─────────────
{
  let s = read("src/server/gallery-access.ts");
  const start = s.indexOf("export const resolveGalleryAccess");
  const end = s.indexOf("export class GalleryAccessError");
  s =
    s.slice(0, start) +
    `export const resolveGalleryAccess = cache(async (where: { slug: string } | { id: string }): Promise<GalleryAccess> => {
  const gallery = await db.gallery.findUnique({
    where: "slug" in where ? { slug: where.slug } : { id: where.id },
    include: { settings: true, client: { select: { id: true, userId: true, partner1Name: true, partner2Name: true } } },
  });
  if (!gallery) return { ok: false, reason: "not-found", gallery: null };
  const settings = gallery.settings ?? defaultSettings(gallery.id);
  const owner = gallery.client?.userId ? await db.user.findUnique({ where: { id: gallery.client.userId }, select: { id: true, name: true } }) : null;
  return {
    ok: true,
    gallery,
    settings,
    role: "COUPLE",
    perms: { view: true, favorite: true, comment: true, download: settings.downloadScope !== "NONE", upload: settings.guestUploadsEnabled, share: true, manage: false },
    actor: { userId: owner?.id ?? null, invitationId: null, label: owner?.name ?? gallery.coupleNames },
    invitation: null,
  };
});

` +
    s.slice(end);
  s = s.replace(`import { cookies } from "next/headers";\n`, "").replace(`import { getCurrentUser, isStaff } from "@/lib/auth/session";\n`, "");
  write("src/server/gallery-access.ts", s);
}
{
  let s = read("src/lib/media.ts");
  s = s.replace(
    /export function mediaUrl\([^)]*\)[^{]*\{[\s\S]*?\n\}/,
    `export function mediaUrl(kind: MediaKindPath, id: string, variant: string, _opts: { download?: boolean; ttl?: number } = {}) {
  const v = variant.split(".")[0];
  const file = v === "original" || v === "video" ? "large" : v;
  return \`${BASE}/demo-media/\${kind}/\${id}/\${file}.webp\`;
}`,
  );
  write("src/lib/media.ts", s);
}

// ───────────── 7. build ─────────────
log("Building static export (this takes a minute)");
execSync("npx next build", { cwd: BUILD, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_DEMO: "1", NEXT_PUBLIC_BASE_PATH: BASE, NEXT_TELEMETRY_DISABLED: "1" } });

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(BUILD, "out"), OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

// Next writes route-segment prefetch payloads as nested folders
// (`__next.!X/contact/__PAGE__.txt`) but the client requests them dot-joined
// (`__next.!X.contact.__PAGE__.txt`). Plain static hosts can't map one to the
// other, so write the dot-joined copies too.
let flattened = 0;
for (const file of walk(OUT)) {
  const rel = path.relative(OUT, file).split(path.sep);
  const i = rel.findIndex((seg, k) => seg.startsWith("__next.") && k < rel.length - 1);
  if (i < 0) continue;
  const flat = path.join(OUT, ...rel.slice(0, i), rel.slice(i).join("."));
  if (!fs.existsSync(flat)) {
    fs.copyFileSync(file, flat);
    flattened++;
  }
}
log(`Flattened ${flattened} prefetch segment files`);

// ───────────── 8. private gallery media → static files ─────────────
log("Copying gallery photographs");
const require = createRequire(path.join(ROOT, "package.json"));
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const STORAGE = path.join(ROOT, ".data/storage");
let copied = 0;
const copy = (key, dest) => {
  if (!key) return;
  const from = path.join(STORAGE, key);
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
  copied++;
};
for (const p of await db.photo.findMany({ where: { status: "READY" }, select: { id: true, variants: true } })) {
  for (const [name, key] of Object.entries(p.variants ?? {})) copy(key, path.join(OUT, "demo-media/p", p.id, `${name}.webp`));
}
for (const g of await db.guestUpload.findMany({ where: { thumbKey: { not: null } }, select: { id: true, thumbKey: true } })) {
  copy(g.thumbKey, path.join(OUT, "demo-media/g", g.id, "preview.webp"));
}
await db.$disconnect();
log(`Done — ${copied} media files. Output in demo-out/ (served from ${BASE}/)`);

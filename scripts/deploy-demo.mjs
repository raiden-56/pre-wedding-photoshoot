#!/usr/bin/env node
/**
 * Publishes demo-out/ to the `gh-pages` branch of the origin remote.
 *
 *   npm run build:demo && npm run deploy:demo
 *
 * The branch only ever holds the latest static build (force-pushed, single commit),
 * so the main branch history stays clean.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "demo-out");
if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("demo-out/ is missing — run `npm run build:demo` first.");
  process.exit(1);
}
const remote = execSync("git remote get-url origin", { cwd: ROOT }).toString().trim();
const sha = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
const run = (cmd) => execSync(cmd, { cwd: OUT, stdio: "inherit" });

fs.rmSync(path.join(OUT, ".git"), { recursive: true, force: true });
run("git init -q -b gh-pages");
run("git add -A");
run(`git -c user.name="Demo deploy" -c user.email="demo-deploy@users.noreply.github.com" commit -q -m "Deploy static demo from ${sha}"`);
run(`git push -f "${remote}" gh-pages`);
fs.rmSync(path.join(OUT, ".git"), { recursive: true, force: true });
console.log("› Pushed to gh-pages");

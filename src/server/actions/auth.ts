"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientIp, createSession, destroySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { sha256 } from "@/lib/crypto";
import { loginSchema, passwordRule, registerSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { audit } from "@/server/activity";
import { BUILTIN_TEMPLATES } from "@/lib/grid/templates";

export type FormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

function safeNext(next: string | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { email, password, next } = parsed.data;
  const ip = clientIp(await headers());
  if (!(await rateLimit(`login:${ip}`, 10, 900)) || !(await rateLimit(`login:${email}`, 8, 900))) {
    return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) return { error: "That email and password don’t match our records." };
  await createSession(user.id);
  await audit({ studioId: user.studioId, userId: user.id, action: "login", entity: "User", entityId: user.id });
  const staff = user.role === "ADMIN" || user.role === "PHOTOGRAPHER";
  redirect(safeNext(next, staff ? "/admin" : "/dashboard"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/** Photographer / studio registration. Open when ALLOW_STUDIO_SIGNUP=true or when no studio exists yet. */
export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const allowed = process.env.ALLOW_STUDIO_SIGNUP === "true" || (await db.studio.count()) === 0;
  if (!allowed) return { error: "Studio sign-up is closed. Ask the studio owner to invite you." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const ip = clientIp(await headers());
  if (!(await rateLimit(`register:${ip}`, 5, 3600))) return { error: "Too many attempts. Try again later." };
  const { studioName, name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { fieldErrors: { email: ["An account with this email already exists"] } };

  let slug = slugify(studioName) || "studio";
  if (await db.studio.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const user = await db.$transaction(async (tx) => {
    const studio = await tx.studio.create({ data: { name: studioName, slug, email, watermarkText: studioName.toUpperCase() } });
    // make sure built-in grid templates exist (fresh database without seed)
    const count = await tx.gridTemplate.count();
    if (!count) {
      const { categoriesFor } = await import("@/lib/grid/templates");
      await tx.gridTemplate.createMany({
        data: BUILTIN_TEMPLATES.map((t) => ({ id: t.id, name: t.name, categories: categoriesFor(t), style: t.style, cellCount: t.cells.length, width: t.width, height: t.height, config: t as never })),
      });
    }
    return tx.user.create({ data: { email, name, role: "ADMIN", studioId: studio.id, passwordHash: await hashPassword(password) } });
  });
  await createSession(user.id);
  await audit({ studioId: user.studioId, userId: user.id, action: "register", entity: "Studio", entityId: user.studioId ?? undefined });
  redirect("/admin?welcome=1");
}

/** Couples (and invited staff) set their password from a one-time link. */
export async function setPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const rule = passwordRule.safeParse(password);
  if (!rule.success) return { fieldErrors: { password: rule.error.issues.map((i) => i.message) } };
  if (password !== confirm) return { fieldErrors: { confirm: ["Passwords don’t match"] } };
  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return { error: "This link has expired. Ask the studio to send a new one." };
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await createSession(record.userId);
  const user = await db.user.findUnique({ where: { id: record.userId } });
  redirect(user?.role === "CLIENT" ? "/dashboard" : "/admin");
}

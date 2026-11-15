import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";

export const SESSION_COOKIE = "sid";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const token = randomToken(32);
  const h = await headers();
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
      userAgent: h.get("user-agent")?.slice(0, 250),
      ip: clientIp(h),
    },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  studioId: string | null;
  clientId: string | null;
};

/** Resolves the current user from the session cookie (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { clientProfile: { select: { id: true, studioId: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    studioId: u.studioId ?? u.clientProfile?.studioId ?? null,
    clientId: u.clientProfile?.id ?? null,
  };
});

export function isStaff(user: SessionUser | null): user is SessionUser & { studioId: string } {
  return !!user && (user.role === "ADMIN" || user.role === "PHOTOGRAPHER") && !!user.studioId;
}

/** For server components / pages. Redirects instead of throwing. */
export async function requireStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user)) redirect("/dashboard");
  return user;
}

export async function requireClientPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (isStaff(user)) redirect("/admin");
  return user;
}

export class AuthError extends Error {
  constructor(message = "You are not allowed to do that.") {
    super(message);
  }
}

/** For server actions / route handlers. Throws AuthError. */
export async function requireStaff(opts: { adminOnly?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!isStaff(user)) throw new AuthError("Please sign in with a studio account.");
  if (opts.adminOnly && user.role !== "ADMIN") throw new AuthError("Only studio admins can do that.");
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please sign in first.");
  return user;
}

export function clientIp(h: Headers) {
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local").slice(0, 64);
}

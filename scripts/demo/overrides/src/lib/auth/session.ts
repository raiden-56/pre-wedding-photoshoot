// DEMO BUILD ONLY — replaces src/lib/auth/session.ts in the static export.
// There is no server, so there are no cookies or sessions: studio pages render
// as the seeded studio admin and couple pages as the seeded couple.
import "server-only";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "sid";

export async function createSession(_userId: string) {}
export async function destroySession() {}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  studioId: string | null;
  clientId: string | null;
};

const toSession = (u: { id: string; email: string; name: string; role: Role; studioId: string | null; clientProfile: { id: string; studioId: string } | null }): SessionUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  studioId: u.studioId ?? u.clientProfile?.studioId ?? null,
  clientId: u.clientProfile?.id ?? null,
});

export const demoStaff = cache(async () => {
  const u = await db.user.findFirstOrThrow({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, include: { clientProfile: { select: { id: true, studioId: true } } } });
  return toSession(u) as SessionUser & { studioId: string };
});

export const demoCouple = cache(async () => {
  const u = await db.user.findFirstOrThrow({ where: { role: "CLIENT", clientProfile: { isNot: null } }, orderBy: { createdAt: "asc" }, include: { clientProfile: { select: { id: true, studioId: true } } } });
  return toSession(u);
});

/** Public pages see a signed-out visitor. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => null);

export function isStaff(user: SessionUser | null): user is SessionUser & { studioId: string } {
  return !!user && (user.role === "ADMIN" || user.role === "PHOTOGRAPHER") && !!user.studioId;
}

export async function requireStaffPage() {
  return demoStaff();
}

export async function requireClientPage() {
  return demoCouple();
}

export class AuthError extends Error {
  constructor(message = "You are not allowed to do that.") {
    super(message);
  }
}

export async function requireStaff(_opts: { adminOnly?: boolean } = {}) {
  return demoStaff();
}

export async function requireUser() {
  return demoCouple();
}

export function clientIp(_h: Headers) {
  return "0.0.0.0";
}

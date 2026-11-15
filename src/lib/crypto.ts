import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export function randomToken(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

export function hmac(input: string, secret = env.APP_SECRET) {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Signed, expiring URL parameters. Expiry is bucketed so the same resource
 * yields a stable URL for a while (better browser/CDN caching).
 */
export function signParams(resource: string, ttlSeconds = 60 * 60 * 6) {
  const bucket = 60 * 30;
  const exp = Math.ceil((Date.now() / 1000 + ttlSeconds) / bucket) * bucket;
  const sig = hmac(`${resource}:${exp}`);
  return `exp=${exp}&sig=${sig}`;
}

export function verifySignedParams(resource: string, exp: string | null, sig: string | null) {
  if (!exp || !sig) return false;
  const expN = Number(exp);
  if (!Number.isFinite(expN) || expN < Date.now() / 1000) return false;
  return safeEqual(hmac(`${resource}:${expN}`), sig);
}

/** Compact signed value for cookies: `${value}.${sig}` */
export function signValue(value: string) {
  return `${value}.${hmac(`cookie:${value}`)}`;
}

export function unsignValue(signed: string | undefined | null) {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  return safeEqual(hmac(`cookie:${value}`), sig) ? value : null;
}

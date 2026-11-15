import "server-only";
import { createHmac } from "node:crypto";
import { env, features } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

/**
 * Razorpay integration (Orders API + Checkout). A payment is only ever marked
 * PAID after (1) the checkout signature verifies with our key secret AND (2) the
 * payment is fetched from Razorpay's API and reported as captured/authorized —
 * or when a signed webhook says so. The browser's word is never enough.
 *
 * Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 */
const API = "https://api.razorpay.com/v1";

function auth() {
  if (!features.razorpay) throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  return "Basic " + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
}

export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status})`);
  return (await res.json()) as { id: string; amount: number; currency: string; status: string };
}

export async function fetchPayment(paymentId: string) {
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: auth() } });
  if (!res.ok) throw new Error(`Razorpay payment lookup failed (${res.status})`);
  return (await res.json()) as { id: string; order_id: string; status: "created" | "authorized" | "captured" | "refunded" | "failed"; amount: number; method: string };
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export const razorpayPublicKey = () => (features.razorpay ? env.RAZORPAY_KEY_ID! : null);

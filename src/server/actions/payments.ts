"use server";

import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { getCurrentUser, isStaff } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/utils";
import { createOrder, fetchPayment, razorpayPublicKey, verifyCheckoutSignature } from "@/server/payments/razorpay";
import { markPaidFromProvider } from "@/server/payments/settle";

async function loadPayable(paymentId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please sign in");
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { client: true, booking: true } });
  if (!payment) throw new Error("Payment not found");
  const allowed = (isStaff(user) && user.studioId === payment.studioId) || payment.client.userId === user.id;
  if (!allowed) throw new Error("Not allowed");
  return { user, payment };
}

export async function startOnlinePayment(paymentId: string): Promise<ActionResult<{ key: string; orderId: string; amount: number; name: string; description: string; prefill: { email?: string; contact?: string } }>> {
  try {
    if (!features.razorpay) return { ok: false, error: "Online payments are not enabled. Please pay by UPI or bank transfer and the studio will confirm." };
    const { payment } = await loadPayable(paymentId);
    if (payment.status === "PAID") return { ok: false, error: "This payment is already complete." };
    let orderId = payment.razorpayOrderId;
    if (!orderId) {
      const order = await createOrder(payment.amount, payment.id, { paymentId: payment.id, bookingId: payment.bookingId });
      orderId = order.id;
      await db.payment.update({ where: { id: payment.id }, data: { razorpayOrderId: orderId, method: "RAZORPAY" } });
    }
    const studio = await db.studio.findUnique({ where: { id: payment.studioId } });
    return {
      ok: true,
      data: { key: razorpayPublicKey()!, orderId, amount: payment.amount, name: studio?.name ?? "Studio", description: payment.booking.title, prefill: { email: payment.client.partner1Email ?? undefined, contact: payment.client.partner1Phone ?? undefined } },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start payment" };
  }
}

/** Server-side verification of a completed checkout. */
export async function confirmOnlinePayment(paymentId: string, orderId: string, razorpayPaymentId: string, signature: string): Promise<ActionResult> {
  try {
    const { payment } = await loadPayable(paymentId);
    if (payment.status === "PAID") return { ok: true, message: "Payment already confirmed" };
    if (payment.razorpayOrderId !== orderId) return { ok: false, error: "Order mismatch" };
    if (!verifyCheckoutSignature(orderId, razorpayPaymentId, signature)) return { ok: false, error: "Payment signature could not be verified" };
    const remote = await fetchPayment(razorpayPaymentId);
    if (remote.order_id !== orderId || remote.amount !== payment.amount || !["captured", "authorized"].includes(remote.status)) {
      return { ok: false, error: `Payment not completed (status: ${remote.status})` };
    }
    await markPaidFromProvider(payment.id, razorpayPaymentId, "razorpay:signature+api");
    return { ok: true, message: "Payment received — thank you!" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Verification failed" };
  }
}

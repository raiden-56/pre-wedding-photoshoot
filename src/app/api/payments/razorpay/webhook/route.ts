import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/server/payments/razorpay";
import { markPaidFromProvider } from "@/server/payments/settle";

export const runtime = "nodejs";

/** Razorpay webhook (payment.captured / payment.failed). Configure the same secret in RAZORPAY_WEBHOOK_SECRET. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as { event: string; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number } } } };
  const entity = event.payload?.payment?.entity;
  if (!entity) return NextResponse.json({ ok: true });
  const payment = await db.payment.findUnique({ where: { razorpayOrderId: entity.order_id } });
  if (!payment) return NextResponse.json({ ok: true });
  if (event.event === "payment.captured" && payment.status !== "PAID" && entity.amount === payment.amount) {
    await markPaidFromProvider(payment.id, entity.id, "razorpay:webhook");
  } else if (event.event === "payment.failed" && payment.status === "PENDING") {
    await db.payment.update({ where: { id: payment.id }, data: { notes: `Last attempt failed (${entity.id})` } });
  }
  return NextResponse.json({ ok: true });
}

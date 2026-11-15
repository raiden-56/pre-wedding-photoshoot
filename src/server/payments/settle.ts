import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/server/activity";
import { notify, notifyStudio } from "@/server/notify";

/** Only called after provider verification (signature + API lookup, or signed webhook). Not a server action. */
export async function markPaidFromProvider(paymentId: string, providerPaymentId: string, via: string) {
  const payment = await db.payment.update({ where: { id: paymentId }, data: { status: "PAID", razorpayPaymentId: providerPaymentId, paidAt: new Date(), verifiedVia: via }, include: { booking: true, client: true } });
  await audit({ studioId: payment.studioId, action: "payment-verified", entity: "Payment", entityId: payment.id, meta: { via } });
  await notifyStudio(payment.studioId, { type: "PAYMENT_RECEIVED", title: `Payment received: ₹${(payment.amount / 100).toLocaleString("en-IN")}`, body: payment.booking.title, link: `/admin/bookings/${payment.bookingId}` });
  if (payment.client.userId) await notify({ userIds: [payment.client.userId], type: "PAYMENT_RECEIVED", title: "Payment received — thank you", body: payment.booking.title, link: "/dashboard/bookings" });
  revalidatePath("/dashboard/bookings");
  revalidatePath("/admin/payments");
}

import { CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { requireClientPage } from "@/lib/auth/session";
import { features } from "@/lib/env";
import { formatDate, formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/admin/status";
import { PayButton } from "@/components/pay-button";
import { getCoupleClient } from "../data";
import { NotLinked } from "../not-linked";

export const metadata = { title: "Bookings & payments" };

const METHOD: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank transfer", UPI: "UPI", CARD: "Card", RAZORPAY: "Online", OTHER: "Other" };

export default async function CoupleBookingsPage() {
  const user = await requireClientPage();
  const client = await getCoupleClient(user);
  if (!client) return <NotLinked />;
  const bookings = await db.booking.findMany({
    where: { clientId: client.id },
    orderBy: { eventDate: "asc" },
    include: { package: { select: { name: true } }, payments: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div>
      <h1 className="font-display mb-8 text-headline">Bookings &amp; payments</h1>
      {!bookings.length ? (
        <EmptyState icon={<CalendarDays />} title="No bookings yet" description="Once the studio confirms your booking, its dates and payments appear here." />
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => {
            const paid = b.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
            return (
              <article key={b.id} className="overflow-hidden rounded-xl border border-charcoal/10 bg-white">
                <header className="flex flex-col gap-3 border-b border-charcoal/10 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl">{b.title}</h2>
                      <StatusBadge kind="booking" value={b.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">{[formatDate(b.eventDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" }), b.location, b.package?.name].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="text-muted">Paid</p>
                    <p className="text-lg font-medium tabular-nums">
                      {formatMoney(paid)} <span className="text-sm font-normal text-muted">of {formatMoney(b.totalAmount)}</span>
                    </p>
                  </div>
                </header>
                {b.payments.length ? (
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted">
                      <tr>
                        <th className="px-5 py-3 font-normal">Payment</th>
                        <th className="hidden px-3 py-3 font-normal sm:table-cell">Method</th>
                        <th className="px-3 py-3 text-right font-normal">Amount</th>
                        <th className="px-5 py-3 text-right font-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/10 border-t border-charcoal/10">
                      {b.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-5 py-3">
                            {p.kind.charAt(0) + p.kind.slice(1).toLowerCase()}
                            <span className="block text-xs text-muted">{formatDate(p.paidAt ?? p.createdAt)}</span>
                          </td>
                          <td className="hidden px-3 py-3 text-muted sm:table-cell">{METHOD[p.method] ?? p.method}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatMoney(p.amount)}</td>
                          <td className="px-5 py-3 text-right">{p.status === "PENDING" && features.razorpay ? <PayButton paymentId={p.id} label="Pay now" /> : <StatusBadge kind="payment" value={p.status} />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-5 text-sm text-muted">No payments recorded yet.</p>
                )}
              </article>
            );
          })}
          {!features.razorpay && <p className="text-sm text-muted">Online payment isn’t switched on yet. Pay by UPI or bank transfer and the studio will confirm it here.</p>}
        </div>
      )}
    </div>
  );
}

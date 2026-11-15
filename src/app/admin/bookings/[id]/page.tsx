import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, MapPin, Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { requireStaffPage } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatMoney, whatsappLink } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { BookingDialog, PaymentDialog } from "@/components/admin/forms";
import { StatusBadge } from "@/components/admin/status";
import { ActionButton } from "@/components/admin/action-form";
import { generateInvoice, setBookingStatus } from "@/server/actions/admin";
import { MarkPaid } from "./mark-paid";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage();
  const { id } = await params;
  const booking = await db.booking.findFirst({
    where: { id, studioId: user.studioId },
    include: { client: true, package: true, payments: { orderBy: { createdAt: "desc" } }, invoices: { orderBy: { issuedAt: "desc" } }, photoshoots: true, inquiry: true },
  });
  if (!booking) notFound();
  const [clients, packages] = await Promise.all([
    db.client.findMany({ where: { studioId: user.studioId }, select: { id: true, partner1Name: true, partner2Name: true } }),
    db.package.findMany({ where: { studioId: user.studioId }, select: { id: true, name: true } }),
  ]);
  const paid = booking.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, booking.totalAmount - paid);
  const advanceOutstanding = Math.max(0, booking.advanceAmount - paid);
  const c = booking.client;

  return (
    <>
      <Link href="/admin/bookings?tab=bookings" className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted hover:text-charcoal">
        <ArrowLeft className="size-3.5" /> Bookings
      </Link>
      <PageHeader
        eyebrow={`${booking.shootType} · ${formatDate(booking.eventDate, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}`}
        title={booking.title}
        actions={
          <>
            <BookingDialog trigger={<Button variant="outline"><Pencil /> Edit</Button>} booking={booking} clients={clients.map((x) => ({ id: x.id, name: `${x.partner1Name} & ${x.partner2Name}` }))} packages={packages} />
            {booking.status === "PENDING" && <ActionButton action={setBookingStatus.bind(null, booking.id, "CONFIRMED")}>Confirm booking</ActionButton>}
            {booking.status === "CONFIRMED" && <ActionButton variant="outline" action={setBookingStatus.bind(null, booking.id, "COMPLETED")}>Mark completed</ActionButton>}
            {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && <ActionButton variant="ghost" action={setBookingStatus.bind(null, booking.id, "CANCELLED")} confirm="Cancel this booking?">Cancel</ActionButton>}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-px border border-line bg-line sm:grid-cols-4">
            {[
              ["Total", formatMoney(booking.totalAmount)],
              ["Received", formatMoney(paid)],
              ["Balance", formatMoney(balance)],
              ["Advance due", advanceOutstanding ? formatMoney(advanceOutstanding) : "Settled"],
            ].map(([k, v]) => (
              <div key={k} className="bg-white p-5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{k}</p>
                <p className="font-display mt-1 text-3xl tabular-nums">{v}</p>
              </div>
            ))}
          </div>

          <Panel title="Payment history" action={<PaymentDialog bookingId={booking.id} suggested={advanceOutstanding || balance} trigger={<Button size="sm"><Plus /> Record payment</Button>} />} bodyClassName="p-0">
            {booking.payments.length ? (
              <ul className="divide-y divide-line">
                {booking.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium tabular-nums">{formatMoney(p.amount)} <span className="text-xs font-normal text-muted">· {p.kind.toLowerCase()} · {p.method.replace("_", " ").toLowerCase()}</span></p>
                      <p className="text-xs text-muted">{p.paidAt ? `Paid ${formatDateTime(p.paidAt)}` : `Requested ${formatDate(p.createdAt)}`}{p.reference ? ` · ref ${p.reference}` : ""}{p.verifiedVia ? ` · verified via ${p.verifiedVia.split(":")[0]}` : ""}</p>
                    </div>
                    <StatusBadge kind="payment" value={p.status} />
                    {p.status === "PENDING" && <MarkPaid paymentId={p.id} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-muted">No payments yet. Record the advance once received, or create a payment request the couple can pay online{features.razorpay ? "" : " (Razorpay not configured)"}.</p>
            )}
          </Panel>

          <Panel title="Invoices" action={<ActionButton size="sm" variant="outline" action={generateInvoice.bind(null, booking.id)}><FileText /> Generate invoice</ActionButton>} bodyClassName="p-0">
            {booking.invoices.length ? (
              <ul className="divide-y divide-line">
                {booking.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span><strong>{inv.number}</strong> <span className="text-xs text-muted">· issued {formatDate(inv.issuedAt)}</span></span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{formatMoney(inv.total)}</span>
                      <Link href={`/admin/invoices/${inv.id}`} target="_blank" className="text-xs text-olive underline">View / print</Link>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-muted">No invoices yet.</p>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Details">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Status</dt><dd><StatusBadge kind="booking" value={booking.status} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Package</dt><dd className="text-right">{booking.package?.name ?? "Custom"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Location</dt><dd className="text-right">{booking.location ?? "TBC"}</dd></div>
              {booking.notes && <div><dt className="text-muted">Notes</dt><dd className="mt-1">{booking.notes}</dd></div>}
            </dl>
            {booking.location && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs text-olive underline">
                <MapPin className="size-3.5" /> Open in Google Maps
              </a>
            )}
          </Panel>
          <Panel title="Couple">
            <Link href={`/admin/clients/${c.id}`} className="font-display text-2xl hover:underline">{c.partner1Name} &amp; {c.partner2Name}</Link>
            <p className="mt-1 text-xs text-muted">{c.partner1Email} · {c.partner1Phone}</p>
            {c.partner1Phone && (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <a href={whatsappLink(`Hi ${c.partner1Name.split(" ")[0]}! A quick note about ${booking.title}.`, c.partner1Phone)} target="_blank" rel="noreferrer"><WhatsAppIcon className="size-4" /> WhatsApp</a>
              </Button>
            )}
          </Panel>
          <Panel title="Photoshoots">
            {booking.photoshoots.length ? booking.photoshoots.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1 text-sm">
                <span>{formatDate(s.date)} · {s.location}</span>
                <StatusBadge kind="shoot" value={s.status} />
              </div>
            )) : <p className="text-sm text-muted">None scheduled.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}

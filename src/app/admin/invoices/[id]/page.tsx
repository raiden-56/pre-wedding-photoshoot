import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/utils";
import { Logo } from "@/components/ui/misc";
import { PrintButton } from "./print-button";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage();
  const { id } = await params;
  const inv = await db.invoice.findFirst({ where: { id, studioId: user.studioId }, include: { studio: true, booking: { include: { client: true, payments: { where: { status: "PAID" } } } } } });
  if (!inv) notFound();
  const items = inv.items as { label: string; amount: number }[];
  const paid = inv.booking.payments.reduce((s, p) => s + p.amount, 0);
  const c = inv.booking.client;
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 shadow-sm print:shadow-none sm:p-14">
      <div className="mb-10 flex items-start justify-between">
        <Logo />
        <div className="text-right">
          <p className="font-display text-4xl">Invoice</p>
          <p className="text-sm text-muted">{inv.number}</p>
        </div>
      </div>
      <div className="grid gap-8 text-sm sm:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">From</p>
          <p className="font-medium">{inv.studio.name}</p>
          <p className="text-muted">{inv.studio.address}{inv.studio.city ? `, ${inv.studio.city}` : ""}</p>
          <p className="text-muted">{inv.studio.email} · {inv.studio.phone}</p>
          {inv.studio.gstNumber && <p className="text-muted">GSTIN {inv.studio.gstNumber}</p>}
        </div>
        <div className="sm:text-right">
          <p className="eyebrow mb-2">Billed to</p>
          <p className="font-medium">{c.partner1Name} &amp; {c.partner2Name}</p>
          <p className="text-muted">{c.partner1Email}</p>
          <p className="mt-3 text-muted">Issued {formatDate(inv.issuedAt)}{inv.dueAt ? ` · Due ${formatDate(inv.dueAt)}` : ""}</p>
        </div>
      </div>
      <table className="mt-10 w-full text-sm">
        <thead className="border-b border-charcoal/20 text-left text-[11px] uppercase tracking-[0.14em] text-muted"><tr><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-line"><td className="py-3">{it.label}</td><td className="py-3 text-right tabular-nums">{formatMoney(it.amount)}</td></tr>
          ))}
        </tbody>
        <tfoot className="text-sm">
          <tr><td className="pt-4 text-right text-muted">Subtotal</td><td className="pt-4 text-right tabular-nums">{formatMoney(inv.subtotal)}</td></tr>
          {inv.tax > 0 && <tr><td className="text-right text-muted">Tax</td><td className="text-right tabular-nums">{formatMoney(inv.tax)}</td></tr>}
          <tr><td className="pt-2 text-right font-medium">Total</td><td className="pt-2 text-right font-display text-2xl tabular-nums">{formatMoney(inv.total)}</td></tr>
          <tr><td className="text-right text-muted">Received</td><td className="text-right tabular-nums">{formatMoney(paid)}</td></tr>
          <tr><td className="text-right font-medium">Balance due</td><td className="text-right font-medium tabular-nums">{formatMoney(Math.max(0, inv.total - paid))}</td></tr>
        </tfoot>
      </table>
      <p className="mt-14 text-xs text-muted">Thank you for trusting us with your story.</p>
      <div className="mt-8 print:hidden"><PrintButton /></div>
    </div>
  );
}

import Link from "next/link";
import { BookHeart, CalendarDays, Inbox, Mail, Phone, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { formatDate, formatMoney, timeAgo, whatsappLink } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { BookingDialog, ConvertInquiryDialog, QuotationDialog } from "@/components/admin/forms";
import { StatusBadge } from "@/components/admin/status";
import { MonthCalendar, parseMonth } from "@/components/admin/month-calendar";
import { ActionButton } from "@/components/admin/action-form";
import { setInquiryStatus } from "@/server/actions/admin";

export const metadata = { title: "Bookings" };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; month?: string; inquiry?: string }> }) {
  const user = await requireStaffPage();
  const sp = await searchParams;
  const tab = sp.tab === "bookings" ? "bookings" : sp.tab === "calendar" ? "calendar" : "inquiries";
  const month = parseMonth(sp.month);
  const [inquiries, bookings, clients, packages] = await Promise.all([
    db.inquiry.findMany({ where: { studioId: user.studioId }, orderBy: { createdAt: "desc" }, take: 100, include: { package: { select: { name: true, price: true } }, quotations: { orderBy: { createdAt: "desc" }, take: 1 }, booking: { select: { id: true } } } }),
    db.booking.findMany({ where: { studioId: user.studioId }, orderBy: { eventDate: "asc" }, include: { client: true, package: { select: { name: true } }, payments: { select: { amount: true, status: true } } } }),
    db.client.findMany({ where: { studioId: user.studioId }, orderBy: { partner1Name: "asc" }, select: { id: true, partner1Name: true, partner2Name: true } }),
    db.package.findMany({ where: { studioId: user.studioId }, select: { id: true, name: true, price: true } }),
  ]);
  const clientOpts = clients.map((c) => ({ id: c.id, name: `${c.partner1Name} & ${c.partner2Name}` }));
  const openInquiries = inquiries.filter((i) => !["CONVERTED", "CLOSED"].includes(i.status));

  const tabs = [
    { key: "inquiries", label: "Inquiries", icon: Inbox, count: openInquiries.length },
    { key: "bookings", label: "Bookings", icon: BookHeart, count: bookings.length },
    { key: "calendar", label: "Calendar", icon: CalendarDays },
  ];

  return (
    <>
      <PageHeader eyebrow="Sales" title="Bookings" description="Inquiry → quotation → booking → payment → photoshoot → delivery." actions={<BookingDialog trigger={<Button><Plus /> New booking</Button>} clients={clientOpts} packages={packages} />} />
      <div className="mb-6 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/bookings?tab=${t.key}`} className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm ${tab === t.key ? "border-charcoal font-medium" : "border-transparent text-muted hover:text-charcoal"}`}>
            <t.icon className="size-4" /> {t.label}
            {t.count != null && <span className="rounded-full bg-ivory-deep px-1.5 text-[10px] tabular-nums">{t.count}</span>}
          </Link>
        ))}
      </div>

      {tab === "inquiries" &&
        (inquiries.length ? (
          <div className="space-y-3">
            {inquiries.map((i) => (
              <article key={i.id} id={i.id} className={`border bg-white p-5 ${sp.inquiry === i.id ? "border-olive ring-2 ring-olive/20" : "border-line"} ${["CONVERTED", "CLOSED"].includes(i.status) ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-2xl">{i.name}{i.partnerName ? ` & ${i.partnerName}` : ""}</h2>
                      <StatusBadge kind="inquiry" value={i.status} />
                    </div>
                    <p className="text-xs text-muted">Received {timeAgo(i.createdAt)} · {i.shootType} · {i.location ?? "Location open"} · {i.preferredDate ? formatDate(i.preferredDate) : "Date flexible"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="ghost"><a href={`mailto:${i.email}`}><Mail /> Email</a></Button>
                    <Button asChild size="sm" variant="ghost"><a href={`tel:${i.phone}`}><Phone /> Call</a></Button>
                    <Button asChild size="sm" variant="ghost"><a href={whatsappLink(`Hi ${i.name.split(" ")[0]}! Thank you for your ${i.shootType.toLowerCase()} inquiry.`, i.phone)} target="_blank" rel="noreferrer"><WhatsAppIcon className="size-4" /> WhatsApp</a></Button>
                  </div>
                </div>
                {i.message && <p className="mt-3 max-w-3xl border-l-2 border-champagne pl-3 text-sm text-ink/85">{i.message}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
                  <span>Package: <strong className="text-charcoal">{i.package?.name ?? "Undecided"}</strong></span>
                  <span>Budget: <strong className="text-charcoal">{i.budget ?? "—"}</strong></span>
                  {i.quotations[0] && <span>Latest quote: <strong className="text-charcoal">{formatMoney(i.quotations[0].total)}</strong> ({i.quotations[0].status.toLowerCase()})</span>}
                </div>
                {!["CONVERTED", "CLOSED"].includes(i.status) ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    {i.status === "NEW" && <ActionButton size="sm" variant="outline" action={setInquiryStatus.bind(null, i.id, "CONTACTED")}>Mark contacted</ActionButton>}
                    <QuotationDialog trigger={<Button size="sm" variant="outline">Send quotation</Button>} inquiryId={i.id} defaultItem={i.package ? { label: i.package.name, amount: i.package.price } : undefined} />
                    <ConvertInquiryDialog trigger={<Button size="sm">Confirm &amp; create booking</Button>} inquiry={i} packages={packages} />
                    <ActionButton size="sm" variant="ghost" action={setInquiryStatus.bind(null, i.id, "CLOSED")} confirm="Close this inquiry?">Close</ActionButton>
                  </div>
                ) : (
                  i.booking && <Link href={`/admin/bookings/${i.booking.id}`} className="mt-3 inline-block text-xs text-olive underline">View booking →</Link>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Inbox />} title="No inquiries yet" description="Inquiries from the website contact form land here." />
        ))}

      {tab === "bookings" &&
        (bookings.length ? (
          <div className="overflow-x-auto border border-line bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-line text-left text-[11px] uppercase tracking-[0.14em] text-muted">
                <tr><th className="px-5 py-3 font-medium">Booking</th><th className="px-3 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Paid</th><th className="px-3 py-3 font-medium">Balance</th><th className="px-3 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.map((b) => {
                  const paid = b.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
                  return (
                    <tr key={b.id} className="hover:bg-ivory/60">
                      <td className="px-5 py-3"><Link href={`/admin/bookings/${b.id}`} className="font-medium hover:underline">{b.title}</Link><p className="text-xs text-muted">{b.package?.name ?? "Custom"} · {b.location ?? ""}</p></td>
                      <td className="px-3 py-3 text-xs">{formatDate(b.eventDate)}</td>
                      <td className="px-3 py-3 text-xs tabular-nums">{formatMoney(paid)}</td>
                      <td className="px-3 py-3 text-xs tabular-nums">{formatMoney(Math.max(0, b.totalAmount - paid))}</td>
                      <td className="px-3 py-3"><StatusBadge kind="booking" value={b.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<BookHeart />} title="No bookings yet" />
        ))}

      {tab === "calendar" && (
        <MonthCalendar
          month={month}
          basePath="/admin/bookings"
          query="tab=calendar"
          events={bookings.map((b) => ({ id: b.id, date: b.eventDate, title: b.title, href: `/admin/bookings/${b.id}`, tone: b.status === "CONFIRMED" ? "olive" : b.status === "PENDING" ? "champagne" : b.status === "CANCELLED" ? "taupe" : "charcoal" }))}
        />
      )}
    </>
  );
}

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, Camera, CircleDollarSign, Clock, Images, Inbox, Users, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media";
import { formatDate, formatDateTime, formatMoney, timeAgo } from "@/lib/utils";
import { EmptyState, PageHeader, Panel } from "@/components/ui/misc";
import { BarChart } from "@/components/admin/bar-chart";
import { StatusBadge } from "@/components/admin/status";
import { ACTIVITY_LABELS } from "@/server/activity";

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireStaffPage();
  const sid = user.studioId;
  const { welcome } = await searchParams;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [clients, activeShoots, upcomingBookings, awaiting, completedGalleries, pending, paid, payments, bookings, recentClients, upcomingShoots, activity, newInquiries] = await Promise.all([
    db.client.count({ where: { studioId: sid } }),
    db.photoshoot.count({ where: { studioId: sid, status: { in: ["CONFIRMED", "UPCOMING", "IN_PROGRESS", "EDITING", "READY_FOR_REVIEW"] } } }),
    db.booking.count({ where: { studioId: sid, eventDate: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } } }),
    db.photoshoot.count({ where: { studioId: sid, status: { in: ["EDITING", "READY_FOR_REVIEW"] } } }),
    db.gallery.count({ where: { studioId: sid, status: "PUBLISHED" } }),
    db.payment.aggregate({ where: { studioId: sid, status: "PENDING" }, _sum: { amount: true }, _count: true }),
    db.payment.aggregate({ where: { studioId: sid, status: "PAID" }, _sum: { amount: true } }),
    db.payment.findMany({ where: { studioId: sid, status: "PAID", paidAt: { gte: sixMonthsAgo } }, select: { amount: true, paidAt: true } }),
    db.booking.findMany({ where: { studioId: sid, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    db.client.findMany({ where: { studioId: sid }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.photoshoot.findMany({ where: { studioId: sid, date: { gte: now } }, orderBy: { date: "asc" }, take: 5, include: { photographer: { select: { name: true } } } }),
    db.activityLog.findMany({ where: { studioId: sid }, orderBy: { createdAt: "desc" }, take: 8, include: { gallery: { select: { title: true, id: true } } } }),
    db.inquiry.findMany({ where: { studioId: sid, status: "NEW" }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const label = (d: Date) => d.toLocaleString("en-IN", { month: "short" });
  const revenue = months.map((m) => ({
    label: label(m),
    hint: m.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    value: payments.filter((p) => p.paidAt && p.paidAt.getMonth() === m.getMonth() && p.paidAt.getFullYear() === m.getFullYear()).reduce((s, p) => s + p.amount, 0),
  }));
  const bookingSeries = months.map((m) => ({
    label: label(m),
    hint: `Bookings created in ${m.toLocaleString("en-IN", { month: "long" })}`,
    value: bookings.filter((b) => b.createdAt.getMonth() === m.getMonth() && b.createdAt.getFullYear() === m.getFullYear()).length,
  }));

  const covers = await db.gallery.findMany({ where: { studioId: sid }, orderBy: { updatedAt: "desc" }, take: 3, include: { coverPhoto: true, _count: { select: { photos: true } } } });

  const stats = [
    { label: "Total clients", value: clients, icon: Users, href: "/admin/clients" },
    { label: "Active photoshoots", value: activeShoots, icon: Camera, href: "/admin/photoshoots" },
    { label: "Upcoming bookings", value: upcomingBookings, icon: CalendarDays, href: "/admin/bookings" },
    { label: "Awaiting delivery", value: awaiting, icon: Clock, href: "/admin/photoshoots?status=EDITING" },
    { label: "Delivered galleries", value: completedGalleries, icon: Images, href: "/admin/galleries" },
    { label: "Pending payments", value: formatMoney(pending._sum.amount ?? 0), sub: `${pending._count} open`, icon: Wallet, href: "/admin/payments?status=PENDING" },
    { label: "Total revenue", value: formatMoney(paid._sum.amount ?? 0), sub: "verified payments", icon: CircleDollarSign, href: "/admin/payments" },
  ];

  return (
    <>
      <PageHeader eyebrow={formatDate(now, { weekday: "long", day: "numeric", month: "long" })} title={`Good ${now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`} description={welcome ? "Your studio is ready. Start by adding a client, then create a gallery and upload photographs." : "Here’s what’s happening across your studio."} />

      <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4 xl:grid-cols-7">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group bg-white p-4 transition hover:bg-ivory sm:p-5">
            <s.icon className="size-4 text-olive" strokeWidth={1.6} />
            <p className="font-display mt-3 text-3xl leading-none tabular-nums">{s.value}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted">{s.label}</p>
            {s.sub && <p className="text-[11px] text-taupe">{s.sub}</p>}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Revenue — verified payments, last 6 months" className="xl:col-span-2">
          <BarChart title="Monthly revenue" data={revenue} format={(n) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}L` : formatMoney(n).replace(/\.00$/, ""))} />
        </Panel>
        <Panel title="New bookings per month">
          <BarChart title="Bookings per month" data={bookingSeries} format={(n) => String(Math.round(n))} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Upcoming photoshoots" action={<Link href="/admin/photoshoots?view=calendar" className="text-xs text-muted hover:text-charcoal">Calendar</Link>} bodyClassName="p-0">
          {upcomingShoots.length ? (
            <ul className="divide-y divide-line">
              {upcomingShoots.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-11 shrink-0 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted">{s.date.toLocaleString("en-IN", { month: "short" })}</p>
                    <p className="font-display text-2xl leading-none">{s.date.getDate()}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted">{s.location} · {s.photographer?.name ?? "Unassigned"}</p>
                  </div>
                  <StatusBadge kind="shoot" value={s.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-muted">No upcoming shoots.</p>
          )}
        </Panel>
        <Panel title="Latest gallery activity" bodyClassName="p-0">
          {activity.length ? (
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id} className="px-5 py-3 text-sm">
                  <span className="font-medium">{a.actorLabel}</span> <span className="text-muted">{ACTIVITY_LABELS[a.action] ?? a.action.toLowerCase()}</span>
                  {a.gallery && (
                    <Link href={`/admin/galleries/${a.gallery.id}?tab=activity`} className="block truncate text-xs text-olive hover:underline">
                      {a.gallery.title}
                    </Link>
                  )}
                  <span className="text-[11px] text-taupe">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-muted">No activity yet.</p>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="New inquiries" action={<Link href="/admin/bookings" className="text-xs text-muted hover:text-charcoal">All</Link>} bodyClassName="p-0">
            {newInquiries.length ? (
              <ul className="divide-y divide-line">
                {newInquiries.map((i) => (
                  <li key={i.id}>
                    <Link href={`/admin/bookings?inquiry=${i.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-ivory">
                      <Inbox className="mt-0.5 size-4 text-olive" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{i.name}{i.partnerName ? ` & ${i.partnerName}` : ""}</p>
                        <p className="truncate text-xs text-muted">{i.shootType} · {i.location ?? "—"} · {timeAgo(i.createdAt)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-muted">Inbox zero. Lovely.</p>
            )}
          </Panel>
          <Panel title="Recent clients" bodyClassName="p-0">
            {recentClients.length ? (
              <ul className="divide-y divide-line">
                {recentClients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-ivory">
                      <span className="truncate">{c.partner1Name.split(" ")[0]} &amp; {c.partner2Name.split(" ")[0]}</span>
                      <span className="text-xs text-muted">{formatDate(c.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No clients yet" className="m-5" />
            )}
          </Panel>
        </div>
      </div>

      {covers.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {covers.map((g) => (
            <Link key={g.id} href={`/admin/galleries/${g.id}`} className="group relative block aspect-[16/10] overflow-hidden bg-charcoal">
              {g.coverPhoto && <Image src={mediaUrl("p", g.coverPhoto.id, "medium")} alt="" fill unoptimized sizes="33vw" className="object-cover opacity-80 transition duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-ivory">
                <p className="font-display text-2xl leading-tight">{g.coupleNames}</p>
                <p className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ivory/70">
                  {g._count.photos} files · {g.status.toLowerCase()} <ArrowUpRight className="size-3.5" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-8 text-[11px] text-taupe">Updated {formatDateTime(now)}</p>
    </>
  );
}

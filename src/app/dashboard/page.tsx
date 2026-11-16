import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import { db } from "@/lib/db";
import { requireClientPage } from "@/lib/auth/session";
import { formatDate, formatMoney, timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import { getCoupleClient, getCoupleGalleries } from "./data";
import { GalleryCard } from "./gallery-card";
import { NotLinked } from "./not-linked";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const user = await requireClientPage();
  const client = await getCoupleClient(user);
  if (!client) return <NotLinked />;

  const [galleries, nextShoot, bookings, notifications] = await Promise.all([
    getCoupleGalleries(client.id),
    db.photoshoot.findFirst({ where: { clientId: client.id, date: { gte: new Date() }, status: { in: ["CONFIRMED", "UPCOMING"] } }, orderBy: { date: "asc" } }),
    db.booking.findMany({ where: { clientId: client.id, status: { not: "CANCELLED" } }, include: { payments: { where: { status: "PAID" }, select: { amount: true } } } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const total = bookings.reduce((s, b) => s + b.totalAmount, 0);
  const paid = bookings.reduce((s, b) => s + b.payments.reduce((x, p) => x + p.amount, 0), 0);

  return (
    <div className="space-y-12">
      <div>
        <p className="eyebrow mb-2">{client.partner1Name.split(" ")[0]} &amp; {client.partner2Name.split(" ")[0]}</p>
        <h1 className="font-display text-headline">Your wedding photography</h1>
      </div>

      <section className="grid gap-px overflow-hidden rounded-xl border border-charcoal/10 bg-charcoal/10 sm:grid-cols-3">
        <Stat label="Next shoot" value={nextShoot ? formatDate(nextShoot.date, { day: "numeric", month: "long" }) : "None scheduled"} hint={nextShoot ? [nextShoot.title, nextShoot.location].filter(Boolean).join(" · ") : undefined} />
        <Stat label="Paid so far" value={formatMoney(paid)} hint={total ? `of ${formatMoney(total)} across ${bookings.length} booking${bookings.length === 1 ? "" : "s"}` : undefined} />
        <Stat label="Balance due" value={formatMoney(Math.max(0, total - paid))} hint={<Link href="/dashboard/bookings" className="underline-offset-2 hover:underline">See bookings and payments</Link>} />
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl">Your galleries</h2>
          {galleries.length > 2 && (
            <Link href="/dashboard/galleries" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-charcoal">
              All galleries <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
        {galleries.length ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {galleries.slice(0, 2).map((g) => (
              <GalleryCard key={g.id} g={g} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Images />} title="Your gallery is on its way" description="We’ll send you a message the moment your photographs are ready to view." />
        )}
      </section>

      {notifications.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-3xl">Recent updates</h2>
          <ul className="divide-y divide-charcoal/10 rounded-xl border border-charcoal/10 bg-white">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-4 px-5 py-4 text-sm">
                <div className="min-w-0">
                  {n.link ? (
                    <Link href={n.link} className="font-medium hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    <p className="font-medium">{n.title}</p>
                  )}
                  {n.body && <p className="mt-0.5 truncate text-muted">{n.body}</p>}
                </div>
                <time className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="bg-white px-6 py-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}


import Link from "next/link";
import type { ShootStatus } from "@prisma/client";
import { Camera, LayoutList, CalendarDays, MapPin, Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { SHOOT_STATUSES } from "@/lib/validation";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { PhotoshootDialog } from "@/components/admin/forms";
import { FilterTabs } from "@/components/admin/list-controls";
import { MonthCalendar, parseMonth } from "@/components/admin/month-calendar";
import { SHOOT_STATUS_LABEL } from "@/components/admin/status";
import { ShootStatusSelect } from "./status-select";

export const metadata = { title: "Photoshoots" };

export default async function PhotoshootsPage({ searchParams }: { searchParams: Promise<{ status?: string; view?: string; month?: string }> }) {
  const user = await requireStaffPage();
  const sp = await searchParams;
  const status = SHOOT_STATUSES.includes(sp.status as ShootStatus) ? (sp.status as ShootStatus) : undefined;
  const view = sp.view === "calendar" ? "calendar" : "list";
  const month = parseMonth(sp.month);

  const [shoots, counts, clients, team, packages] = await Promise.all([
    db.photoshoot.findMany({
      where: { studioId: user.studioId, ...(status ? { status } : {}), ...(view === "calendar" ? { date: { gte: new Date(month.getFullYear(), month.getMonth() - 1, 20), lt: new Date(month.getFullYear(), month.getMonth() + 1, 10) } } : {}) },
      orderBy: { date: view === "calendar" ? "asc" : "desc" },
      include: { client: true, photographer: { select: { name: true } }, package: { select: { name: true } }, galleries: { select: { id: true } } },
      take: 300,
    }),
    db.photoshoot.groupBy({ by: ["status"], where: { studioId: user.studioId }, _count: true }),
    db.client.findMany({ where: { studioId: user.studioId }, orderBy: { partner1Name: "asc" }, select: { id: true, partner1Name: true, partner2Name: true } }),
    db.user.findMany({ where: { studioId: user.studioId, role: { in: ["ADMIN", "PHOTOGRAPHER"] } }, select: { id: true, name: true } }),
    db.package.findMany({ where: { studioId: user.studioId }, select: { id: true, name: true } }),
  ]);
  const clientOpts = clients.map((c) => ({ id: c.id, name: `${c.partner1Name} & ${c.partner2Name}` }));
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const q = new URLSearchParams({ view, ...(status ? { status } : {}) }).toString();

  return (
    <>
      <PageHeader
        eyebrow="Studio"
        title="Photoshoots"
        description="Every session from first confirmation to final delivery."
        actions={<PhotoshootDialog trigger={<Button><Plus /> Schedule shoot</Button>} clients={clientOpts} photographers={team} packages={packages} />}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs current={status} options={[{ value: "", label: "All", count: counts.reduce((s, c) => s + c._count, 0) }, ...SHOOT_STATUSES.map((s) => ({ value: s, label: SHOOT_STATUS_LABEL[s], count: countOf(s) }))]} />
        <div className="flex shrink-0 border border-line bg-white">
          <Link href={`/admin/photoshoots?${new URLSearchParams({ ...(status ? { status } : {}), view: "list" })}`} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${view === "list" ? "bg-charcoal text-ivory" : ""}`}><LayoutList className="size-3.5" /> List</Link>
          <Link href={`/admin/photoshoots?${new URLSearchParams({ ...(status ? { status } : {}), view: "calendar" })}`} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${view === "calendar" ? "bg-charcoal text-ivory" : ""}`}><CalendarDays className="size-3.5" /> Calendar</Link>
        </div>
      </div>

      {view === "calendar" ? (
        <MonthCalendar
          month={month}
          basePath="/admin/photoshoots"
          query={q}
          events={shoots.map((s) => ({ id: s.id, date: s.date, title: s.title, href: `/admin/clients/${s.clientId}`, tone: ["DELIVERED", "COMPLETED"].includes(s.status) ? "taupe" : s.status === "EDITING" || s.status === "READY_FOR_REVIEW" ? "champagne" : "olive" }))}
        />
      ) : shoots.length ? (
        <div className="divide-y divide-line border border-line bg-white">
          {shoots.map((s) => (
            <div key={s.id} className="grid items-center gap-3 px-5 py-4 md:grid-cols-[72px_1fr_180px_170px_auto]">
              <div className="flex items-baseline gap-2 md:block md:text-center">
                <p className="font-display text-3xl leading-none">{s.date.getDate()}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted">{s.date.toLocaleString("en-IN", { month: "short", year: "2-digit" })}</p>
              </div>
              <div className="min-w-0">
                <Link href={`/admin/clients/${s.clientId}`} className="font-medium hover:underline">{s.title}</Link>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>{s.type}</span>·<span className="inline-flex items-center gap-1"><MapPin className="size-3" />{s.location ?? "TBC"}</span>·<span>{s.date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                </p>
              </div>
              <p className="text-xs text-muted">{s.photographer?.name ?? "Unassigned"}<br />{s.package?.name ?? ""}</p>
              <ShootStatusSelect id={s.id} value={s.status} />
              <div className="flex gap-1">
                {s.galleries[0] ? (
                  <Button asChild size="sm" variant="ghost"><Link href={`/admin/galleries/${s.galleries[0].id}`}>Gallery</Link></Button>
                ) : (
                  <Button asChild size="sm" variant="ghost"><Link href={`/admin/galleries?new=1&shoot=${s.id}`}>Create gallery</Link></Button>
                )}
                <PhotoshootDialog trigger={<Button size="icon" variant="ghost" aria-label="Edit"><Pencil /></Button>} shoot={s} clients={clientOpts} photographers={team} packages={packages} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Camera />} title="No photoshoots here" description={status ? "Nothing with this status right now." : "Schedule your first session."} />
      )}
      <p className="mt-4 text-xs text-muted">Showing {shoots.length} · dates as {formatDate(new Date(), { timeZoneName: "short" })}</p>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { formatDate, formatMoney, whatsappLink } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { ClientDialog } from "@/components/admin/forms";
import { StatusBadge } from "@/components/admin/status";
import { ActionButton } from "@/components/admin/action-form";
import { deleteClient } from "@/server/actions/admin";
import { ClientNotes, PortalInvite } from "./client-tools";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage();
  const { id } = await params;
  const client = await db.client.findFirst({
    where: { id, studioId: user.studioId },
    include: {
      user: { select: { email: true, lastLoginAt: true } },
      bookings: { orderBy: { eventDate: "desc" }, include: { package: { select: { name: true } }, payments: true } },
      photoshoots: { orderBy: { date: "desc" } },
      galleries: { orderBy: { createdAt: "desc" }, include: { _count: { select: { photos: true } } } },
      moments: { orderBy: { order: "asc" } },
    },
  });
  if (!client) notFound();
  const paid = client.bookings.flatMap((b) => b.payments).filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const total = client.bookings.filter((b) => b.status !== "CANCELLED").reduce((s, b) => s + b.totalAmount, 0);

  return (
    <>
      <Link href="/admin/clients" className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted hover:text-charcoal">
        <ArrowLeft className="size-3.5" /> Clients
      </Link>
      <PageHeader
        eyebrow={client.weddingDate ? `Wedding · ${formatDate(client.weddingDate, { day: "numeric", month: "long", year: "numeric" })}` : "Client"}
        title={`${client.partner1Name.split(" ")[0]} & ${client.partner2Name.split(" ")[0]}`}
        description={[client.city, client.source && `via ${client.source}`].filter(Boolean).join(" · ")}
        actions={
          <>
            <ClientDialog client={client} trigger={<Button variant="outline"><Pencil /> Edit</Button>} />
            {user.role === "ADMIN" && <ActionButton variant="ghost" action={deleteClient.bind(null, client.id)} confirm="Delete this client? Bookings and payments will be removed. Galleries must be archived first.">Delete</ActionButton>}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {[
              { name: client.partner1Name, email: client.partner1Email, phone: client.partner1Phone },
              { name: client.partner2Name, email: client.partner2Email, phone: client.partner2Phone },
            ].map((p, i) => (
              <div key={i} className="bg-white p-5">
                <p className="eyebrow">Partner {i + 1}</p>
                <p className="font-display mt-2 text-3xl">{p.name}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted">
                  {p.email && <li className="flex items-center gap-2"><Mail className="size-3.5" /><a href={`mailto:${p.email}`} className="hover:text-charcoal">{p.email}</a></li>}
                  {p.phone && (
                    <li className="flex items-center gap-2">
                      <Phone className="size-3.5" />
                      <a href={`tel:${p.phone}`} className="hover:text-charcoal">{p.phone}</a>
                      <a href={whatsappLink(`Hi ${p.name.split(" ")[0]}!`, p.phone)} target="_blank" rel="noreferrer" className="ml-1 text-olive" aria-label="WhatsApp"><WhatsAppIcon className="size-4" /></a>
                    </li>
                  )}
                  {!p.email && !p.phone && <li>No contact details</li>}
                </ul>
              </div>
            ))}
          </div>

          <Panel title="Bookings & payments" bodyClassName="p-0">
            {client.bookings.length ? (
              <ul className="divide-y divide-line">
                {client.bookings.map((b) => {
                  const bp = b.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
                  return (
                    <li key={b.id}>
                      <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-ivory">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{b.title}</p>
                          <p className="text-xs text-muted">{formatDate(b.eventDate)} · {b.package?.name ?? "Custom"}</p>
                        </div>
                        <p className="text-xs tabular-nums text-muted">{formatMoney(bp)} / {formatMoney(b.totalAmount)}</p>
                        <StatusBadge kind="booking" value={b.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-5 text-sm text-muted">No bookings yet.</p>
            )}
          </Panel>

          <Panel title="Photography journey" bodyClassName="p-0">
            <ol className="relative ml-6 border-l border-line py-3">
              {client.photoshoots.map((s) => (
                <li key={s.id} className="relative py-3 pl-6 pr-5">
                  <span className="absolute -left-[5px] top-5 size-2.5 rounded-full bg-olive" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{s.title}</p>
                    <StatusBadge kind="shoot" value={s.status} />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted"><MapPin className="size-3" />{s.location ?? "TBC"} · {formatDate(s.date)}</p>
                </li>
              ))}
              {client.galleries.map((g) => (
                <li key={g.id} className="relative py-3 pl-6 pr-5">
                  <span className="absolute -left-[5px] top-5 size-2.5 rounded-full bg-champagne-deep" />
                  <Link href={`/admin/galleries/${g.id}`} className="flex flex-wrap items-center justify-between gap-2 hover:underline">
                    <span className="text-sm font-medium">Gallery · {g.title}</span>
                    <StatusBadge kind="gallery" value={g.status} />
                  </Link>
                  <p className="text-xs text-muted">{g._count.photos} files · /gallery/{g.slug}</p>
                </li>
              ))}
              {!client.photoshoots.length && !client.galleries.length && <li className="pl-6 text-sm text-muted">Nothing scheduled yet.</li>}
            </ol>
          </Panel>

          {client.moments.length > 0 && (
            <Panel title="Their love story (added by the couple)">
              <ol className="grid gap-4 sm:grid-cols-3">
                {client.moments.map((m) => (
                  <li key={m.id} className="border-l-2 border-champagne pl-3">
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted">{formatDate(m.date)}</p>
                    {m.description && <p className="mt-1 text-xs">{m.description}</p>}
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Payments">
            <p className="font-display text-4xl tabular-nums">{formatMoney(paid)}</p>
            <p className="text-xs text-muted">received of {formatMoney(total)} booked</p>
            <div className="mt-3 h-1.5 bg-ivory-deep"><div className="h-full bg-olive" style={{ width: `${total ? Math.min(100, (paid / total) * 100) : 0}%` }} /></div>
            <p className="mt-2 text-xs text-muted">Outstanding {formatMoney(Math.max(0, total - paid))}</p>
          </Panel>
          <Panel title="Client portal">
            <PortalInvite clientId={client.id} active={!!client.userId} email={client.user?.email ?? client.partner1Email ?? client.partner2Email} lastLogin={client.user?.lastLoginAt ? formatDate(client.user.lastLoginAt) : null} />
          </Panel>
          <Panel title="Private notes">
            <ClientNotes clientId={client.id} initial={client.notes ?? ""} />
          </Panel>
        </div>
      </div>
    </>
  );
}

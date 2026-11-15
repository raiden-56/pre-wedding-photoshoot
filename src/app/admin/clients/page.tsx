import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { formatDate, initials } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "@/components/admin/forms";
import { Pagination, SearchBox } from "@/components/admin/list-controls";

export const metadata = { title: "Clients" };
const PER_PAGE = 15;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireStaffPage();
  const { q, page: p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const where: Prisma.ClientWhereInput = {
    studioId: user.studioId,
    ...(q
      ? { OR: ["partner1Name", "partner2Name", "partner1Email", "partner2Email", "partner1Phone", "city"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) }
      : {}),
  };
  const [total, clients] = await Promise.all([
    db.client.count({ where }),
    db.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { bookings: true, galleries: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Studio" title="Clients" description="Every couple, both partners, and their whole photography journey." actions={<ClientDialog trigger={<Button><Plus /> Add couple</Button>} />} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox placeholder="Search names, email, phone, city" />
        <p className="text-xs text-muted">{total} client{total === 1 ? "" : "s"}</p>
      </div>
      {clients.length ? (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Couple</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Wedding</th>
                <th className="px-3 py-3 font-medium">Bookings</th>
                <th className="px-3 py-3 font-medium">Galleries</th>
                <th className="px-3 py-3 font-medium">Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-ivory/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/clients/${c.id}`} className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-champagne/70 text-[11px] font-semibold">{initials(`${c.partner1Name} ${c.partner2Name}`)}</span>
                      <span>
                        <span className="block font-medium">{c.partner1Name} &amp; {c.partner2Name}</span>
                        <span className="text-xs text-muted">{c.city ?? "—"} · added {formatDate(c.createdAt)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {c.partner1Email ?? "—"}
                    <br />
                    {c.partner1Phone ?? ""}
                  </td>
                  <td className="px-3 py-3 text-xs">{formatDate(c.weddingDate)}</td>
                  <td className="px-3 py-3 tabular-nums">{c._count.bookings}</td>
                  <td className="px-3 py-3 tabular-nums">{c._count.galleries}</td>
                  <td className="px-3 py-3 text-xs">{c.userId ? <span className="text-success">Active</span> : <span className="text-muted">Not invited</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<Users />} title={q ? "No matches" : "No clients yet"} description={q ? "Try a different name or email." : "Add your first couple to start planning shoots and galleries."} />
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}

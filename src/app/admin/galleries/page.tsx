import Link from "next/link";
import type { GalleryStatus } from "@prisma/client";
import { Images, Lock, Link2, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { FilterTabs, SearchBox } from "@/components/admin/list-controls";
import { StatusBadge } from "@/components/admin/status";
import { CreateGalleryDialog } from "./create-gallery";

export const metadata = { title: "Galleries" };

export default async function GalleriesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; new?: string; shoot?: string }> }) {
  const user = await requireStaffPage();
  const sp = await searchParams;
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(sp.status ?? "") ? (sp.status as GalleryStatus) : undefined;
  const [galleries, counts, clients, shoots] = await Promise.all([
    db.gallery.findMany({
      where: { studioId: user.studioId, ...(status ? { status } : { status: { not: "ARCHIVED" } }), ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { coupleNames: { contains: sp.q, mode: "insensitive" } }, { slug: { contains: sp.q } }] } : {}) },
      orderBy: { updatedAt: "desc" },
      include: { coverPhoto: { select: { id: true, status: true } }, _count: { select: { photos: true, albums: true, invitations: true } }, guestUploads: { where: { status: "PENDING", size: { gt: 0 } }, select: { id: true } } },
    }),
    db.gallery.groupBy({ by: ["status"], where: { studioId: user.studioId }, _count: true }),
    db.client.findMany({ where: { studioId: user.studioId }, select: { id: true, partner1Name: true, partner2Name: true } }),
    db.photoshoot.findMany({ where: { studioId: user.studioId }, orderBy: { date: "desc" }, select: { id: true, title: true, clientId: true, location: true, date: true, type: true } }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count ?? 0;
  const presetShoot = shoots.find((s) => s.id === sp.shoot);

  return (
    <>
      <PageHeader
        eyebrow="Delivery"
        title="Galleries"
        description="Private, personalised galleries for every couple."
        actions={<CreateGalleryDialog defaultOpen={sp.new === "1"} preset={presetShoot ? { ...presetShoot, date: presetShoot.date.toISOString() } : undefined} clients={clients.map((x) => ({ id: x.id, name: `${x.partner1Name.split(" ")[0]} & ${x.partner2Name.split(" ")[0]}` }))} shoots={shoots.map((s) => ({ id: s.id, name: s.title }))} trigger={<Button><Plus /> New gallery</Button>} />}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs current={status} options={[{ value: "", label: "Active", count: c("DRAFT") + c("PUBLISHED") }, { value: "PUBLISHED", label: "Published", count: c("PUBLISHED") }, { value: "DRAFT", label: "Drafts", count: c("DRAFT") }, { value: "ARCHIVED", label: "Archived", count: c("ARCHIVED") }]} />
        <SearchBox placeholder="Search galleries" />
      </div>
      {galleries.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {galleries.map((g) => (
            <Link key={g.id} href={`/admin/galleries/${g.id}`} className="group border border-line bg-white transition hover:shadow-lg">
              <div className="relative aspect-[16/10] overflow-hidden bg-ivory-deep">
                {g.coverPhoto?.status === "READY" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl("p", g.coverPhoto.id, "medium")} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center text-taupe"><Images className="size-8" /></div>
                )}
                <span className="absolute left-3 top-3"><StatusBadge kind="gallery" value={g.status} /></span>
                {g.guestUploads.length > 0 && <span className="absolute right-3 top-3 rounded-full bg-charcoal px-2 py-0.5 text-[10px] text-ivory">{g.guestUploads.length} to review</span>}
              </div>
              <div className="p-4">
                <p className="font-display text-2xl leading-tight">{g.coupleNames}</p>
                <p className="truncate text-xs text-muted">{g.title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                  <span className="flex items-center gap-1"><Images className="size-3" />{g._count.photos} files · {g._count.albums} albums</span>
                  <span className="flex items-center gap-1"><Users className="size-3" />{g._count.invitations} invites</span>
                  <span className="flex items-center gap-1">{g.visibility === "PASSWORD" ? <Lock className="size-3" /> : <Link2 className="size-3" />}{g.visibility.toLowerCase()}</span>
                  <span>{formatDate(g.shootDate ?? g.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Images />} title="No galleries here" description="Create a gallery, upload photographs and publish it to the couple." />
      )}
    </>
  );
}

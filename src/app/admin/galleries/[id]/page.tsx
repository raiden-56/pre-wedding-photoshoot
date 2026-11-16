import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Heart, Images, MessageSquare, UserPlus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media";
import { formatDate, timeAgo, toInputDate } from "@/lib/utils";
import { DEMO } from "@/lib/demo";
import { ACTIVITY_LABELS } from "@/server/activity";
import { StatusBadge } from "@/components/admin/status";
import { Badge, EmptyState, Panel } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/gallery/share-dialog";
import { PhotosManager } from "./photos-manager";
import { ClientTabs, TabNav } from "./client-tabs";
import { AlbumDesignReview, CommentThread, CopyFilenames, DangerZone, DetailsForm, GuestModeration, SettingsForm, StatusActions } from "./panels";

const TABS = [
  ["photos", "Photos"],
  ["selections", "Selections"],
  ["comments", "Comments"],
  ["guests", "Guest uploads"],
  ["albums", "Album designs"],
  ["sharing", "Sharing"],
  ["settings", "Settings"],
  ["activity", "Activity"],
] as const;
type Tab = (typeof TABS)[number][0];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await db.gallery.findUnique({ where: { id }, select: { coupleNames: true } });
  return { title: g ? `${g.coupleNames} · Gallery` : "Gallery" };
}

export default async function GalleryAdminPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requireStaffPage();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.some(([t]) => t === sp.tab) ? (sp.tab as Tab) : "photos";

  const gallery = await db.gallery.findFirst({
    where: { id, studioId: user.studioId },
    include: { settings: true, client: { select: { id: true, partner1Name: true, partner2Name: true, userId: true } }, albums: { orderBy: { order: "asc" }, include: { _count: { select: { photos: true } } } } },
  });
  if (!gallery) notFound();

  const [photoCount, favCount, openComments, pendingGuests, downloads, submitted, invitations] = await Promise.all([
    db.photo.count({ where: { galleryId: id } }),
    db.favorite.count({ where: { list: { galleryId: id } } }),
    db.comment.count({ where: { galleryId: id, parentId: null, resolvedAt: null, fromStudio: false } }),
    db.guestUpload.count({ where: { galleryId: id, status: "PENDING", size: { gt: 0 } } }),
    db.downloadRecord.count({ where: { galleryId: id } }),
    db.favoriteList.count({ where: { galleryId: id, submittedAt: { not: null } } }),
    db.invitation.count({ where: { galleryId: id, revokedAt: null } }),
  ]);

  const cover = gallery.coverPhotoId ? mediaUrl("p", gallery.coverPhotoId, "large") : null;
  const counts: Partial<Record<Tab, number>> = { comments: openComments, guests: pendingGuests, selections: submitted };

  const tabDefs = TABS.map(([t, label]) => ({ id: t, label, count: counts[t] }));
  const pane = async (t: Tab) => {
    switch (t) {
      case "photos":
        return <PhotosTab galleryId={gallery.id} coverId={gallery.coverPhotoId} albums={gallery.albums.map((a) => ({ id: a.id, title: a.title, description: a.description, count: a._count.photos }))} />;
      case "selections":
        return <SelectionsTab galleryId={gallery.id} />;
      case "comments":
        return <CommentsTab galleryId={gallery.id} />;
      case "guests":
        return <GuestsTab galleryId={gallery.id} enabled={!!gallery.settings?.guestUploadsEnabled} />;
      case "albums":
        return <AlbumDesignsTab galleryId={gallery.id} />;
      case "sharing":
        return <SharingTab gallery={gallery} />;
      case "settings": {
        const clients = await db.client.findMany({ where: { studioId: user.studioId }, select: { id: true, partner1Name: true, partner2Name: true } });
        return <SettingsTab gallery={gallery} clients={clients.map((c) => ({ id: c.id, name: `${c.partner1Name} & ${c.partner2Name}` }))} isAdmin={user.role === "ADMIN"} />;
      }
      case "activity":
        return <ActivityTab galleryId={gallery.id} />;
    }
  };

  return (
    <div className="-mt-2">
      <Link href="/admin/galleries" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted hover:text-charcoal">
        <ArrowLeft className="size-3.5" /> All galleries
      </Link>

      {/* hero */}
      <section className="relative mb-6 overflow-hidden bg-charcoal text-ivory">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/70 to-charcoal/10" />
        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge kind="gallery" value={gallery.status} />
              <Badge tone="dark" className="bg-ivory/15">
                {gallery.visibility.toLowerCase()}
              </Badge>
              {gallery.expiresAt && <Badge tone="dark" className="bg-ivory/15">expires {formatDate(gallery.expiresAt)}</Badge>}
            </div>
            <h1 className="font-display text-5xl leading-none sm:text-6xl">{gallery.coupleNames}</h1>
            <p className="mt-2 text-sm text-ivory/70">
              {gallery.title} · {gallery.category}
              {gallery.location ? ` · ${gallery.location}` : ""}
              {gallery.shootDate ? ` · ${formatDate(gallery.shootDate)}` : ""}
            </p>
            <p className="mt-1 text-xs text-ivory/50">/gallery/{gallery.slug}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline-light" size="sm">
              <Link href={`/gallery/${gallery.slug}`} target="_blank">
                <ExternalLink /> View as the couple
              </Link>
            </Button>
            <ShareDialog slug={gallery.slug} uploadsEnabled={!!gallery.settings?.guestUploadsEnabled} trigger={<Button variant="outline-light" size="sm"><UserPlus /> Invite</Button>} />
            <StatusActions id={gallery.id} status={gallery.status} />
          </div>
        </div>
      </section>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        {[
          { icon: Images, label: "Files", value: photoCount },
          { icon: Heart, label: "Favourites", value: favCount },
          { icon: MessageSquare, label: "Open comments", value: openComments },
          { icon: Users, label: "Active invites", value: invitations },
          { icon: Download, label: "Downloads", value: downloads },
        ].map((s) => (
          <div key={s.label} className="bg-white px-5 py-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-muted">
              <s.icon className="size-3.5" /> {s.label}
            </p>
            <p className="font-display mt-1 text-3xl lining-nums tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* tabs: rendered on the server per request; the static demo renders every pane and switches in the browser */}
      {DEMO ? (
        <Suspense fallback={<TabNav tabs={tabDefs} active="photos" />}>
          <ClientTabs tabs={tabDefs} panes={Object.fromEntries(await Promise.all(TABS.map(async ([t]) => [t, await pane(t)] as const)))} />
        </Suspense>
      ) : (
        <>
          <TabNav tabs={tabDefs} active={tab} />
          {await pane(tab)}
        </>
      )}
    </div>
  );
}

async function PhotosTab({ galleryId, coverId, albums }: { galleryId: string; coverId: string | null; albums: { id: string; title: string; description: string | null; count: number }[] }) {
  const photos = await db.photo.findMany({
    where: { galleryId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, filename: true, kind: true, status: true, hidden: true, albumId: true, width: true, height: true, error: true, _count: { select: { favorites: true, comments: true } } },
  });
  return (
    <PhotosManager
      galleryId={galleryId}
      coverId={coverId}
      albums={albums}
      photos={photos.map((p) => ({ id: p.id, filename: p.filename, kind: p.kind, status: p.status, hidden: p.hidden, albumId: p.albumId, error: p.error, favorites: p._count.favorites, comments: p._count.comments, thumb: p.status === "READY" && p.kind === "IMAGE" ? mediaUrl("p", p.id, "thumb") : null, ratio: p.width && p.height ? p.width / p.height : 1.5 }))}
    />
  );
}

async function SelectionsTab({ galleryId }: { galleryId: string }) {
  const lists = await db.favoriteList.findMany({
    where: { galleryId },
    orderBy: [{ submittedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    include: { owner: { select: { name: true } }, invitation: { select: { name: true } }, favorites: { include: { photo: { select: { id: true, filename: true, status: true, kind: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!lists.length) return <EmptyState icon={<Heart />} title="No selections yet" description="When the couple or their family favourite photographs, their lists appear here." />;
  return (
    <div className="space-y-5">
      {lists.map((l) => (
        <Panel
          key={l.id}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {l.name}
              <span className="font-normal text-muted">· {l.owner?.name ?? l.invitation?.name ?? "Guest"}</span>
              {l.submittedAt ? <Badge tone="success">Submitted {timeAgo(l.submittedAt)}</Badge> : <Badge>In progress</Badge>}
            </span>
          }
          action={<CopyFilenames names={l.favorites.map((f) => f.photo.filename)} />}
        >
          <p className="mb-3 text-xs text-muted">
            {l.favorites.length} photographs{l.limit ? ` of ${l.limit} allowed` : ""} · {l.kind.toLowerCase().replace("_", " ")}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {l.favorites.map((f) =>
              f.photo.status === "READY" && f.photo.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f.id} src={mediaUrl("p", f.photo.id, "thumb")} alt={f.photo.filename} title={f.note ? `${f.photo.filename} — ${f.note}` : f.photo.filename} className="h-20 w-auto shrink-0 object-cover" loading="lazy" />
              ) : (
                <span key={f.id} className="grid h-20 w-28 shrink-0 place-items-center bg-ivory-deep p-1 text-center text-[10px] text-muted">
                  {f.photo.filename}
                </span>
              ),
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}

async function CommentsTab({ galleryId }: { galleryId: string }) {
  const comments = await db.comment.findMany({
    where: { galleryId, parentId: null },
    orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
    include: { photo: { select: { id: true, filename: true, status: true } }, replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!comments.length) return <EmptyState icon={<MessageSquare />} title="No comments yet" description="Notes and retouch requests from the couple appear here." />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {comments.map((c) => (
        <CommentThread
          key={c.id}
          comment={{
            id: c.id,
            authorName: c.authorName,
            body: c.body,
            isEditRequest: c.isEditRequest,
            resolved: !!c.resolvedAt,
            createdAt: c.createdAt.toISOString(),
            photo: { filename: c.photo.filename, thumb: c.photo.status === "READY" ? mediaUrl("p", c.photo.id, "thumb") : null },
            replies: c.replies.map((r) => ({ id: r.id, authorName: r.authorName, body: r.body, fromStudio: r.fromStudio, createdAt: r.createdAt.toISOString() })),
          }}
        />
      ))}
    </div>
  );
}

async function GuestsTab({ galleryId, enabled }: { galleryId: string; enabled: boolean }) {
  const uploads = await db.guestUpload.findMany({ where: { galleryId, size: { gt: 0 } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <div>
      {!enabled && <p className="mb-4 border border-line bg-white px-4 py-3 text-sm text-muted">Guest uploads are switched off for this gallery. Turn them on in Settings to share an upload link or QR code.</p>}
      {uploads.length ? (
        <GuestModeration
          items={uploads.map((u) => ({ id: u.id, guestName: u.guestName, message: u.message, filename: u.filename, status: u.status, isVideo: u.mimeType.startsWith("video/"), preview: u.thumbKey ? mediaUrl("g", u.id, "preview") : null, createdAt: u.createdAt.toISOString() }))}
        />
      ) : (
        <EmptyState icon={<Users />} title="No guest uploads" description="Photos shared by family and friends land here for your review." />
      )}
    </div>
  );
}

async function AlbumDesignsTab({ galleryId }: { galleryId: string }) {
  const designs = await db.albumDesign.findMany({ where: { galleryId }, orderBy: { updatedAt: "desc" } });
  if (!designs.length) return <EmptyState icon={<Images />} title="No album designs" description="When the couple submits an album layout for approval it appears here." />;
  const ids = [...new Set(designs.flatMap((d) => ((d.pages as { photoIds: string[] }[]) ?? []).flatMap((p) => p.photoIds)))];
  const photos = await db.photo.findMany({ where: { id: { in: ids }, status: "READY" }, select: { id: true } });
  const thumbs = Object.fromEntries(photos.map((p) => [p.id, mediaUrl("p", p.id, "thumb")]));
  return (
    <div className="space-y-5">
      {designs.map((d) => (
        <AlbumDesignReview key={d.id} design={{ id: d.id, title: d.title, status: d.status, coupleNote: d.coupleNote, photographerNote: d.photographerNote, submittedAt: d.submittedAt?.toISOString() ?? null, pages: (d.pages as { layout: string; photoIds: string[]; caption?: string }[]) ?? [] }} thumbs={thumbs} />
      ))}
    </div>
  );
}

async function SharingTab({ gallery }: { gallery: { id: string; slug: string; visibility: string; settings: { guestUploadsEnabled: boolean } | null } }) {
  const invites = await db.invitation.findMany({ where: { galleryId: gallery.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel title="How people get in" className="lg:col-span-1">
        <ul className="space-y-3 text-sm">
          <li>
            <strong className="font-medium">The couple</strong> — signs in with their account{gallery.visibility === "PRIVATE" ? "" : ", or the link"}.
          </li>
          <li>
            <strong className="font-medium">Family & friends</strong> — personal invitations with their own permissions. Revoke any time.
          </li>
          <li>
            <strong className="font-medium">Wedding guests</strong> — a guest upload link (show the QR code at the venue).
          </li>
        </ul>
        <div className="mt-5">
          <ShareDialog slug={gallery.slug} uploadsEnabled={!!gallery.settings?.guestUploadsEnabled} trigger={<Button className="w-full"><UserPlus /> Create invitation</Button>} />
        </div>
      </Panel>
      <Panel title={`Invitations (${invites.length})`} className="lg:col-span-2" bodyClassName="p-0">
        {invites.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Access</th>
                <th className="px-3 py-2.5 font-medium">Opened</th>
                <th className="px-5 py-2.5 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invites.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted">{i.email ?? i.kind.toLowerCase().replace("_", " ")}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{[i.canView && "view", i.canFavorite && "favourite", i.canComment && "comment", i.canDownload && "download", i.canUpload && "upload"].filter(Boolean).join(" · ")}</td>
                  <td className="px-3 py-3 text-xs text-muted">{i.useCount ? `${i.useCount}× · ${timeAgo(i.lastUsedAt!)}` : "—"}</td>
                  <td className="px-5 py-3 text-right">{i.revokedAt ? <Badge tone="danger">Revoked</Badge> : i.expiresAt && i.expiresAt < new Date() ? <Badge tone="warning">Expired</Badge> : <Badge tone="success">Active</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-sm text-muted">No invitations yet.</p>
        )}
      </Panel>
    </div>
  );
}

function SettingsTab({ gallery, clients, isAdmin }: { gallery: NonNullable<Awaited<ReturnType<typeof db.gallery.findFirst>>> & { settings: import("@prisma/client").GallerySettings | null; albums: { id: string; title: string }[] }; clients: { id: string; name: string }[]; isAdmin: boolean }) {
  const s = gallery.settings;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <DetailsForm
        gallery={{ id: gallery.id, title: gallery.title, coupleNames: gallery.coupleNames, slug: gallery.slug, category: gallery.category, tagline: gallery.tagline ?? "", welcomeNote: gallery.welcomeNote ?? "", location: gallery.location ?? "", shootDate: toInputDate(gallery.shootDate), clientId: gallery.clientId ?? "", photoshootId: gallery.photoshootId ?? "" }}
        clients={clients}
      />
      <SettingsForm
        id={gallery.id}
        albums={gallery.albums.map((a) => ({ id: a.id, title: a.title }))}
        values={{
          visibility: gallery.visibility,
          hasPassword: !!gallery.passwordHash,
          expiresAt: toInputDate(gallery.expiresAt),
          downloadScope: s?.downloadScope ?? "SINGLE",
          downloadResolution: s?.downloadResolution ?? "WEB",
          hasPin: !!s?.downloadPinHash,
          downloadExpiresAt: toInputDate(s?.downloadExpiresAt),
          watermarkPreviews: !!s?.watermarkPreviews,
          allowFavorites: s?.allowFavorites ?? true,
          allowComments: s?.allowComments ?? true,
          linkCanDownload: !!s?.linkCanDownload,
          guestUploadsEnabled: !!s?.guestUploadsEnabled,
          guestUploadAlbumId: s?.guestUploadAlbumId ?? "",
          guestUploadMaxFiles: s?.guestUploadMaxFiles ?? 20,
          guestUploadMaxMb: s?.guestUploadMaxMb ?? 25,
          guestUploadModerated: s?.guestUploadModerated ?? true,
          albumSelectionLimit: s?.albumSelectionLimit ?? null,
          socialSelectionLimit: s?.socialSelectionLimit ?? null,
          showCountdown: !!s?.showCountdown,
          countdownDate: toInputDate(s?.countdownDate),
          slideshowSeconds: s?.slideshowSeconds ?? 5,
          slideshowMusicUrl: s?.slideshowMusicUrl ?? "",
          defaultView: s?.defaultView ?? "masonry",
        }}
      />
      <DangerZone id={gallery.id} slug={gallery.slug} status={gallery.status} isAdmin={isAdmin} />
    </div>
  );
}

async function ActivityTab({ galleryId }: { galleryId: string }) {
  const rows = await db.activityLog.findMany({ where: { galleryId }, orderBy: { createdAt: "desc" }, take: 80 });
  const photoIds = [...new Set(rows.flatMap((r) => (r.photoId ? [r.photoId] : [])))];
  const names = new Map((await db.photo.findMany({ where: { id: { in: photoIds } }, select: { id: true, filename: true } })).map((p) => [p.id, p.filename]));
  if (!rows.length) return <EmptyState title="No activity yet" description="Opens, favourites, comments and downloads will be listed here." />;
  return (
    <Panel bodyClassName="p-0">
      <ol className="divide-y divide-line">
        {rows.map((r) => {
          const meta = (r.meta ?? {}) as Record<string, unknown>;
          return (
            <li key={r.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
              <p>
                <span className="font-medium">{r.actorLabel}</span> <span className="text-muted">{ACTIVITY_LABELS[r.action] ?? r.action.toLowerCase().replaceAll("_", " ")}</span>
                {r.photoId && names.get(r.photoId) && <span className="text-muted"> · {names.get(r.photoId)}</span>}
                {typeof meta.count === "number" && <span className="text-muted"> · {meta.count} files</span>}
                {typeof meta.name === "string" && <span className="text-muted"> · {meta.name}</span>}
                {typeof meta.list === "string" && <span className="text-muted"> · “{meta.list}”</span>}
              </p>
              <time className="shrink-0 text-xs text-muted" dateTime={r.createdAt.toISOString()}>
                {timeAgo(r.createdAt)}
              </time>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, Check, CheckCheck, ClipboardCopy, Eye, Rocket, RotateCcw, Send, Trash2, Video, Wand2, X } from "lucide-react";
import { deleteGalleryPermanently, moderateGuestUpload, resolveComment, reviewAlbumDesign, setGalleryStatus, staffReply, updateGalleryDetails, updateGallerySettings } from "@/server/actions/galleries";
import { ActionButton, ActionForm, fieldError } from "@/components/admin/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { Badge, Panel } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { GALLERY_CATEGORIES } from "@/content/site";
import { cn, timeAgo } from "@/lib/utils";

export function StatusActions({ id, status }: { id: string; status: string }) {
  if (status === "PUBLISHED")
    return (
      <>
        <ActionButton size="sm" variant="outline-light" action={() => setGalleryStatus(id, "DRAFT")} confirm="Unpublish this gallery? The couple and guests lose access until you publish again.">
          <Eye /> Unpublish
        </ActionButton>
        <ActionButton size="sm" variant="outline-light" action={() => setGalleryStatus(id, "ARCHIVED")} confirm="Archive this gallery? Access closes; every photograph is kept.">
          <Archive /> Archive
        </ActionButton>
      </>
    );
  if (status === "ARCHIVED")
    return (
      <ActionButton size="sm" variant="light" action={() => setGalleryStatus(id, "DRAFT")}>
        <RotateCcw /> Restore to draft
      </ActionButton>
    );
  return (
    <ActionButton size="sm" variant="light" action={() => setGalleryStatus(id, "PUBLISHED")} confirm="Publish and notify the couple?">
      <Rocket /> Publish
    </ActionButton>
  );
}

export function CopyFilenames({ names }: { names: string[] }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={!names.length}
      onClick={async () => {
        await navigator.clipboard.writeText(names.join(", ")).catch(() => {});
        toast("Filenames copied", { description: "Paste into Lightroom’s filter bar to find these frames." });
      }}
    >
      <ClipboardCopy /> Copy filenames
    </Button>
  );
}

type Thread = {
  id: string;
  authorName: string;
  body: string;
  isEditRequest: boolean;
  resolved: boolean;
  createdAt: string;
  photo: { filename: string; thumb: string | null };
  replies: { id: string; authorName: string; body: string; fromStudio: boolean; createdAt: string }[];
};

export function CommentThread({ comment: c }: { comment: Thread }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <article className={cn("flex gap-4 border bg-white p-4 transition", c.resolved ? "border-line opacity-70" : "border-line")}>
      {c.photo.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.photo.thumb} alt={c.photo.filename} className="size-20 shrink-0 object-cover" loading="lazy" />
      ) : (
        <span className="grid size-20 shrink-0 place-items-center bg-ivory-deep text-[10px] text-muted">{c.photo.filename}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-medium text-charcoal">{c.authorName}</span>
          {timeAgo(c.createdAt)} · {c.photo.filename}
          {c.isEditRequest && (
            <Badge tone="champagne">
              <Wand2 className="size-3" /> Edit request
            </Badge>
          )}
          {c.resolved && <Badge tone="success">Resolved</Badge>}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed">{c.body}</p>
        {c.replies.map((r) => (
          <div key={r.id} className="mt-2 border-l-2 border-line pl-3 text-sm">
            <p className="text-xs text-muted">
              <span className={cn("font-medium", r.fromStudio ? "text-olive-deep" : "text-charcoal")}>{r.authorName}</span> · {timeAgo(r.createdAt)}
            </p>
            <p className="mt-0.5">{r.body}</p>
          </div>
        ))}
        <ActionForm action={staffReply} resetOnSuccess className="mt-3 flex gap-2">
          <input type="hidden" name="parentId" value={c.id} />
          <Input name="body" placeholder="Reply to the couple…" className="h-9 text-sm" aria-label="Reply" maxLength={1500} />
          <SubmitButton size="sm" pendingText="…" aria-label="Send reply">
            <Send />
          </SubmitButton>
        </ActionForm>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await resolveComment(c.id, !c.resolved);
              if (!r.ok) return toast.error(r.error);
              router.refresh();
            })
          }
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-charcoal"
        >
          {c.resolved ? <RotateCcw className="size-3" /> : <CheckCheck className="size-3" />} {c.resolved ? "Reopen" : "Mark resolved"}
        </button>
      </div>
    </article>
  );
}

type GuestItem = { id: string; guestName: string | null; message: string | null; filename: string; status: string; isVideo: boolean; preview: string | null; createdAt: string };

export function GuestModeration({ items }: { items: GuestItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const decide = (id: string, d: "APPROVED" | "REJECTED") =>
    start(async () => {
      setBusy(id);
      const r = await moderateGuestUpload(id, d);
      setBusy(null);
      if (!r.ok) return toast.error(r.error);
      toast(r.message ?? "Done");
      router.refresh();
    });
  const pendingItems = items.filter((i) => i.status === "PENDING");
  return (
    <div>
      {pendingItems.length > 1 && (
        <div className="mb-4 flex items-center justify-between border border-line bg-white px-4 py-3 text-sm">
          <span>{pendingItems.length} waiting for review</span>
          <Button
            size="sm"
            variant="olive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                for (const i of pendingItems) await moderateGuestUpload(i.id, "APPROVED");
                toast(`${pendingItems.length} uploads approved`);
                router.refresh();
              })
            }
          >
            <CheckCheck /> Approve all
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((i) => (
          <div key={i.id} className="border border-line bg-white">
            <div className="relative aspect-square bg-ivory-deep">
              {i.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.preview} alt={i.filename} className="size-full object-cover" loading="lazy" />
              ) : (
                <span className="grid size-full place-items-center text-muted">{i.isVideo ? <Video className="size-6" /> : <span className="text-xs">Preparing preview…</span>}</span>
              )}
              <span className="absolute left-2 top-2">
                <Badge tone={i.status === "APPROVED" ? "success" : i.status === "REJECTED" ? "danger" : "warning"}>{i.status.toLowerCase()}</Badge>
              </span>
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">{i.guestName ?? "Guest"}</p>
              <p className="truncate text-[11px] text-muted">
                {i.filename} · {timeAgo(i.createdAt)}
              </p>
              {i.message && <p className="mt-1 line-clamp-2 text-xs italic text-muted">“{i.message}”</p>}
              {i.status === "PENDING" && (
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" variant="olive" className="flex-1" disabled={pending && busy === i.id} onClick={() => decide(i.id, "APPROVED")}>
                    <Check /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending && busy === i.id} onClick={() => decide(i.id, "REJECTED")} aria-label="Reject">
                    <X />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Design = { id: string; title: string; status: string; coupleNote: string | null; photographerNote: string | null; submittedAt: string | null; pages: { layout: string; photoIds: string[]; caption?: string }[] };

export function AlbumDesignReview({ design: d, thumbs }: { design: Design; thumbs: Record<string, string> }) {
  const router = useRouter();
  const [note, setNote] = useState(d.photographerNote ?? "");
  const [pending, start] = useTransition();
  const review = (status: "APPROVED" | "CHANGES_REQUESTED") =>
    start(async () => {
      const r = await reviewAlbumDesign(d.id, status, note);
      if (!r.ok) return toast.error(r.error);
      toast(r.message ?? "Saved");
      router.refresh();
    });
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          {d.title} <Badge tone={d.status === "APPROVED" ? "success" : d.status === "SUBMITTED" ? "warning" : d.status === "CHANGES_REQUESTED" ? "danger" : "neutral"}>{d.status.toLowerCase().replace("_", " ")}</Badge>
        </span>
      }
      action={d.submittedAt && <span className="text-xs text-muted">submitted {timeAgo(d.submittedAt)}</span>}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {d.pages.map((p, i) => (
          <div key={i} className="w-40 shrink-0">
            <div className="grid aspect-[4/3] grid-cols-2 gap-0.5 bg-ivory-deep p-1">
              {p.photoIds.slice(0, 4).map((id) =>
                thumbs[id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={id} src={thumbs[id]} alt="" className={cn("size-full object-cover", p.photoIds.length === 1 && "col-span-2 row-span-2")} loading="lazy" />
                ) : (
                  <span key={id} className="bg-line" />
                ),
              )}
            </div>
            <p className="mt-1 text-[10px] text-muted">
              Spread {i + 1} · {p.layout}
            </p>
          </div>
        ))}
      </div>
      {d.coupleNote && <p className="mt-3 border-l-2 border-champagne pl-3 text-sm italic">“{d.coupleNote}”</p>}
      {d.status !== "DRAFT" && (
        <div className="mt-4 space-y-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes for the couple (optional)" rows={2} aria-label="Notes for the couple" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => review("CHANGES_REQUESTED")}>
              Request changes
            </Button>
            <Button size="sm" variant="olive" disabled={pending} onClick={() => review("APPROVED")}>
              <Check /> Approve album
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

type Details = { id: string; title: string; coupleNames: string; slug: string; category: string; tagline: string; welcomeNote: string; location: string; shootDate: string; clientId: string; photoshootId: string };

export function DetailsForm({ gallery: g, clients }: { gallery: Details; clients: { id: string; name: string }[] }) {
  return (
    <Panel title="Details">
      <ActionForm action={updateGalleryDetails} className="space-y-4">
        {(state) => (
          <>
            <input type="hidden" name="id" value={g.id} />
            <input type="hidden" name="photoshootId" value={g.photoshootId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Couple names" error={fieldError(state, "coupleNames")}>
                <Input name="coupleNames" defaultValue={g.coupleNames} required />
              </Field>
              <Field label="Gallery title" error={fieldError(state, "title")}>
                <Input name="title" defaultValue={g.title} required />
              </Field>
              <Field label="Address" hint="/gallery/…" error={fieldError(state, "slug")}>
                <Input name="slug" defaultValue={g.slug} />
              </Field>
              <Field label="Category">
                <Select name="category" defaultValue={g.category}>
                  {GALLERY_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Location">
                <Input name="location" defaultValue={g.location} />
              </Field>
              <Field label="Shoot date">
                <Input name="shootDate" type="date" defaultValue={g.shootDate} />
              </Field>
            </div>
            <Field label="Client">
              <Select name="clientId" defaultValue={g.clientId}>
                <option value="">— none —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tagline">
              <Input name="tagline" defaultValue={g.tagline} maxLength={160} />
            </Field>
            <Field label="Welcome note" hint="Shown at the top of the gallery">
              <Textarea name="welcomeNote" defaultValue={g.welcomeNote} maxLength={2000} rows={3} />
            </Field>
            <div className="flex justify-end">
              <SubmitButton>Save details</SubmitButton>
            </div>
          </>
        )}
      </ActionForm>
    </Panel>
  );
}

type SettingsValues = {
  visibility: string;
  hasPassword: boolean;
  expiresAt: string;
  downloadScope: string;
  downloadResolution: string;
  hasPin: boolean;
  downloadExpiresAt: string;
  watermarkPreviews: boolean;
  allowFavorites: boolean;
  allowComments: boolean;
  linkCanDownload: boolean;
  guestUploadsEnabled: boolean;
  guestUploadAlbumId: string;
  guestUploadMaxFiles: number;
  guestUploadMaxMb: number;
  guestUploadModerated: boolean;
  albumSelectionLimit: number | null;
  socialSelectionLimit: number | null;
  showCountdown: boolean;
  countdownDate: string;
  slideshowSeconds: number;
  slideshowMusicUrl: string;
  defaultView: string;
};

export function SettingsForm({ id, albums, values: v }: { id: string; albums: { id: string; title: string }[]; values: SettingsValues }) {
  const [visibility, setVisibility] = useState(v.visibility);
  const [guests, setGuests] = useState(v.guestUploadsEnabled);
  return (
    <Panel title="Access & delivery">
      <ActionForm action={updateGallerySettings} className="space-y-6">
        {(state) => (
          <>
            <input type="hidden" name="id" value={id} />
            <fieldset className="space-y-3">
              <legend className="mb-2 text-[11px] uppercase tracking-[0.15em] text-muted">Who can open it</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Visibility">
                  <Select name="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                    <option value="PRIVATE">Private — couple & invitations only</option>
                    <option value="PASSWORD">Link + password</option>
                    <option value="LINK">Anyone with the link</option>
                  </Select>
                </Field>
                <Field label="Gallery expires">
                  <Input name="expiresAt" type="date" defaultValue={v.expiresAt} />
                </Field>
              </div>
              {visibility === "PASSWORD" && (
                <Field label={v.hasPassword ? "New password (leave blank to keep)" : "Password"} error={fieldError(state, "password")}>
                  <Input name="password" type="text" autoComplete="off" />
                </Field>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-[11px] uppercase tracking-[0.15em] text-muted">Downloads</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Allowed">
                  <Select name="downloadScope" defaultValue={v.downloadScope}>
                    <option value="NONE">No downloads</option>
                    <option value="SINGLE">Single photographs</option>
                    <option value="ALBUM">Albums & selections</option>
                    <option value="FULL">Everything</option>
                  </Select>
                </Field>
                <Field label="Resolution">
                  <Select name="downloadResolution" defaultValue={v.downloadResolution}>
                    <option value="WEB">Web size (2400 px)</option>
                    <option value="HIGH">Full resolution originals</option>
                  </Select>
                </Field>
                <Field label={v.hasPin ? "New download PIN" : "Download PIN (optional)"} error={fieldError(state, "downloadPin")}>
                  <Input name="downloadPin" inputMode="numeric" placeholder="4–8 digits" autoComplete="off" />
                </Field>
                <Field label="Downloads close">
                  <Input name="downloadExpiresAt" type="date" defaultValue={v.downloadExpiresAt} />
                </Field>
              </div>
              {v.hasPin && <Checkbox name="clearPin" label="Remove the download PIN" />}
              <Checkbox name="linkCanDownload" label="Link / password visitors can download" defaultChecked={v.linkCanDownload} />
              <Checkbox name="watermarkPreviews" label="Watermark previews" description="Downloads stay clean; on-screen images carry your studio name." defaultChecked={v.watermarkPreviews} />
            </fieldset>

            <fieldset className="space-y-1">
              <legend className="mb-2 text-[11px] uppercase tracking-[0.15em] text-muted">Selections & comments</legend>
              <Checkbox name="allowFavorites" label="Allow favourites" defaultChecked={v.allowFavorites} />
              <Checkbox name="allowComments" label="Allow comments & edit requests" defaultChecked={v.allowComments} />
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <Field label="Album selection limit">
                  <Input name="albumSelectionLimit" type="number" min={0} defaultValue={v.albumSelectionLimit ?? ""} placeholder="No limit" />
                </Field>
                <Field label="Social media limit">
                  <Input name="socialSelectionLimit" type="number" min={0} defaultValue={v.socialSelectionLimit ?? ""} placeholder="No limit" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="space-y-1">
              <legend className="mb-2 text-[11px] uppercase tracking-[0.15em] text-muted">Guest uploads</legend>
              <Checkbox name="guestUploadsEnabled" label="Let family & guests add photographs" checked={guests} onChange={(e) => setGuests(e.target.checked)} />
              {guests && (
                <>
                  <Checkbox name="guestUploadModerated" label="Review uploads before they appear" defaultChecked={v.guestUploadModerated} />
                  <div className="grid gap-3 pt-2 sm:grid-cols-3">
                    <Field label="Into album">
                      <Select name="guestUploadAlbumId" defaultValue={v.guestUploadAlbumId}>
                        <option value="">Unsorted</option>
                        {albums.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Files per batch">
                      <Input name="guestUploadMaxFiles" type="number" min={1} defaultValue={v.guestUploadMaxFiles} />
                    </Field>
                    <Field label="Max MB each">
                      <Input name="guestUploadMaxMb" type="number" min={1} max={200} defaultValue={v.guestUploadMaxMb} />
                    </Field>
                  </div>
                </>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-[11px] uppercase tracking-[0.15em] text-muted">Experience</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Default view">
                  <Select name="defaultView" defaultValue={v.defaultView}>
                    <option value="masonry">Natural rows</option>
                    <option value="grid">Square grid</option>
                  </Select>
                </Field>
                <Field label="Slideshow seconds">
                  <Input name="slideshowSeconds" type="number" min={2} max={20} defaultValue={v.slideshowSeconds} />
                </Field>
                <Field label="Countdown to">
                  <Input name="countdownDate" type="date" defaultValue={v.countdownDate} />
                </Field>
              </div>
              <Checkbox name="showCountdown" label="Show the wedding countdown" defaultChecked={v.showCountdown} />
              <Field label="Slideshow music URL (licensed)" hint="An MP3 you have the rights to use">
                <Input name="slideshowMusicUrl" type="url" defaultValue={v.slideshowMusicUrl} placeholder="https://…" />
              </Field>
            </fieldset>

            <div className="flex justify-end">
              <SubmitButton>Save settings</SubmitButton>
            </div>
          </>
        )}
      </ActionForm>
    </Panel>
  );
}

export function DangerZone({ id, slug, status, isAdmin }: { id: string; slug: string; status: string; isAdmin: boolean }) {
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  return (
    <Panel title="Danger zone" className="border-danger/30 xl:col-span-2">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Archive</p>
          <p className="mt-1 text-sm text-muted">Closes access for everyone and keeps every photograph. You can restore it at any time.</p>
          <div className="mt-3">{status !== "ARCHIVED" ? <ActionButton size="sm" variant="outline" action={() => setGalleryStatus(id, "ARCHIVED")} confirm="Archive this gallery? Access closes; every photograph is kept."><Archive /> Archive gallery</ActionButton> : <Badge>Archived</Badge>}</div>
        </div>
        <div>
          <p className="text-sm font-medium text-danger">Delete permanently</p>
          <p className="mt-1 text-sm text-muted">
            Removes the gallery and <strong className="font-medium">every original and processed file</strong> from storage. Admins only, archived galleries only. This cannot be undone.
          </p>
          {isAdmin && status === "ARCHIVED" ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await deleteGalleryPermanently(id, typed);
                  if (r && !r.ok) toast.error(r.error);
                });
              }}
            >
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Type ${slug} to confirm`} className="h-9 text-sm" aria-label="Type the gallery address to confirm" />
              <Button size="sm" variant="danger" disabled={typed !== slug || pending}>
                <Trash2 /> Delete
              </Button>
            </form>
          ) : (
            <p className="mt-3 text-xs text-muted">{isAdmin ? "Archive the gallery first to enable deletion." : "Only an admin can delete galleries."}</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

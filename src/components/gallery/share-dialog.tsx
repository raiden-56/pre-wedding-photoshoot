"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, QrCode, UserMinus, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import { createInvitation, listInvitations, revokeInvitation } from "@/server/actions/gallery";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { formatDate, timeAgo } from "@/lib/utils";

type Inv = Awaited<ReturnType<typeof listInvitations>>[number];

const KIND_COPY = {
  INVITE: "Personal invitation",
  SHARE_LINK: "Shareable link",
  UPLOAD_PORTAL: "Guest upload link",
} as const;

/** Invite family & friends with fine-grained permissions; copy links or show a QR code. */
export function ShareDialog({ slug, trigger, uploadsEnabled }: { slug: string; trigger: React.ReactNode; uploadsEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Inv[] | null>(null);
  const [qr, setQr] = useState<{ url: string; data: string } | null>(null);
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<keyof typeof KIND_COPY>("INVITE");

  const load = useCallback(() => listInvitations(slug).then(setItems).catch(() => setItems([])), [slug]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url).catch(() => {});
    toast("Link copied");
  };
  const showQr = async (url: string) => setQr({ url, data: await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#242321", light: "#F7F4EF" } }) });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent side="right" title="Share with family" description="Every link is personal and can be revoked at any time. Nobody can see the gallery without one.">
        <form
          className="space-y-4 border border-line bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            start(async () => {
              const r = await createInvitation(slug, {
                kind,
                name: String(fd.get("name") ?? ""),
                email: String(fd.get("email") ?? "") || undefined,
                canFavorite: fd.get("fav") === "on",
                canComment: fd.get("comment") === "on",
                canDownload: fd.get("download") === "on",
                canUpload: fd.get("upload") === "on",
                password: String(fd.get("password") ?? "") || undefined,
                expiresAt: String(fd.get("expires") ?? "") || undefined,
                sendEmail: fd.get("send") === "on",
              });
              if (!r.ok) return toast.error(r.error);
              await copy(r.data!.url);
              form.reset();
              load();
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Who is it for?">
              <Input name="name" required placeholder="Nani & Nana" maxLength={80} />
            </Field>
            <Field label="Type">
              <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                <option value="INVITE">Personal invitation</option>
                <option value="SHARE_LINK">Shareable link</option>
                {uploadsEnabled && <option value="UPLOAD_PORTAL">Guest upload link</option>}
              </Select>
            </Field>
          </div>
          {kind !== "UPLOAD_PORTAL" && (
            <div className="grid grid-cols-2 gap-x-4">
              <Checkbox name="fav" label="Can favourite" defaultChecked />
              <Checkbox name="comment" label="Can comment" />
              <Checkbox name="download" label="Can download" />
              {uploadsEnabled && <Checkbox name="upload" label="Can add photos" />}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email (optional)">
              <Input name="email" type="email" placeholder="to send the link" />
            </Field>
            <Field label="Expires (optional)">
              <Input name="expires" type="date" />
            </Field>
          </div>
          <Field label="Extra password (optional)" hint="They’ll need this as well as the link.">
            <Input name="password" type="text" autoComplete="off" />
          </Field>
          <Checkbox name="send" label="Email the link to them" />
          <Button type="submit" disabled={pending} className="w-full">
            <UserPlus /> {pending ? "Creating…" : "Create & copy link"}
          </Button>
        </form>

        <AnimatePresence>
          {qr && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-6 flex flex-col items-center gap-3 border border-line bg-white p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.data} alt="QR code for the invitation link" className="size-48" />
                <p className="max-w-full truncate text-xs text-muted">{qr.url}</p>
                <Button size="sm" variant="ghost" onClick={() => setQr(null)}>
                  Hide
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="eyebrow mb-3 mt-8">People with access</p>
        <div className="divide-y divide-line border-y border-line">
          {items == null && <div className="skeleton my-3 h-12" />}
          {items?.length === 0 && <p className="py-6 text-center text-sm text-muted">No invitations yet.</p>}
          {items?.map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {i.name} {i.revoked && <Badge tone="danger">Revoked</Badge>}
                </p>
                <p className="truncate text-xs text-muted">
                  {KIND_COPY[i.kind]} · {i.useCount ? `opened ${i.useCount}× · last ${timeAgo(i.lastUsedAt!)}` : "not opened yet"}
                  {i.expiresAt ? ` · until ${formatDate(i.expiresAt)}` : ""}
                </p>
              </div>
              {!i.revoked && (
                <>
                  <Button size="icon" variant="ghost" aria-label={`Copy link for ${i.name}`} onClick={() => copy(i.url)}>
                    <Copy />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`QR code for ${i.name}`} onClick={() => showQr(i.url)}>
                    <QrCode />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-danger"
                    aria-label={`Revoke access for ${i.name}`}
                    onClick={() =>
                      start(async () => {
                        if (!confirm(`Revoke ${i.name}’s access? Their link will stop working immediately.`)) return;
                        const r = await revokeInvitation(slug, i.id);
                        if (!r.ok) return toast.error(r.error);
                        load();
                      })
                    }
                  >
                    <UserMinus />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

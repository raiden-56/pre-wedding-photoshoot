"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { inviteCoupleToPortal, saveClientNotes } from "@/server/actions/admin";

export function PortalInvite({ clientId, active, email, lastLogin }: { clientId: string; active: boolean; email: string | null | undefined; lastLogin: string | null }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  return (
    <div className="text-sm">
      <p className="text-muted">
        {active ? (
          <>
            Portal active for <strong className="text-charcoal">{email}</strong>
            {lastLogin ? ` · last sign-in ${lastLogin}` : " · not signed in yet"}.
          </>
        ) : (
          <>Give the couple their own login to view galleries, favourites and bookings.</>
        )}
      </p>
      <Button
        className="mt-4 w-full"
        variant={active ? "outline" : "primary"}
        disabled={pending || !email}
        onClick={() =>
          start(async () => {
            const res = await inviteCoupleToPortal(clientId);
            if (res.ok) {
              setLink(res.data!.link);
              toast(res.message ?? "Done", { description: res.data!.emailed ? "Sent by email" : "Email isn’t configured — copy the link below and share it on WhatsApp." });
            } else toast.error(res.error);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        {active ? "Send new sign-in link" : "Invite to portal"}
      </Button>
      {!email && <p className="mt-2 text-xs text-danger">Add an email address first.</p>}
      {link && (
        <div className="mt-3 flex items-center gap-2 border border-line bg-ivory p-2">
          <code className="min-w-0 flex-1 truncate text-[11px]">{link}</code>
          <button onClick={() => (navigator.clipboard.writeText(link), toast("Link copied"))} className="grid size-7 place-items-center hover:bg-white" aria-label="Copy link">
            <Copy className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function ClientNotes({ clientId, initial }: { clientId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={6} placeholder="Preferences, family details, outfit plans…" />
      <Button size="sm" variant="outline" className="mt-2" disabled={pending || value === initial} onClick={() => start(async () => {
        const r = await saveClientNotes(clientId, value);
        if (r.ok) toast("Notes saved");
        else toast.error(r.error);
      })}>
        {pending && <Loader2 className="animate-spin" />} Save notes
      </Button>
    </div>
  );
}

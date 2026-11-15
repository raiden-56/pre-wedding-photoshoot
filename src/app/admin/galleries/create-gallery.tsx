"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { ActionForm, fieldError } from "@/components/admin/action-form";
import { GALLERY_CATEGORIES } from "@/content/site";
import { createGallery } from "@/server/actions/galleries";
import { slugify, toInputDate } from "@/lib/utils";

type Opt = { id: string; name: string };

export function CreateGalleryDialog({ trigger, clients, shoots, defaultOpen, preset }: { trigger: React.ReactNode; clients: Opt[]; shoots: Opt[]; defaultOpen?: boolean; preset?: { id: string; title: string; clientId: string; location: string | null; date: string; type: string } }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [names, setNames] = useState(preset?.title.split(" — ")[0] ?? "");
  const [slug, setSlug] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="New gallery" description="You can change everything later." side="right">
        <ActionForm action={createGallery} className="space-y-4">
          {(s) => (
            <>
              <Field label="Couple names *" error={fieldError(s, "coupleNames")}>
                <Input name="coupleNames" value={names} onChange={(e) => setNames(e.target.value)} placeholder="Aarav & Ananya" required />
              </Field>
              <Field label="Gallery title *" error={fieldError(s, "title")}>
                <Input name="title" defaultValue={preset?.title ?? ""} placeholder="Aarav & Ananya — A Goa Love Story" required />
              </Field>
              <Field label="Private address" hint={`/gallery/${slug || slugify(`${names} love story`) || "…"}`} error={fieldError(s, "slug")}>
                <Input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <Select name="category" defaultValue={preset?.type && GALLERY_CATEGORIES.includes(preset.type as never) ? preset.type : "Pre-Wedding"}>{GALLERY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
                </Field>
                <Field label="Shoot date"><Input name="shootDate" type="date" defaultValue={preset ? toInputDate(preset.date) : ""} /></Field>
                <Field label="Client">
                  <Select name="clientId" defaultValue={preset?.clientId ?? ""}>
                    <option value="">—</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="Photoshoot">
                  <Select name="photoshootId" defaultValue={preset?.id ?? ""}>
                    <option value="">—</option>
                    {shoots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Location"><Input name="location" defaultValue={preset?.location ?? ""} placeholder="South Goa" /></Field>
              <Field label="Tagline"><Input name="tagline" placeholder="Two hearts. One beautiful story." /></Field>
              <Field label="Welcome message"><Textarea name="welcomeNote" rows={3} placeholder="A personal note shown on the gallery landing page" /></Field>
              <Field label="Albums" hint="Comma separated — e.g. Highlights, Sunset Session, Candid Moments"><Input name="albums" defaultValue="Highlights, Candid Moments, Final Edited" /></Field>
              <input type="hidden" name="welcome" value="" />
              <div className="flex justify-end pt-2"><SubmitButton pendingText="Creating…">Create gallery</SubmitButton></div>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

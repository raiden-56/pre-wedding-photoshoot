"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormDialog, fieldError } from "./action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SHOOT_TYPES } from "@/content/site";
import { SHOOT_STATUSES } from "@/lib/validation";
import { SHOOT_STATUS_LABEL } from "./status";
import { convertInquiry, createQuotation, recordPayment, saveBooking, saveClient, savePackage, savePhotoshoot, saveTestimonial } from "@/server/actions/admin";
import { toInputDate } from "@/lib/utils";

type Opt = { id: string; name: string };

export type ClientValues = {
  id?: string;
  partner1Name?: string;
  partner1Email?: string | null;
  partner1Phone?: string | null;
  partner2Name?: string;
  partner2Email?: string | null;
  partner2Phone?: string | null;
  city?: string | null;
  weddingDate?: Date | string | null;
  source?: string | null;
  notes?: string | null;
};

export function ClientDialog({ trigger, client }: { trigger: React.ReactNode; client?: ClientValues }) {
  return (
    <FormDialog trigger={trigger} title={client?.id ? "Edit client" : "Add a couple"} description="Both partners, contact details and the shared wedding date." action={saveClient} side="right">
      {(s) => (
        <>
          {client?.id && <input type="hidden" name="id" value={client.id} />}
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="eyebrow mb-3">Partner one</legend>
            <Field label="Full name *" error={fieldError(s, "partner1Name")} className="sm:col-span-2"><Input name="partner1Name" defaultValue={client?.partner1Name} required /></Field>
            <Field label="Email" error={fieldError(s, "partner1Email")}><Input name="partner1Email" type="email" defaultValue={client?.partner1Email ?? ""} /></Field>
            <Field label="Phone"><Input name="partner1Phone" defaultValue={client?.partner1Phone ?? ""} /></Field>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="eyebrow mb-3 mt-2">Partner two</legend>
            <Field label="Full name *" error={fieldError(s, "partner2Name")} className="sm:col-span-2"><Input name="partner2Name" defaultValue={client?.partner2Name} required /></Field>
            <Field label="Email" error={fieldError(s, "partner2Email")}><Input name="partner2Email" type="email" defaultValue={client?.partner2Email ?? ""} /></Field>
            <Field label="Phone"><Input name="partner2Phone" defaultValue={client?.partner2Phone ?? ""} /></Field>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City"><Input name="city" defaultValue={client?.city ?? ""} /></Field>
            <Field label="Wedding date"><Input name="weddingDate" type="date" defaultValue={toInputDate(client?.weddingDate)} /></Field>
            <Field label="Source"><Input name="source" placeholder="Instagram, referral…" defaultValue={client?.source ?? ""} /></Field>
          </div>
          <Field label="Notes"><Textarea name="notes" defaultValue={client?.notes ?? ""} /></Field>
        </>
      )}
    </FormDialog>
  );
}

export function PhotoshootDialog({
  trigger,
  shoot,
  clients,
  photographers,
  packages,
}: {
  trigger: React.ReactNode;
  shoot?: { id: string; title: string; clientId: string; type: string; date: Date | string; location: string | null; photographerId: string | null; packageId: string | null; status: string; notes: string | null };
  clients: Opt[];
  photographers: Opt[];
  packages: Opt[];
}) {
  const d = shoot ? new Date(shoot.date) : null;
  return (
    <FormDialog trigger={trigger} title={shoot ? "Edit photoshoot" : "Schedule a photoshoot"} action={savePhotoshoot} side="right">
      {(s) => (
        <>
          {shoot && <input type="hidden" name="id" value={shoot.id} />}
          <Field label="Title *" error={fieldError(s, "title")}><Input name="title" defaultValue={shoot?.title} placeholder="Aarav & Ananya — Goa" required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client *" error={fieldError(s, "clientId")}>
              <Select name="clientId" defaultValue={shoot?.clientId ?? ""} required>
                <option value="">Choose…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Type">
              <Select name="type" defaultValue={shoot?.type ?? "Pre-Wedding"}>{SHOOT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
            </Field>
            <Field label="Date *" error={fieldError(s, "date")}><Input name="date" type="date" defaultValue={toInputDate(d)} required /></Field>
            <Field label="Time"><Input name="time" type="time" defaultValue={d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "16:00"} /></Field>
          </div>
          <Field label="Location"><Input name="location" defaultValue={shoot?.location ?? ""} placeholder="Agonda Beach, South Goa" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Photographer">
              <Select name="photographerId" defaultValue={shoot?.photographerId ?? ""}>
                <option value="">Unassigned</option>
                {photographers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Package">
              <Select name="packageId" defaultValue={shoot?.packageId ?? ""}>
                <option value="">None</option>
                {packages.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={shoot?.status ?? "CONFIRMED"}>{SHOOT_STATUSES.map((t) => <option key={t} value={t}>{SHOOT_STATUS_LABEL[t]}</option>)}</Select>
            </Field>
          </div>
          <Field label="Notes"><Textarea name="notes" defaultValue={shoot?.notes ?? ""} /></Field>
        </>
      )}
    </FormDialog>
  );
}

export function BookingDialog({ trigger, clients, packages, booking }: { trigger: React.ReactNode; clients: Opt[]; packages: Opt[]; booking?: { id: string; clientId: string; title: string; packageId: string | null; shootType: string; eventDate: Date; location: string | null; totalAmount: number; advanceAmount: number; notes: string | null } }) {
  return (
    <FormDialog trigger={trigger} title={booking ? "Edit booking" : "New booking"} action={saveBooking} side="right">
      {(s) => (
        <>
          {booking && <input type="hidden" name="id" value={booking.id} />}
          <Field label="Client *" error={fieldError(s, "clientId")}>
            <Select name="clientId" defaultValue={booking?.clientId ?? ""} required>
              <option value="">Choose…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Title *"><Input name="title" defaultValue={booking?.title} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shoot type"><Select name="shootType" defaultValue={booking?.shootType ?? "Pre-Wedding"}>{SHOOT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Package">
              <Select name="packageId" defaultValue={booking?.packageId ?? ""}>
                <option value="">Custom</option>
                {packages.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Event date *"><Input name="eventDate" type="date" defaultValue={toInputDate(booking?.eventDate)} required /></Field>
            <Field label="Time"><Input name="time" type="time" defaultValue="16:00" /></Field>
            <Field label="Total (₹) *"><Input name="total" inputMode="decimal" defaultValue={booking ? booking.totalAmount / 100 : ""} required /></Field>
            <Field label="Advance due (₹)"><Input name="advance" inputMode="decimal" defaultValue={booking ? booking.advanceAmount / 100 : ""} /></Field>
          </div>
          <Field label="Location"><Input name="location" defaultValue={booking?.location ?? ""} /></Field>
          <Field label="Notes"><Textarea name="notes" defaultValue={booking?.notes ?? ""} /></Field>
        </>
      )}
    </FormDialog>
  );
}

export function QuotationDialog({ trigger, inquiryId, defaultItem }: { trigger: React.ReactNode; inquiryId: string; defaultItem?: { label: string; amount: number | null } }) {
  const [rows, setRows] = useState([{ k: 0, label: defaultItem?.label ?? "", amount: defaultItem?.amount ? String(defaultItem.amount / 100) : "" }]);
  return (
    <FormDialog trigger={trigger} title="Custom quotation" description="Line items in rupees. Sent by email when SMTP is configured." action={createQuotation} submitLabel="Save quotation">
      {() => (
        <>
          <input type="hidden" name="inquiryId" value={inquiryId} />
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.k} className="flex gap-2">
                <Input name="itemLabel" placeholder="Item" defaultValue={r.label} className="flex-1" />
                <Input name="itemAmount" placeholder="₹" inputMode="decimal" defaultValue={r.amount} className="w-32" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove line" disabled={rows.length === 1}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows([...rows, { k: Date.now(), label: "", amount: "" }])}>
              <Plus /> Add line
            </Button>
          </div>
          <Field label="Valid until"><Input name="validUntil" type="date" /></Field>
          <Field label="Notes"><Textarea name="notes" placeholder="What's included, travel, payment terms…" /></Field>
          <Checkbox name="send" label="Email this quotation to the client" />
        </>
      )}
    </FormDialog>
  );
}

export function ConvertInquiryDialog({ trigger, inquiry, packages }: { trigger: React.ReactNode; inquiry: { id: string; preferredDate: Date | null; packageId: string | null }; packages: (Opt & { price: number | null })[] }) {
  const pkg = packages.find((p) => p.id === inquiry.packageId);
  return (
    <FormDialog trigger={trigger} title="Convert to booking" description="Creates the client profile, booking and a draft photoshoot." action={convertInquiry} submitLabel="Create booking">
      {(s) => (
        <>
          <input type="hidden" name="inquiryId" value={inquiry.id} />
          <Field label="Package">
            <Select name="packageId" defaultValue={inquiry.packageId ?? ""}>
              <option value="">Custom</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event date *" error={fieldError(s, "eventDate")}><Input name="eventDate" type="date" defaultValue={toInputDate(inquiry.preferredDate)} required /></Field>
            <Field label="Time"><Input name="time" type="time" defaultValue="16:00" /></Field>
            <Field label="Agreed total (₹) *" error={fieldError(s, "total")}><Input name="total" inputMode="decimal" defaultValue={pkg?.price ? pkg.price / 100 : ""} required /></Field>
            <Field label="Advance (₹)"><Input name="advance" inputMode="decimal" /></Field>
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function PaymentDialog({ trigger, bookingId, suggested }: { trigger: React.ReactNode; bookingId: string; suggested?: number }) {
  return (
    <FormDialog trigger={trigger} title="Record a payment" description="Use this for cash, UPI or bank transfers you have verified yourself." action={recordPayment}>
      {(s) => (
        <>
          <input type="hidden" name="bookingId" value={bookingId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₹) *" error={fieldError(s, "amount")}><Input name="amount" inputMode="decimal" defaultValue={suggested ? suggested / 100 : ""} required /></Field>
            <Field label="Type"><Select name="kind"><option value="ADVANCE">Advance</option><option value="BALANCE">Balance</option><option value="FULL">Full payment</option><option value="ADDON">Add-on</option></Select></Field>
            <Field label="Method"><Select name="method"><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option><option value="CARD">Card</option><option value="OTHER">Other</option></Select></Field>
            <Field label="Status"><Select name="status"><option value="PAID">Received (verified)</option><option value="PENDING">Request / due</option></Select></Field>
            <Field label="Reference"><Input name="reference" placeholder="UTR / transaction ID" /></Field>
            <Field label="Paid on"><Input name="paidAt" type="date" defaultValue={toInputDate(new Date())} /></Field>
          </div>
          <Field label="Notes"><Textarea name="notes" rows={2} /></Field>
        </>
      )}
    </FormDialog>
  );
}

export function PackageDialog({ trigger, pkg }: { trigger: React.ReactNode; pkg?: { id: string; name: string; tagline: string | null; description: string; hours: number; photographers: number; editedPhotos: number; videoOption: string | null; albumOption: string | null; locationOption: string | null; price: number | null; addOns: unknown; featured: boolean; active: boolean; isSample: boolean } }) {
  const addOns = ((pkg?.addOns as { name: string; price: number }[]) ?? []).map((a) => `${a.name} | ${a.price / 100}`).join("\n");
  return (
    <FormDialog trigger={trigger} title={pkg ? "Edit package" : "New package"} action={savePackage} side="right">
      {(s) => (
        <>
          {pkg && <input type="hidden" name="id" value={pkg.id} />}
          <Field label="Name *" error={fieldError(s, "name")}><Input name="name" defaultValue={pkg?.name} required /></Field>
          <Field label="Tagline"><Input name="tagline" defaultValue={pkg?.tagline ?? ""} /></Field>
          <Field label="Description *" error={fieldError(s, "description")}><Textarea name="description" defaultValue={pkg?.description} required /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Hours"><Input name="hours" type="number" min={1} defaultValue={pkg?.hours ?? 4} /></Field>
            <Field label="Photographers"><Input name="photographers" type="number" min={1} defaultValue={pkg?.photographers ?? 1} /></Field>
            <Field label="Edited photos"><Input name="editedPhotos" type="number" min={1} defaultValue={pkg?.editedPhotos ?? 100} /></Field>
          </div>
          <Field label="Video option"><Input name="videoOption" defaultValue={pkg?.videoOption ?? ""} /></Field>
          <Field label="Album option"><Input name="albumOption" defaultValue={pkg?.albumOption ?? ""} /></Field>
          <Field label="Location option"><Input name="locationOption" defaultValue={pkg?.locationOption ?? ""} /></Field>
          <Field label="Price (₹)" hint="Leave empty to show “On request”"><Input name="price" inputMode="decimal" defaultValue={pkg?.price != null ? pkg.price / 100 : ""} /></Field>
          <Field label="Add-ons" hint="One per line: Name | price in ₹"><Textarea name="addOns" defaultValue={addOns} rows={3} /></Field>
          <div className="grid gap-1 sm:grid-cols-3">
            <Checkbox name="active" label="Visible on website" defaultChecked={pkg?.active ?? true} />
            <Checkbox name="featured" label="Featured" defaultChecked={pkg?.featured} />
            <Checkbox name="isSample" label="Sample pricing" defaultChecked={pkg?.isSample} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function TestimonialDialog({ trigger, t }: { trigger: React.ReactNode; t?: { id: string; coupleNames: string; review: string; rating: number; category: string | null; location: string | null; photoUrl: string | null; published: boolean; isSample: boolean } }) {
  return (
    <FormDialog trigger={trigger} title={t ? "Edit testimonial" : "New testimonial"} description="Only publish real words from real clients, with their permission." action={saveTestimonial}>
      {() => (
        <>
          {t && <input type="hidden" name="id" value={t.id} />}
          <Field label="Couple names *"><Input name="coupleNames" defaultValue={t?.coupleNames} required /></Field>
          <Field label="Review *"><Textarea name="review" defaultValue={t?.review} required /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Rating"><Select name="rating" defaultValue={String(t?.rating ?? 5)}>{[5, 4, 3, 2, 1].map((r) => <option key={r}>{r}</option>)}</Select></Field>
            <Field label="Category"><Input name="category" defaultValue={t?.category ?? ""} /></Field>
            <Field label="Location"><Input name="location" defaultValue={t?.location ?? ""} /></Field>
          </div>
          <Field label="Photo URL" hint="A public image path, e.g. /photos/16.jpg"><Input name="photoUrl" defaultValue={t?.photoUrl ?? ""} /></Field>
          <div className="flex gap-6">
            <Checkbox name="published" label="Published" defaultChecked={t?.published ?? true} />
            <Checkbox name="isSample" label="Sample / placeholder" defaultChecked={t?.isSample} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

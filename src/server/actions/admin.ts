"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingStatus, InquiryStatus, PaymentKind, PaymentMethod, Prisma, ShootStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AuthError, requireStaff } from "@/lib/auth/session";
import { randomToken, sha256 } from "@/lib/crypto";
import { clientSchema, packageSchema, photoshootSchema, SHOOT_STATUSES } from "@/lib/validation";
import { slugify, type ActionResult } from "@/lib/utils";
import { audit } from "@/server/activity";
import { notify, sendEmail } from "@/server/notify";

type R = ActionResult<unknown>;
type Prev = R | undefined;

const fail = (e: unknown): R => {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: e.flatten().fieldErrors as Record<string, string[]> };
  console.error(e);
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
};
const toDate = (v?: string | null, time?: string | null) => (v ? new Date(`${v}T${time || "10:00"}:00`) : null);
const rupeesToPaise = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? Math.round(n * 100) : null;
};
const form = (fd: FormData) => Object.fromEntries(fd) as Record<string, string>;

// ───────────── Clients ─────────────

export async function saveClient(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff();
    const id = fd.get("id") as string | null;
    const d = clientSchema.parse(form(fd));
    const data = {
      partner1Name: d.partner1Name,
      partner1Email: d.partner1Email || null,
      partner1Phone: d.partner1Phone || null,
      partner2Name: d.partner2Name,
      partner2Email: d.partner2Email || null,
      partner2Phone: d.partner2Phone || null,
      city: d.city || null,
      weddingDate: d.weddingDate ? new Date(d.weddingDate) : null,
      source: d.source || null,
      notes: d.notes || null,
    };
    if (id) {
      const res = await db.client.updateMany({ where: { id, studioId: user.studioId }, data });
      if (!res.count) return { ok: false, error: "Client not found" };
      revalidatePath(`/admin/clients/${id}`);
      return { ok: true, message: "Client updated" };
    }
    const client = await db.client.create({ data: { ...data, studioId: user.studioId, profile: { create: {} } } });
    await audit({ studioId: user.studioId, userId: user.id, action: "create", entity: "Client", entityId: client.id });
    revalidatePath("/admin/clients");
    return { ok: true, message: "Client added", data: { id: client.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function saveClientNotes(clientId: string, notes: string): Promise<R> {
  try {
    const user = await requireStaff();
    await db.client.updateMany({ where: { id: clientId, studioId: user.studioId }, data: { notes: notes.slice(0, 4000) } });
    revalidatePath(`/admin/clients/${clientId}`);
    return { ok: true, message: "Notes saved" };
  } catch (e) {
    return fail(e);
  }
}

/** Creates (or re-sends) the couple's portal login and returns a one-time setup link. */
export async function inviteCoupleToPortal(clientId: string): Promise<ActionResult<{ link: string; emailed: boolean }>> {
  try {
    const user = await requireStaff();
    const client = await db.client.findFirst({ where: { id: clientId, studioId: user.studioId } });
    if (!client) return { ok: false, error: "Client not found" };
    const email = client.partner1Email || client.partner2Email;
    if (!email) return { ok: false, error: "Add an email address for at least one partner first." };
    let accountId = client.userId;
    if (!accountId) {
      const existing = await db.user.findUnique({ where: { email }, include: { clientProfile: true } });
      if (existing && (existing.role !== "CLIENT" || existing.clientProfile)) return { ok: false, error: "That email already belongs to another account." };
      const account = existing ?? (await db.user.create({ data: { email, name: `${client.partner1Name.split(" ")[0]} & ${client.partner2Name.split(" ")[0]}`, role: "CLIENT", phone: client.partner1Phone } }));
      await db.client.update({ where: { id: client.id }, data: { userId: account.id } });
      accountId = account.id;
    }
    const token = randomToken(32);
    await db.authToken.create({ data: { userId: accountId, tokenHash: sha256(token), purpose: "ACCOUNT_SETUP", expiresAt: new Date(Date.now() + 7 * 86400_000) } });
    const link = `${env.APP_URL}/set-password/${token}`;
    const sent = await sendEmail(email, "Your private photography portal", `Hello ${client.partner1Name.split(" ")[0]} & ${client.partner2Name.split(" ")[0]},\n\nYour private portal is ready. Set your password to view your galleries, favourites and bookings:\n\n${link}\n\nThis link expires in 7 days.`);
    await audit({ studioId: user.studioId, userId: user.id, action: "portal-invite", entity: "Client", entityId: client.id });
    revalidatePath(`/admin/clients/${clientId}`);
    return { ok: true, message: sent.status === "SENT" ? "Invitation emailed" : "Setup link created", data: { link, emailed: sent.status === "SENT" } };
  } catch (e) {
    return fail(e) as ActionResult<{ link: string; emailed: boolean }>;
  }
}

export async function deleteClient(clientId: string): Promise<R> {
  try {
    const user = await requireStaff({ adminOnly: true });
    const client = await db.client.findFirst({ where: { id: clientId, studioId: user.studioId }, include: { _count: { select: { galleries: true } } } });
    if (!client) return { ok: false, error: "Client not found" };
    if (client._count.galleries) return { ok: false, error: "This client still has galleries. Archive or reassign them first — photographs are never deleted implicitly." };
    await db.client.delete({ where: { id: clientId } });
    await audit({ studioId: user.studioId, userId: user.id, action: "delete", entity: "Client", entityId: clientId });
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/clients");
}

// ───────────── Photoshoots ─────────────

export async function savePhotoshoot(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff();
    const id = fd.get("id") as string | null;
    const d = photoshootSchema.parse(form(fd));
    if (!(await db.client.findFirst({ where: { id: d.clientId, studioId: user.studioId } }))) return { ok: false, error: "Client not found" };
    if (d.photographerId && !(await db.user.findFirst({ where: { id: d.photographerId, studioId: user.studioId } }))) return { ok: false, error: "Photographer not found" };
    if (d.packageId && !(await db.package.findFirst({ where: { id: d.packageId, studioId: user.studioId } }))) return { ok: false, error: "Package not found" };
    const data = {
      title: d.title,
      clientId: d.clientId,
      type: d.type,
      date: toDate(d.date, d.time)!,
      location: d.location || null,
      photographerId: d.photographerId || null,
      packageId: d.packageId || null,
      status: d.status as ShootStatus,
      notes: d.notes || null,
    };
    if (id) {
      const res = await db.photoshoot.updateMany({ where: { id, studioId: user.studioId }, data });
      if (!res.count) return { ok: false, error: "Photoshoot not found" };
    } else await db.photoshoot.create({ data: { ...data, studioId: user.studioId } });
    revalidatePath("/admin/photoshoots");
    return { ok: true, message: id ? "Photoshoot updated" : "Photoshoot scheduled" };
  } catch (e) {
    return fail(e);
  }
}

export async function setShootStatus(id: string, status: string): Promise<R> {
  try {
    const user = await requireStaff();
    if (!SHOOT_STATUSES.includes(status as never)) return { ok: false, error: "Invalid status" };
    const shoot = await db.photoshoot.findFirst({ where: { id, studioId: user.studioId }, include: { client: true } });
    if (!shoot) return { ok: false, error: "Not found" };
    await db.photoshoot.update({ where: { id }, data: { status: status as ShootStatus } });
    if (status === "COMPLETED" && shoot.client.userId) {
      await notify({ userIds: [shoot.client.userId], type: "SHOOT_COMPLETED", title: "Your photoshoot is complete", body: `${shoot.title} — we’re now editing your photographs.`, link: "/dashboard/bookings" });
    }
    revalidatePath("/admin/photoshoots");
    return { ok: true, message: "Status updated" };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePhotoshoot(id: string): Promise<R> {
  try {
    const user = await requireStaff();
    await db.photoshoot.deleteMany({ where: { id, studioId: user.studioId } });
    revalidatePath("/admin/photoshoots");
    return { ok: true, message: "Photoshoot removed" };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Inquiries, quotations, bookings ─────────────

export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<R> {
  try {
    const user = await requireStaff();
    await db.inquiry.updateMany({ where: { id, studioId: user.studioId }, data: { status } });
    revalidatePath("/admin/bookings");
    return { ok: true, message: "Inquiry updated" };
  } catch (e) {
    return fail(e);
  }
}

export async function createQuotation(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff();
    const inquiryId = String(fd.get("inquiryId") ?? "");
    const inquiry = await db.inquiry.findFirst({ where: { id: inquiryId, studioId: user.studioId } });
    if (!inquiry) return { ok: false, error: "Inquiry not found" };
    const labels = fd.getAll("itemLabel").map(String);
    const amounts = fd.getAll("itemAmount").map((v) => rupeesToPaise(v) ?? 0);
    const items = labels.map((label, i) => ({ label: label.trim(), amount: amounts[i] })).filter((i) => i.label && i.amount > 0);
    if (!items.length) return { ok: false, error: "Add at least one line item with an amount." };
    const total = items.reduce((s, i) => s + i.amount, 0);
    const notes = String(fd.get("notes") ?? "").slice(0, 2000);
    const validUntil = toDate(String(fd.get("validUntil") ?? "")) ?? new Date(Date.now() + 14 * 86400_000);
    const send = fd.get("send") === "on";
    await db.quotation.create({ data: { studioId: user.studioId, inquiryId, items, total, notes, validUntil, status: send ? "SENT" : "DRAFT" } });
    await db.inquiry.update({ where: { id: inquiryId }, data: { status: "QUOTED" } });
    if (send) {
      const studio = await db.studio.findUnique({ where: { id: user.studioId } });
      const lines = items.map((i) => `• ${i.label}: ₹${(i.amount / 100).toLocaleString("en-IN")}`).join("\n");
      await sendEmail(inquiry.email, `Your quotation from ${studio?.name}`, `Dear ${inquiry.name},\n\nThank you for considering us. Here is your quotation:\n\n${lines}\n\nTotal: ₹${(total / 100).toLocaleString("en-IN")}\nValid until ${validUntil.toDateString()}\n\n${notes}`);
    }
    revalidatePath("/admin/bookings");
    return { ok: true, message: send ? "Quotation saved & sent (if email is configured)" : "Quotation saved" };
  } catch (e) {
    return fail(e);
  }
}

/** Converts an inquiry into a client + booking (+ photoshoot), the core of the sales workflow. */
export async function convertInquiry(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff();
    const inquiry = await db.inquiry.findFirst({ where: { id: String(fd.get("inquiryId")), studioId: user.studioId } });
    if (!inquiry) return { ok: false, error: "Inquiry not found" };
    const total = rupeesToPaise(fd.get("total"));
    const advance = rupeesToPaise(fd.get("advance")) ?? 0;
    const date = toDate(String(fd.get("eventDate") ?? ""), String(fd.get("time") ?? ""));
    if (!total || !date) return { ok: false, error: "Total amount and event date are required.", fieldErrors: { total: !total ? ["Required"] : undefined, eventDate: !date ? ["Required"] : undefined } };
    const packageId = String(fd.get("packageId") ?? "") || inquiry.packageId;
    const booking = await db.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: { studioId: user.studioId, partner1Name: inquiry.name, partner1Email: inquiry.email, partner1Phone: inquiry.phone, partner2Name: inquiry.partnerName || "Partner", source: "Website inquiry", weddingDate: null, notes: inquiry.message, profile: { create: {} } },
      });
      const b = await tx.booking.create({
        data: { studioId: user.studioId, clientId: client.id, inquiryId: inquiry.id, packageId, title: `${inquiry.name.split(" ")[0]}${inquiry.partnerName ? ` & ${inquiry.partnerName.split(" ")[0]}` : ""} — ${inquiry.shootType}`, shootType: inquiry.shootType, eventDate: date, location: inquiry.location, status: "PENDING", totalAmount: total, advanceAmount: advance },
      });
      await tx.photoshoot.create({ data: { studioId: user.studioId, clientId: client.id, bookingId: b.id, packageId, title: b.title, type: inquiry.shootType, date, location: inquiry.location, status: "INQUIRY", photographerId: user.id } });
      await tx.inquiry.update({ where: { id: inquiry.id }, data: { status: "CONVERTED" } });
      return b;
    });
    await audit({ studioId: user.studioId, userId: user.id, action: "convert", entity: "Inquiry", entityId: inquiry.id });
    revalidatePath("/admin/bookings");
    return { ok: true, message: "Booking created", data: { bookingId: booking.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function saveBooking(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff();
    const id = String(fd.get("id") ?? "");
    const clientId = String(fd.get("clientId") ?? "");
    if (!(await db.client.findFirst({ where: { id: clientId, studioId: user.studioId } }))) return { ok: false, error: "Choose a client", fieldErrors: { clientId: ["Required"] } };
    const total = rupeesToPaise(fd.get("total"));
    const date = toDate(String(fd.get("eventDate") ?? ""), String(fd.get("time") ?? ""));
    const title = String(fd.get("title") ?? "").trim();
    if (!total || !date || !title) return { ok: false, error: "Title, date and total are required." };
    const packageId = String(fd.get("packageId") ?? "") || null;
    const data = { clientId, title, packageId, shootType: String(fd.get("shootType") ?? "Pre-Wedding"), eventDate: date, location: String(fd.get("location") ?? "") || null, totalAmount: total, advanceAmount: rupeesToPaise(fd.get("advance")) ?? 0, notes: String(fd.get("notes") ?? "") || null };
    if (id) await db.booking.updateMany({ where: { id, studioId: user.studioId }, data });
    else await db.booking.create({ data: { ...data, studioId: user.studioId } });
    revalidatePath("/admin/bookings");
    return { ok: true, message: id ? "Booking updated" : "Booking created" };
  } catch (e) {
    return fail(e);
  }
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<R> {
  try {
    const user = await requireStaff();
    const booking = await db.booking.findFirst({ where: { id, studioId: user.studioId }, include: { client: true } });
    if (!booking) return { ok: false, error: "Booking not found" };
    await db.booking.update({ where: { id }, data: { status } });
    if (status === "CONFIRMED") {
      await db.photoshoot.updateMany({ where: { bookingId: id, status: "INQUIRY" }, data: { status: "CONFIRMED" } });
      const recipients = [booking.client.partner1Email, booking.client.partner2Email].filter(Boolean) as string[];
      for (const r of recipients) await sendEmail(r, "Your booking is confirmed", `${booking.title}\n${booking.eventDate.toDateString()} · ${booking.location ?? ""}\n\nWe can’t wait!`);
      if (booking.client.userId) await notify({ userIds: [booking.client.userId], type: "BOOKING_CONFIRMED", title: "Your booking is confirmed", body: `${booking.title} · ${booking.eventDate.toDateString()}`, link: "/dashboard/bookings", email: false });
    }
    revalidatePath(`/admin/bookings/${id}`);
    return { ok: true, message: `Booking ${status.toLowerCase()}` };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Payments & invoices ─────────────

/** Manual payment recording (cash/UPI/bank). Marked PAID only by an authenticated staff action, recorded in the audit log. */
export async function recordPayment(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff();
    const booking = await db.booking.findFirst({ where: { id: String(fd.get("bookingId")), studioId: user.studioId } });
    if (!booking) return { ok: false, error: "Booking not found" };
    const amount = rupeesToPaise(fd.get("amount"));
    if (!amount || amount <= 0) return { ok: false, error: "Enter an amount", fieldErrors: { amount: ["Required"] } };
    const status = fd.get("status") === "PENDING" ? "PENDING" : "PAID";
    const p = await db.payment.create({
      data: {
        studioId: user.studioId,
        bookingId: booking.id,
        clientId: booking.clientId,
        amount,
        method: (String(fd.get("method") || "UPI") as PaymentMethod),
        kind: (String(fd.get("kind") || "ADVANCE") as PaymentKind),
        status,
        reference: String(fd.get("reference") ?? "") || null,
        notes: String(fd.get("notes") ?? "") || null,
        paidAt: status === "PAID" ? toDate(String(fd.get("paidAt") ?? "")) ?? new Date() : null,
        verifiedVia: status === "PAID" ? `manual:${user.id}` : null,
      },
    });
    await audit({ studioId: user.studioId, userId: user.id, action: status === "PAID" ? "payment-recorded" : "payment-requested", entity: "Payment", entityId: p.id, meta: { amount } });
    const client = await db.client.findUnique({ where: { id: booking.clientId } });
    if (status === "PAID" && client?.userId) await notify({ userIds: [client.userId], type: "PAYMENT_RECEIVED", title: "Payment received — thank you", body: `₹${(amount / 100).toLocaleString("en-IN")} for ${booking.title}`, link: "/dashboard/bookings" });
    revalidatePath(`/admin/bookings/${booking.id}`);
    revalidatePath("/admin/payments");
    return { ok: true, message: status === "PAID" ? "Payment recorded" : "Payment request created" };
  } catch (e) {
    return fail(e);
  }
}

export async function markPaymentPaid(paymentId: string, method: PaymentMethod, reference: string): Promise<R> {
  try {
    const user = await requireStaff();
    const p = await db.payment.findFirst({ where: { id: paymentId, studioId: user.studioId } });
    if (!p || p.status === "PAID") return { ok: false, error: "Payment not found or already paid" };
    await db.payment.update({ where: { id: paymentId }, data: { status: "PAID", method, reference: reference || p.reference, paidAt: new Date(), verifiedVia: `manual:${user.id}` } });
    await audit({ studioId: user.studioId, userId: user.id, action: "payment-marked-paid", entity: "Payment", entityId: paymentId });
    revalidatePath("/admin/payments");
    revalidatePath(`/admin/bookings/${p.bookingId}`);
    return { ok: true, message: "Marked as paid" };
  } catch (e) {
    return fail(e);
  }
}

export async function generateInvoice(bookingId: string): Promise<R> {
  try {
    const user = await requireStaff();
    const booking = await db.booking.findFirst({ where: { id: bookingId, studioId: user.studioId }, include: { package: true } });
    if (!booking) return { ok: false, error: "Booking not found" };
    const studio = await db.studio.findUniqueOrThrow({ where: { id: user.studioId } });
    const count = await db.invoice.count({ where: { studioId: user.studioId } });
    const number = `${studio.invoicePrefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const items: { label: string; amount: number }[] = [{ label: booking.package ? `${booking.package.name} — ${booking.title}` : booking.title, amount: booking.totalAmount }];
    const inv = await db.invoice.create({ data: { studioId: user.studioId, bookingId, number, items, subtotal: booking.totalAmount, total: booking.totalAmount, dueAt: booking.eventDate } });
    revalidatePath(`/admin/bookings/${bookingId}`);
    return { ok: true, message: `Invoice ${number} created`, data: { id: inv.id } };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Packages & testimonials ─────────────

export async function savePackage(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff({ adminOnly: true });
    const id = String(fd.get("id") ?? "");
    const d = packageSchema.parse(form(fd));
    const addOns = (d.addOns ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, price] = l.split("|").map((x) => x.trim());
        return { name, price: rupeesToPaise(price ?? "") ?? 0 };
      });
    const data = {
      name: d.name,
      slug: slugify(d.name),
      tagline: d.tagline || null,
      description: d.description,
      hours: d.hours,
      photographers: d.photographers,
      editedPhotos: d.editedPhotos,
      videoOption: d.videoOption || null,
      albumOption: d.albumOption || null,
      locationOption: d.locationOption || null,
      price: rupeesToPaise(d.price ?? ""),
      addOns: addOns as Prisma.InputJsonValue,
      featured: d.featured === "on",
      active: d.active === "on",
      isSample: d.isSample === "on",
    };
    if (id) await db.package.updateMany({ where: { id, studioId: user.studioId }, data });
    else {
      const order = await db.package.count({ where: { studioId: user.studioId } });
      if (await db.package.findFirst({ where: { studioId: user.studioId, slug: data.slug } })) data.slug = `${data.slug}-${order + 1}`;
      await db.package.create({ data: { ...data, studioId: user.studioId, order } });
    }
    revalidatePath("/admin/packages");
    revalidatePath("/packages");
    revalidatePath("/");
    return { ok: true, message: "Package saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePackage(id: string): Promise<R> {
  try {
    const user = await requireStaff({ adminOnly: true });
    const inUse = await db.booking.count({ where: { packageId: id } });
    if (inUse) {
      await db.package.updateMany({ where: { id, studioId: user.studioId }, data: { active: false } });
      revalidatePath("/admin/packages");
      return { ok: true, message: "Package is used by bookings — it was hidden instead of deleted" };
    }
    await db.package.deleteMany({ where: { id, studioId: user.studioId } });
    revalidatePath("/admin/packages");
    return { ok: true, message: "Package deleted" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveTestimonial(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff();
    const id = String(fd.get("id") ?? "");
    const coupleNames = String(fd.get("coupleNames") ?? "").trim();
    const review = String(fd.get("review") ?? "").trim();
    if (coupleNames.length < 2 || review.length < 10) return { ok: false, error: "Couple names and a review are required." };
    const data = {
      coupleNames,
      review,
      rating: Math.min(5, Math.max(1, Number(fd.get("rating") ?? 5))),
      category: String(fd.get("category") ?? "") || null,
      location: String(fd.get("location") ?? "") || null,
      photoUrl: String(fd.get("photoUrl") ?? "") || null,
      published: fd.get("published") === "on",
      isSample: fd.get("isSample") === "on",
    };
    if (id) await db.testimonial.updateMany({ where: { id, studioId: user.studioId }, data });
    else await db.testimonial.create({ data: { ...data, studioId: user.studioId } });
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    return { ok: true, message: "Testimonial saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTestimonial(id: string): Promise<R> {
  try {
    const user = await requireStaff();
    await db.testimonial.deleteMany({ where: { id, studioId: user.studioId } });
    revalidatePath("/admin/testimonials");
    return { ok: true, message: "Testimonial deleted" };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Settings & team ─────────────

export async function saveStudioSettings(_: Prev, fd: FormData): Promise<R> {
  try {
    const user = await requireStaff({ adminOnly: true });
    const name = String(fd.get("name") ?? "").trim();
    if (name.length < 2) return { ok: false, error: "Studio name is required", fieldErrors: { name: ["Required"] } };
    const s = (k: string) => String(fd.get(k) ?? "").trim() || null;
    await db.studio.update({
      where: { id: user.studioId },
      data: { name, tagline: s("tagline"), email: s("email"), phone: s("phone"), whatsapp: s("whatsapp"), address: s("address"), city: s("city"), instagram: s("instagram"), youtube: s("youtube"), watermarkText: s("watermarkText"), gstNumber: s("gstNumber"), invoicePrefix: s("invoicePrefix") ?? "INV", retentionDays: Number(fd.get("retentionDays") ?? 365) || 365 },
    });
    await audit({ studioId: user.studioId, userId: user.id, action: "update", entity: "Studio", entityId: user.studioId });
    revalidatePath("/", "layout");
    return { ok: true, message: "Studio settings saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function inviteTeamMember(_: Prev, fd: FormData): Promise<ActionResult<{ link: string }>> {
  try {
    const user = await requireStaff({ adminOnly: true });
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const name = String(fd.get("name") ?? "").trim();
    const role = fd.get("role") === "ADMIN" ? "ADMIN" : "PHOTOGRAPHER";
    if (!z.string().email().safeParse(email).success || name.length < 2) return { ok: false, error: "Name and a valid email are required." };
    if (await db.user.findUnique({ where: { email } })) return { ok: false, error: "A user with that email already exists." };
    const member = await db.user.create({ data: { email, name, role, studioId: user.studioId } });
    const token = randomToken(32);
    await db.authToken.create({ data: { userId: member.id, tokenHash: sha256(token), purpose: "ACCOUNT_SETUP", expiresAt: new Date(Date.now() + 7 * 86400_000) } });
    const link = `${env.APP_URL}/set-password/${token}`;
    await sendEmail(email, "You’ve been invited to the studio", `Hello ${name},\n\nSet your password to join the studio workspace:\n${link}`);
    await audit({ studioId: user.studioId, userId: user.id, action: "invite", entity: "User", entityId: member.id });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Team member invited", data: { link } };
  } catch (e) {
    return fail(e) as ActionResult<{ link: string }>;
  }
}

// ───────────── Notifications ─────────────

export async function markNotificationsRead(ids?: string[]): Promise<R> {
  try {
    const user = await requireStaff().catch(async () => {
      const { requireUser } = await import("@/lib/auth/session");
      return requireUser();
    });
    await db.notification.updateMany({ where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Marked as read" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveNotificationPrefs(_: Prev, fd: FormData): Promise<R> {
  try {
    const { requireUser } = await import("@/lib/auth/session");
    const user = await requireUser();
    const muted = fd.getAll("muted").map(String);
    await db.user.update({ where: { id: user.id }, data: { notificationPrefs: { email: fd.get("email") === "on", inApp: true, whatsapp: fd.get("whatsapp") === "on", muted }, phone: String(fd.get("phone") ?? "") || undefined } });
    return { ok: true, message: "Preferences saved" };
  } catch (e) {
    return fail(e);
  }
}

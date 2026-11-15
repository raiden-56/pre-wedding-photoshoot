"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { inquirySchema, type InquiryInput } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/utils";
import { getStudio } from "@/server/site";
import { notifyStudio, sendEmail } from "@/server/notify";

export async function submitInquiry(input: InquiryInput): Promise<ActionResult<{ reference: string }>> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  if (data.website) return { ok: true, data: { reference: "OK" } }; // honeypot: pretend success to bots

  const h = await headers();
  const ip = clientIp(h);
  if (!(await rateLimit(`inquiry:${ip}`, 5, 3600))) return { ok: false, error: "Too many inquiries from this connection. Please try again in an hour or message us on WhatsApp." };

  const studio = await getStudio();
  if (!studio) return { ok: false, error: "The studio is not set up yet." };

  const pkg = data.packageId ? await db.package.findFirst({ where: { id: data.packageId, studioId: studio.id } }) : null;
  const date = data.preferredDate ? new Date(data.preferredDate) : null;

  const inquiry = await db.inquiry.create({
    data: {
      studioId: studio.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      partnerName: data.partnerName || null,
      shootType: data.shootType,
      preferredDate: date && !Number.isNaN(date.getTime()) ? date : null,
      location: data.location || null,
      packageId: pkg?.id ?? null,
      budget: data.budget || null,
      message: data.message || null,
      ip,
    },
  });
  const reference = inquiry.id.slice(-6).toUpperCase();

  await notifyStudio(studio.id, {
    type: "BOOKING_RECEIVED",
    title: `New inquiry from ${data.name}`,
    body: `${data.shootType}${data.location ? ` · ${data.location}` : ""}${data.partnerName ? ` · with ${data.partnerName}` : ""}`,
    link: `/admin/bookings?inquiry=${inquiry.id}`,
  });

  await sendEmail(
    data.email,
    "We’ve received your inquiry",
    `Dear ${data.name},\n\nThank you for reaching out to ${studio.name}. We've received your ${data.shootType.toLowerCase()} inquiry (reference ${reference}) and will reply within one working day with availability and ideas.\n\nWarmly,\n${studio.name}`,
  );

  return { ok: true, data: { reference } };
}

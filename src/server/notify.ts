import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";

export const NOTIFICATION_TYPES = {
  BOOKING_RECEIVED: "New inquiry",
  BOOKING_CONFIRMED: "Booking confirmed",
  PAYMENT_RECEIVED: "Payment received",
  SHOOT_COMPLETED: "Photoshoot completed",
  GALLERY_PUBLISHED: "Gallery published",
  PHOTOS_UPLOADED: "New photographs uploaded",
  NEW_COMMENT: "New comment",
  SELECTION_SUBMITTED: "Selection submitted",
  DOWNLOAD_COMPLETED: "Download completed",
  GUEST_UPLOAD: "Guest upload received",
  GALLERY_EXPIRING: "Gallery expiring soon",
  ALBUM_DESIGN: "Album design update",
  BOOKING_REMINDER: "Booking reminder",
} as const;
export type NotificationType = keyof typeof NOTIFICATION_TYPES;

type Prefs = { email?: boolean; inApp?: boolean; whatsapp?: boolean; muted?: NotificationType[] };

let transporter: Transporter | null = null;
function mailer() {
  if (!features.email) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string) {
  const t = mailer();
  if (!t) return { status: "SKIPPED" as const, detail: "SMTP not configured" };
  try {
    await t.sendMail({ from: env.MAIL_FROM, to, subject, text, html: emailHtml(subject, text) });
    return { status: "SENT" as const, detail: to };
  } catch (e) {
    return { status: "FAILED" as const, detail: e instanceof Error ? e.message.slice(0, 200) : "send failed" };
  }
}

/** WhatsApp Cloud API text message. Business-initiated messages outside a 24h window need approved templates. */
export async function sendWhatsApp(to: string, text: string) {
  if (!features.whatsappApi) return { status: "SKIPPED" as const, detail: "WhatsApp API not configured" };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/[^\d]/g, ""), type: "text", text: { body: text } }),
    });
    return res.ok ? { status: "SENT" as const, detail: to } : { status: "FAILED" as const, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "FAILED" as const, detail: e instanceof Error ? e.message : "failed" };
  }
}

function emailHtml(title: string, text: string) {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  return `<div style="background:#F7F4EF;padding:40px 16px;font-family:Georgia,serif;color:#242321">
  <div style="max-width:520px;margin:auto;background:#fff;padding:36px;border:1px solid #E8D8C3">
    <p style="letter-spacing:.3em;font-size:11px;text-transform:uppercase;color:#777A68;margin:0 0 18px">Saanjh Studio</p>
    <h1 style="font-weight:400;font-size:26px;margin:0 0 16px">${esc(title)}</h1>
    <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-line;color:#4a4844">${esc(text)}</p>
  </div></div>`;
}

/**
 * Creates in-app notifications and attempts email / WhatsApp delivery per the user's preferences.
 * Every delivery attempt is recorded honestly as SENT, SKIPPED or FAILED.
 */
export async function notify(input: {
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  email?: boolean;
}) {
  const users = await db.user.findMany({ where: { id: { in: [...new Set(input.userIds)] } }, select: { id: true, email: true, phone: true, notificationPrefs: true } });
  for (const u of users) {
    const prefs = (u.notificationPrefs ?? {}) as Prefs;
    if (prefs.muted?.includes(input.type)) continue;
    const n = await db.notification.create({
      data: { userId: u.id, type: input.type, title: input.title, body: input.body, link: input.link, readAt: prefs.inApp === false ? new Date() : null },
    });
    const deliveries: { channel: string; status: "SENT" | "SKIPPED" | "FAILED"; detail?: string }[] = [];
    if (input.email !== false && prefs.email !== false) {
      const link = input.link ? `\n\n${env.APP_URL}${input.link}` : "";
      deliveries.push({ channel: "email", ...(await sendEmail(u.email, input.title, `${input.body ?? ""}${link}`)) });
    }
    if (prefs.whatsapp && u.phone) {
      deliveries.push({ channel: "whatsapp", ...(await sendWhatsApp(u.phone, `${input.title}\n${input.body ?? ""}`)) });
    }
    if (deliveries.length) {
      await db.notificationDelivery.createMany({ data: deliveries.map((d) => ({ notificationId: n.id, channel: d.channel, status: d.status, detail: d.detail })) });
    }
  }
}

export async function staffUserIds(studioId: string) {
  const staff = await db.user.findMany({ where: { studioId, role: { in: ["ADMIN", "PHOTOGRAPHER"] } }, select: { id: true } });
  return staff.map((s) => s.id);
}

export async function notifyStudio(studioId: string, input: Omit<Parameters<typeof notify>[0], "userIds">) {
  return notify({ ...input, userIds: await staffUserIds(studioId) });
}

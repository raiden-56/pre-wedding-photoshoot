import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/auth/forms";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";

export const metadata: Metadata = { title: "Set your password", robots: { index: false } };

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: { select: { name: true } } } });
  const valid = record && !record.usedAt && record.expiresAt > new Date();
  return (
    <>
      <p className="eyebrow mb-3">Your private account</p>
      <h1 className="font-display text-5xl">{valid ? `Welcome, ${record.user.name.split(" ")[0]}` : "Link expired"}</h1>
      {valid ? (
        <>
          <p className="mb-8 mt-3 text-sm text-muted">Choose a password to access your galleries, favourites and bookings.</p>
          <SetPasswordForm token={token} />
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">This link has expired or was already used. Please ask the studio to send a new invitation.</p>
      )}
    </>
  );
}

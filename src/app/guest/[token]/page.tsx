import type { Metadata } from "next";
import { db } from "@/lib/db";
import { GalleryGate, GateShell, InvitationAccept } from "@/components/gallery/gate";
import { GuestUploader } from "@/components/gallery/guest-uploader";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "You’re invited", robots: { index: false, follow: false } };

export default async function GuestPage({ params }: Props) {
  const { token } = await params;
  const inv = token.length >= 16 ? await db.invitation.findUnique({ where: { token }, include: { gallery: { include: { settings: true } } } }) : null;
  if (!inv || inv.revokedAt || (inv.expiresAt && inv.expiresAt < new Date())) return <GalleryGate reason="not-found" slug="" />;
  const g = inv.gallery;
  if (g.status !== "PUBLISHED") return <GalleryGate reason={g.status === "ARCHIVED" ? "archived" : "unpublished"} slug={g.slug} />;

  if (inv.kind === "UPLOAD_PORTAL") {
    const s = g.settings;
    return (
      <GateShell>
        <p className="eyebrow mb-4 text-champagne">{g.coupleNames}</p>
        <h1 className="font-display text-5xl leading-none">Share your photographs</h1>
        <p className="mt-4 text-sm text-ivory/70">Add the moments you captured — only the couple and their studio will see them.</p>
        <div className="mt-8 bg-ivory p-4 text-left text-charcoal sm:p-6">
          {s?.guestUploadsEnabled ? (
            <GuestUploader galleryRef={{ token }} maxFiles={s.guestUploadMaxFiles} maxMb={s.guestUploadMaxMb} moderated={s.guestUploadModerated} />
          ) : (
            <p className="text-sm text-muted">Uploads are closed for now.</p>
          )}
        </div>
      </GateShell>
    );
  }

  return <InvitationAccept token={token} name={inv.name} coupleNames={g.coupleNames} needsPassword={!!inv.passwordHash} />;
}

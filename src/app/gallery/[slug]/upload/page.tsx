import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { resolveGalleryAccess } from "@/server/gallery-access";
import { GalleryGate } from "@/components/gallery/gate";
import { GuestUploader } from "@/components/gallery/guest-uploader";
import { Logo } from "@/components/ui/misc";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share your photographs", robots: { index: false, follow: false } };

export default async function UploadPage({ params }: Props) {
  const { slug } = await params;
  const access = await resolveGalleryAccess({ slug });
  if (!access.ok) return <GalleryGate reason={access.reason} slug={slug} title={access.gallery?.coupleNames} />;
  const s = access.settings;
  const open = access.perms.upload && s.guestUploadsEnabled;
  return (
    <main className="min-h-svh bg-ivory">
      <header className="container-x flex items-center justify-between py-6">
        <Link href={`/gallery/${slug}`} className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted transition hover:text-charcoal">
          <ArrowLeft className="size-4" /> Back to the gallery
        </Link>
        <Logo />
      </header>
      <section className="container-x max-w-3xl py-12 sm:py-20">
        <p className="eyebrow mb-4">{access.gallery.coupleNames}</p>
        <h1 className="font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95]">Add your photographs</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">Phone snaps from the day, behind-the-scenes moments, family favourites — everything is welcome.</p>
        <div className="mt-10">
          {open ? (
            <GuestUploader galleryRef={{ slug }} maxFiles={s.guestUploadMaxFiles} maxMb={s.guestUploadMaxMb} moderated={s.guestUploadModerated} defaultName={access.role === "COUPLE" ? access.actor.label : ""} />
          ) : (
            <p className="border border-line bg-white p-6 text-sm text-muted">Uploads aren’t open for this gallery right now.</p>
          )}
        </div>
      </section>
    </main>
  );
}

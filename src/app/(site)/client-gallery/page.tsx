import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { KeyRound, Link2, LogIn } from "lucide-react";
import { photo } from "@/content/photos";
import { GalleryLinkForm } from "./link-form";

export const metadata: Metadata = { title: "Client Gallery", description: "Open your private gallery.", robots: { index: false } };

export default function ClientGalleryPage() {
  const p = photo("23");
  return (
    <section className="container-x grid gap-14 pb-28 pt-32 sm:pt-40 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="eyebrow mb-5">Client gallery</p>
        <h1 className="font-display text-headline">Your photographs are waiting.</h1>
        <div className="mt-10 space-y-6">
          <div className="border border-line bg-white p-6">
            <LogIn className="size-5 text-olive" />
            <h2 className="font-display mt-3 text-2xl">Couples</h2>
            <p className="mt-1 text-sm text-muted">Sign in to see every gallery, favourite list, booking and delivery update.</p>
            <Link href="/login?next=/dashboard/galleries" className="mt-4 inline-flex h-10 items-center bg-charcoal px-5 text-xs uppercase tracking-[0.18em] text-ivory">
              Sign in
            </Link>
          </div>
          <div className="border border-line bg-white p-6">
            <Link2 className="size-5 text-olive" />
            <h2 className="font-display mt-3 text-2xl">Family &amp; friends</h2>
            <p className="mt-1 text-sm text-muted">Paste the gallery or invitation link you received on WhatsApp or email.</p>
            <GalleryLinkForm />
          </div>
          <p className="flex items-center gap-2 text-xs text-muted">
            <KeyRound className="size-3.5" /> Password-protected galleries will ask for the password on the next screen.
          </p>
        </div>
      </div>
      <div className="relative hidden aspect-[4/5] overflow-hidden lg:col-span-6 lg:col-start-7 lg:block">
        <Image src={p.src} alt={p.alt} fill sizes="45vw" className="object-cover" />
      </div>
    </section>
  );
}

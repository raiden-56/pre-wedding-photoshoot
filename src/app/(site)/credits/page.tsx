import type { Metadata } from "next";
import Image from "next/image";
import { PHOTOS } from "@/content/photos";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Photo Credits", robots: { index: false } };

export default function CreditsPage() {
  return (
    <>
      <PageHero eyebrow="Credits" title="Photo credits" intro="Sample photography used during development. All images are CC0 (public domain) works originally published on Unsplash and mirrored on Wikimedia Commons. They are illustrative and are not presented as this studio’s client work." />
      <section className="container-x pb-28">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PHOTOS.map((p) => (
            <li key={p.id} className="flex gap-4 border border-line bg-white p-3">
              <div className="relative size-16 shrink-0 overflow-hidden">
                <Image src={p.src} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 text-xs">
                <p className="truncate font-medium">{p.alt}</p>
                <p className="mt-1 text-muted">by {p.credit} · {p.license}</p>
                <a href={p.source} target="_blank" rel="noreferrer" className="mt-1 inline-block text-olive underline">
                  Source
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

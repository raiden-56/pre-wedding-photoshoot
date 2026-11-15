import type { Metadata } from "next";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { InquiryForm } from "@/components/site/inquiry-form";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { getPublicPackages, getStudio } from "@/server/site";
import { photo } from "@/content/photos";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact & Book a Photoshoot",
  description: "Tell us about your pre-wedding or wedding plans. We reply within one working day.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const [studio, packages, sp] = await Promise.all([getStudio(), getPublicPackages(), searchParams]);
  const p = photo("53");
  return (
    <section className="container-x grid gap-14 pb-28 pt-32 sm:pt-40 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <p className="eyebrow mb-5">Book a shoot</p>
        <h1 className="font-display text-headline">Let’s talk about <em>you two.</em></h1>
        <p className="mt-6 text-[15px] leading-relaxed text-muted">Share a few details and we’ll reply within one working day with availability, ideas and a tailored quotation.</p>
        <div className="relative mt-10 hidden aspect-[4/5] overflow-hidden lg:block">
          <Image src={p.src} alt={p.alt} fill sizes="30vw" className="object-cover" />
        </div>
        <ul className="mt-10 space-y-4 text-sm">
          {studio?.whatsapp && (
            <li>
              <a href={whatsappLink("Hi! We'd love to check availability for a photoshoot.", studio.whatsapp)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 hover:text-olive">
                <WhatsAppIcon className="size-4" /> Message us on WhatsApp
              </a>
            </li>
          )}
          {studio?.phone && <li className="flex items-center gap-3"><Phone className="size-4 text-olive" />{studio.phone}</li>}
          {studio?.email && <li className="flex items-center gap-3"><Mail className="size-4 text-olive" />{studio.email}</li>}
          {studio?.address && <li className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 text-olive" />{studio.address}, {studio.city}</li>}
        </ul>
      </div>
      <div className="lg:col-span-7 lg:col-start-6">
        <div className="border border-line bg-ivory p-6 sm:p-10">
          <InquiryForm packages={packages.map((x) => ({ id: x.id, name: x.name }))} defaultPackage={packages.some((x) => x.id === sp.package) ? sp.package : undefined} />
        </div>
      </div>
    </section>
  );
}

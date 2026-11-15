import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { PackagesList } from "@/components/site/packages-list";
import { getPublicPackages } from "@/server/site";

export const metadata: Metadata = {
  title: "Photography Packages & Collections",
  description: "Pre-wedding, cinematic, destination and full wedding photography collections with custom add-ons.",
  alternates: { canonical: "/packages" },
};

export default async function PackagesPage() {
  const packages = await getPublicPackages();
  return (
    <>
      <PageHero eyebrow="Collections" title={<>Designed around your story, <em>tailored to your day.</em></>} intro="Every collection includes a planning call, location guidance, professional editing and a private online gallery with favourites, comments and family sharing." />
      <section className="container-x pb-28">
        <PackagesList packages={packages} detailed />
        <div className="mt-14 grid gap-8 border border-line bg-white p-8 md:grid-cols-3">
          {[
            ["Custom quotations", "Multiple functions, extra cities or special requests? We’ll prepare a quotation built around your plans."],
            ["Flexible payments", "Reserve your date with an advance; the balance is due before gallery delivery. UPI, bank transfer and card accepted."],
            ["Travel", "Travel and stay outside our home city are quoted at cost, with no hidden mark-ups."],
          ].map(([t, b]) => (
            <div key={t}>
              <h2 className="font-display text-2xl">{t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

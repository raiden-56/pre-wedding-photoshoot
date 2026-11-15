import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { PortfolioGallery } from "@/components/site/portfolio-gallery";
import { PORTFOLIO_CATEGORIES } from "@/content/site";
import { getPortfolio } from "@/server/site";

export const metadata: Metadata = {
  title: "Our Work — Pre-Wedding, Wedding & Couple Photography",
  description: "A curated portfolio of pre-wedding, wedding, engagement and destination photography across India.",
  alternates: { canonical: "/portfolio" },
};

export default async function PortfolioPage() {
  const items = await getPortfolio();
  return (
    <>
      <PageHero eyebrow="Our work" title={<>A portfolio of <em>quiet</em> and joyful moments.</>} intro="Filter by the kind of story you’re planning. Tap any photograph to see it full screen." />
      <section className="container-x pb-28">
        <PortfolioGallery
          categories={PORTFOLIO_CATEGORIES}
          items={items.map((f) => ({ id: f.id, src: f.imageUrl, width: f.width, height: f.height, alt: f.alt, category: f.category, location: f.location }))}
        />
        <p className="mt-10 text-xs text-muted">Sample imagery: CC0 photographs used for development. See photo credits in the footer.</p>
      </section>
    </>
  );
}

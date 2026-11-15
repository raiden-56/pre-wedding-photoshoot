import type { Metadata } from "next";
import { CategoryLanding } from "@/components/site/category-landing";

export const metadata: Metadata = {
  title: "Wedding Photography — Candid, Traditional & Cinematic",
  description: "Full wedding coverage across every function — haldi, mehendi, sangeet, ceremony and reception — with private online galleries for your families.",
  alternates: { canonical: "/wedding" },
};

export default function WeddingPage() {
  return (
    <CategoryLanding
      eyebrow="Wedding photography"
      title={<>Every ritual. Every glance. <em>Every dance.</em></>}
      intro="Candid storytelling with the calm presence of a team that has done this many times — so you never have to think about the camera."
      heroPhoto="28"
      categories={["Wedding", "Couple Portraits"]}
      essay={{
        title: "Present for the big moments — and the small ones.",
        paragraphs: [
          "Your grandmother’s hands during the haldi. The cousin who cried first. The quiet minute you stole together between functions. These are the photographs that grow more precious every year.",
          "Our wedding teams combine candid and traditional coverage, with a lead photographer who stays with the two of you throughout the day.",
        ],
        photos: ["09", "50"],
      }}
      points={[
        { title: "Every function covered", body: "Haldi, mehendi, sangeet, ceremony and reception — planned with your family and planner." },
        { title: "Same-week sneak peek", body: "A curated preview gallery within days, so families abroad can share in the joy." },
        { title: "Heirloom albums", body: "Choose your album photographs together in your private gallery, then approve the layouts online." },
      ]}
      packageFilter={(n) => /wedding|cinematic|destination/i.test(n)}
    />
  );
}

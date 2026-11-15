import type { Metadata } from "next";
import { CategoryLanding } from "@/components/site/category-landing";

export const metadata: Metadata = {
  title: "Pre-Wedding Photography in Goa, Udaipur, Kerala & beyond",
  description: "Editorial pre-wedding shoots planned around the best light — beaches, palaces, backwaters and mountains across India.",
  alternates: { canonical: "/pre-wedding" },
};

export default function PreWeddingPage() {
  return (
    <CategoryLanding
      eyebrow="Pre-wedding photography"
      title={<>Before the vows, <em>there’s you two.</em></>}
      intro="Relaxed, story-driven sessions planned around golden hour — in a place that means something to you."
      heroPhoto="27"
      categories={["Pre-Wedding", "Engagement", "Destination", "Couple Portraits"]}
      essay={{
        title: "A day that’s only about the two of you.",
        paragraphs: [
          "Weddings are wonderful and loud. A pre-wedding shoot is the quiet chapter before — a few hours to walk, laugh, and be photographed exactly as you are with each other.",
          "We scout ahead, plan around tides, crowds and permissions, and help with outfits so every look feels like you on your best day.",
        ],
        photos: ["06", "41"],
      }}
      points={[
        { title: "Location scouting", body: "We recommend places for the light and the mood you want, and handle permits where needed." },
        { title: "Gentle direction", body: "No stiff posing. Simple prompts that create real interaction — and real laughter." },
        { title: "Ready for your invites", body: "Save-the-date edits and a highlight reel arrive first, the full gallery soon after." },
      ]}
      packageFilter={(n) => !/wedding photography/i.test(n)}
    />
  );
}

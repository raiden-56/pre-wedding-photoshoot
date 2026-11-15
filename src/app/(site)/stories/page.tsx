import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero, SampleNote } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { getStories } from "@/server/site";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Couple Stories",
  description: "Pre-wedding and wedding stories from Goa, Udaipur, Coorg, Kerala and more.",
  alternates: { canonical: "/stories" },
};

export default async function StoriesPage() {
  const stories = await getStories();
  return (
    <>
      <PageHero eyebrow="Stories" title={<>Every couple, <em>a different light.</em></>} intro="Read how each story was planned and photographed — the places, the hours and the little moments in between." />
      <section className="container-x pb-28">
        {stories.some((s) => s.isSample) && <SampleNote>Illustrative sample stories — replace with your own published work</SampleNote>}
        <div className="mt-10 space-y-24 sm:space-y-32">
          {stories.map((s, i) => (
            <Reveal key={s.id}>
              <Link href={`/stories/${s.slug}`} className={`group grid items-center gap-8 lg:grid-cols-12 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div className={`relative aspect-[4/3] overflow-hidden lg:col-span-7 ${i % 2 ? "lg:col-start-6" : ""}`}>
                  <Image src={s.coverImage} alt={`${s.coupleNames} — ${s.title}`} fill sizes="(min-width:1024px) 58vw, 100vw" className="object-cover transition duration-[1.6s] ease-out group-hover:scale-[1.04]" />
                </div>
                <div className={`lg:col-span-4 ${i % 2 ? "lg:col-start-1 lg:row-start-1" : "lg:col-start-9"}`}>
                  <p className="eyebrow">{s.category} · {s.location}</p>
                  <h2 className="font-display mt-4 text-5xl leading-none">{s.coupleNames}</h2>
                  <p className="font-display mt-3 text-2xl italic text-muted">{s.title}</p>
                  <p className="mt-5 text-[15px] leading-relaxed text-ink/80">{s.excerpt}</p>
                  {s.shootDate && <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-taupe">{formatDate(s.shootDate, { month: "long", year: "numeric" })}</p>}
                  <span className="mt-6 inline-block text-[12px] uppercase tracking-[0.2em] link-underline">Read the story</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

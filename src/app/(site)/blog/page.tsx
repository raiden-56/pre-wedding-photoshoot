import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHero } from "@/components/site/page-hero";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Journal — Planning Guides & Behind the Scenes",
  description: "Pre-wedding planning tips, location guides and how our private galleries work.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await db.blogPost.findMany({ where: { publishedAt: { lte: new Date() } }, orderBy: { publishedAt: "desc" } });
  const [lead, ...rest] = posts;
  return (
    <>
      <PageHero eyebrow="Journal" title={<>Notes on light, love <em>and planning.</em></>} />
      <section className="container-x pb-28">
        {lead && (
          <Link href={`/blog/${lead.slug}`} className="group grid gap-8 border-b border-line pb-16 lg:grid-cols-12">
            <div className="relative aspect-[16/10] overflow-hidden lg:col-span-7">
              <Image src={lead.coverImage} alt={lead.title} fill sizes="60vw" className="object-cover transition duration-1000 group-hover:scale-105" />
            </div>
            <div className="self-center lg:col-span-4 lg:col-start-9">
              <p className="eyebrow">{lead.tags.join(" · ")}</p>
              <h2 className="font-display mt-4 text-5xl leading-none">{lead.title}</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">{lead.excerpt}</p>
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-taupe">{formatDate(lead.publishedAt)}</p>
            </div>
          </Link>
        )}
        <div className="mt-16 grid gap-12 md:grid-cols-2">
          {rest.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={p.coverImage} alt={p.title} fill sizes="50vw" className="object-cover transition duration-1000 group-hover:scale-105" />
              </div>
              <p className="eyebrow mt-5">{p.tags.join(" · ")}</p>
              <h2 className="font-display mt-2 text-3xl">{p.title}</h2>
              <p className="mt-2 text-sm text-muted">{p.excerpt}</p>
            </Link>
          ))}
        </div>
        {!posts.length && <p className="text-muted">No posts yet.</p>}
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { Prose } from "@/components/site/prose";
import { formatDate } from "@/lib/utils";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({ where: { slug } });
  if (!post) return {};
  return { title: post.title, description: post.excerpt, openGraph: { type: "article", images: [post.coverImage] }, alternates: { canonical: `/blog/${slug}` } };
}

export default async function BlogPostPage({ params }: P) {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({ where: { slug } });
  if (!post || !post.publishedAt) notFound();
  const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, datePublished: post.publishedAt.toISOString(), image: post.coverImage, description: post.excerpt };
  return (
    <article className="pb-28 pt-32 sm:pt-40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="container-x max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted hover:text-charcoal">
          <ArrowLeft className="size-3.5" /> Journal
        </Link>
        <p className="eyebrow mt-10">{post.tags.join(" · ")} · {formatDate(post.publishedAt)}</p>
        <h1 className="font-display mt-4 text-headline">{post.title}</h1>
        <p className="mt-5 text-lg text-muted">{post.excerpt}</p>
      </div>
      <div className="container-x my-14">
        <div className="relative mx-auto aspect-[21/10] max-w-6xl overflow-hidden">
          <Image src={post.coverImage} alt={post.title} fill priority sizes="100vw" className="object-cover" />
        </div>
      </div>
      <div className="container-x max-w-3xl">
        <Prose text={post.body} />
      </div>
    </article>
  );
}

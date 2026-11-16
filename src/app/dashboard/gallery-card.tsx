import Link from "next/link";
import { ArrowUpRight, Images } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Card = { slug: string; title: string; category: string; location: string | null; shootDate: Date | null; expiresAt: Date | null; photoCount: number; cover: string | null };

export function GalleryCard({ g }: { g: Card }) {
  return (
    <Link href={`/gallery/${g.slug}`} className="group block overflow-hidden rounded-xl border border-charcoal/10 bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="relative aspect-[16/10] bg-ivory-deep">
        {g.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed private media URL
          <img src={g.cover} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-muted">
            <Images className="size-6" />
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="font-display truncate text-2xl leading-tight">{g.title}</p>
          <p className="mt-1 text-sm text-muted">
            {[g.category, g.location, g.shootDate && formatDate(g.shootDate, { month: "long", year: "numeric" })].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-3 text-sm tabular-nums text-ink">
            {g.photoCount} photographs{g.expiresAt ? ` · open until ${formatDate(g.expiresAt)}` : ""}
          </p>
        </div>
        <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted transition-colors duration-150 group-hover:text-charcoal" />
      </div>
    </Link>
  );
}

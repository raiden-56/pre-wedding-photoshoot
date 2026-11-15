import Link from "next/link";
import { ArrowUpRight, Camera, Clock, Film, Images, MapPin, BookOpen } from "lucide-react";
import type { Package } from "@prisma/client";
import { formatMoney } from "@/lib/utils";

/** Editorial package rows — not a wall of identical cards. */
export function PackagesList({ packages, detailed = false }: { packages: Package[]; detailed?: boolean }) {
  return (
    <div className="border-t border-charcoal/15">
      {packages.map((p, i) => {
        const addOns = (p.addOns as { name: string; price: number }[]) ?? [];
        return (
          <article key={p.id} className={`group grid gap-6 border-b border-charcoal/15 py-10 transition-colors lg:grid-cols-12 lg:gap-10 ${p.featured ? "bg-white/60 lg:-mx-6 lg:px-6" : ""}`}>
            <div className="flex items-start gap-5 lg:col-span-5">
              <span className="font-display pt-1 text-xl text-taupe">{String(i + 1).padStart(2, "0")}</span>
              <div>
                {p.featured && <p className="eyebrow mb-2 text-olive">Most loved</p>}
                <h3 className="font-display text-4xl leading-tight sm:text-5xl">{p.name}</h3>
                {p.tagline && <p className="mt-2 text-sm italic text-muted">{p.tagline}</p>}
                {detailed && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/80">{p.description}</p>}
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-ink/85 lg:col-span-4">
              <li className="flex gap-2"><Clock className="mt-0.5 size-4 text-olive" />{p.hours} hours of coverage</li>
              <li className="flex gap-2"><Camera className="mt-0.5 size-4 text-olive" />{p.photographers} photographer{p.photographers > 1 ? "s" : ""}</li>
              <li className="flex gap-2"><Images className="mt-0.5 size-4 text-olive" />{p.editedPhotos} edited photographs</li>
              {p.videoOption && <li className="flex gap-2"><Film className="mt-0.5 size-4 text-olive" />{p.videoOption}</li>}
              {p.albumOption && <li className="flex gap-2"><BookOpen className="mt-0.5 size-4 text-olive" />{p.albumOption}</li>}
              {p.locationOption && <li className="flex gap-2"><MapPin className="mt-0.5 size-4 text-olive" />{p.locationOption}</li>}
              {detailed && addOns.length > 0 && (
                <li className="col-span-2 mt-2 border-t border-line pt-3 text-xs text-muted">
                  Add-ons: {addOns.map((a) => `${a.name} (${formatMoney(a.price)})`).join(" · ")}
                </li>
              )}
            </ul>
            <div className="flex items-end justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-end">
              <div className="lg:text-right">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{p.price == null ? "Investment" : "Starting at"}</p>
                <p className="font-display mt-1 text-3xl">{p.price == null ? "On request" : formatMoney(p.price)}</p>
                {p.isSample && <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-taupe">Sample pricing · dev data</p>}
              </div>
              <Link href={`/contact?package=${p.id}`} className="inline-flex h-11 items-center gap-1.5 border border-charcoal/25 px-5 text-[11px] uppercase tracking-[0.18em] transition group-hover:border-charcoal group-hover:bg-charcoal group-hover:text-ivory">
                Enquire <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Camera, Heart, Images, LayoutGrid } from "lucide-react";
import { DEMO } from "@/lib/demo";
import { cn } from "@/lib/utils";

const ENTRIES = [
  { href: "/admin", icon: Camera, title: "Studio dashboard", body: "Clients, shoots, bookings, payments and gallery management, as the photographer sees it" },
  { href: "/dashboard", icon: Heart, title: "Couple’s dashboard", body: "Bookings, payments and galleries, as a couple sees them" },
  { href: "/gallery/aarav-ananya-love-story", icon: Images, title: "A private gallery", body: "Favourites, comments, albums, slideshow and sharing" },
  { href: "/grid-studio/editor", icon: LayoutGrid, title: "Photo Grid Studio", body: "Design a collage and export it" },
];

/**
 * Guest mode for the static demo: no backend, so instead of signing in,
 * visitors pick a side of the app to explore with sample data.
 */
export function GuestMode({ className, compact }: { className?: string; compact?: boolean }) {
  if (!DEMO) return null;
  return (
    <section className={cn("rounded-xl border border-charcoal/10 bg-white p-5", className)} aria-labelledby="guest-mode-title">
      <p id="guest-mode-title" className="text-sm font-medium text-charcoal">
        Continue as a guest
      </p>
      <p className="mt-1 text-sm text-muted">This demo runs without a server, so sign-in is switched off. Explore with sample data instead — nothing you change is saved.</p>
      <ul className={cn("mt-4 grid gap-2", !compact && "sm:grid-cols-1")}>
        {ENTRIES.map((e) => (
          <li key={e.href}>
            <Link href={e.href} className="group flex items-start gap-3 rounded-lg border border-charcoal/10 px-4 py-3 transition-colors duration-150 hover:border-charcoal/40 hover:bg-ivory">
              <e.icon className="mt-0.5 size-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{e.title}</span>
                {!compact && <span className="block text-xs text-muted">{e.body}</span>}
              </span>
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Small persistent marker so nobody mistakes the demo for the live studio. */
export function DemoBadge() {
  if (!DEMO) return null;
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[70] rounded-full bg-charcoal/90 px-3 py-1.5 text-xs text-ivory shadow-lg backdrop-blur">
      Demo · sample data · read-only
    </div>
  );
}

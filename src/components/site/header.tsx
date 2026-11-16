"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/content/site";
import { Logo } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const OVERLAY_EXACT = ["/", "/pre-wedding", "/wedding", "/about", "/grid-studio"];
const OVERLAY_PREFIX = ["/stories/", "/locations/"];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const overlay = OVERLAY_EXACT.includes(pathname) || OVERLAY_PREFIX.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => void (document.body.style.overflow = "");
  }, [open]);

  const transparent = overlay && !scrolled && !open;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
          transparent ? "bg-transparent text-ivory" : "border-b border-line/70 bg-ivory/92 text-charcoal backdrop-blur-md",
        )}
      >
        <div className="container-x flex h-[72px] items-center justify-between">
          <Link href="/" aria-label="Saanjh Studio home">
            <Logo light={transparent} />
          </Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
            {NAV_LINKS.slice(1).map((l) => (
              <Link key={l.href} href={l.href} className={cn("link-underline pb-0.5 text-sm", pathname === l.href && "bg-[length:100%_1px]")}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/client-gallery" className="hidden text-sm opacity-80 transition-opacity duration-150 hover:opacity-100 md:inline">
              Client gallery
            </Link>
            <Link
              href="/contact"
              className={cn(
                "hidden h-9 items-center gap-1.5 px-4 text-sm font-medium transition-colors duration-150 sm:inline-flex",
                transparent ? "border border-ivory/60 hover:bg-ivory hover:text-charcoal" : "bg-charcoal text-ivory hover:bg-ink",
              )}
            >
              Book a shoot
            </Link>
            <button className="grid size-10 place-items-center lg:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30 flex flex-col bg-ivory pt-24 lg:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav className="container-x flex flex-1 flex-col justify-center gap-1" aria-label="Mobile">
              {[...NAV_LINKS, { href: "/packages", label: "Packages" }, { href: "/grid-studio", label: "Photo Grid Studio" }].map((l, i) => (
                <motion.div key={l.href} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.045, duration: 0.5 }}>
                  <Link href={l.href} className="font-display flex items-baseline justify-between border-b border-line py-3 text-3xl">
                    {l.label}
                    <span className="text-xs tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="container-x grid grid-cols-2 gap-3 pb-10 pt-6">
              <Link href="/client-gallery" className="flex h-12 items-center justify-center border border-charcoal/30 text-sm font-medium">
                Client Gallery
              </Link>
              <Link href="/contact" className="flex h-12 items-center justify-center gap-1 bg-charcoal text-sm font-medium text-ivory">
                Book a shoot <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

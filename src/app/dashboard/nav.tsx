"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/galleries", label: "Galleries" },
  { href: "/dashboard/bookings", label: "Bookings & payments" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar -mb-px flex gap-6 overflow-x-auto" aria-label="Dashboard">
      {LINKS.map((l) => {
        const active = l.href === "/dashboard" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={cn("shrink-0 border-b-2 py-3 text-sm transition-colors duration-150", active ? "border-charcoal text-charcoal" : "border-transparent text-muted hover:text-charcoal")}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

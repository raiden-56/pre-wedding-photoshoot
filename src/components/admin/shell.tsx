"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  BookHeart,
  CalendarDays,
  Camera,
  CreditCard,
  ExternalLink,
  Heart,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquareQuote,
  Package,
  Settings,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/misc";
import { cn, initials } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: BookHeart },
  { href: "/admin/photoshoots", label: "Photoshoots", icon: Camera },
  { href: "/admin/galleries", label: "Galleries", icon: Images },
  { href: "/admin/uploads", label: "Uploads", icon: Upload },
  { href: "/admin/selections", label: "Photo Selection", icon: Heart },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ user, studioName, unread, children }: { user: { name: string; email: string; role: string }; studioName: string; unread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Studio">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className={cn("relative flex items-center gap-3 rounded-[2px] px-3 py-2 text-[13px] transition", active ? "bg-charcoal text-ivory" : "text-ink hover:bg-charcoal/5")}>
            <n.icon className="size-4" strokeWidth={1.6} />
            {n.label}
            {n.href === "/admin/notifications" && unread > 0 && <span className={cn("ml-auto rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-ivory text-charcoal" : "bg-olive text-white")}>{unread}</span>}
          </Link>
        );
      })}
      <div className="my-3 h-px bg-line" />
      <Link href="/grid-studio" className="flex items-center gap-3 rounded-[2px] px-3 py-2 text-[13px] text-ink hover:bg-charcoal/5">
        <LayoutGrid className="size-4" strokeWidth={1.6} /> Photo Grid Studio
      </Link>
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-[2px] px-3 py-2 text-[13px] text-ink hover:bg-charcoal/5">
        <ExternalLink className="size-4" strokeWidth={1.6} /> View website
      </Link>
    </nav>
  );

  const account = (
    <div className="flex items-center gap-3 border-t border-line px-5 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-champagne text-xs font-semibold">{initials(user.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{user.name}</p>
        <p className="truncate text-[11px] text-muted">{user.role === "ADMIN" ? "Studio admin" : "Photographer"}</p>
      </div>
      <form action={logoutAction}>
        <button className="grid size-8 place-items-center rounded-full text-muted hover:bg-charcoal/5 hover:text-charcoal" aria-label="Sign out" title="Sign out">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-svh bg-ivory lg:grid lg:grid-cols-[248px_1fr] print:block">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-line bg-ivory print:hidden lg:flex">
        <div className="px-6 pb-6 pt-6">
          <Link href="/admin"><Logo /></Link>
          <p className="mt-3 truncate text-[11px] uppercase tracking-[0.2em] text-muted">{studioName}</p>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">{nav}</div>
        {account}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ivory/95 px-4 backdrop-blur print:hidden lg:hidden">
        <Link href="/admin"><Logo className="scale-90" /></Link>
        <div className="flex items-center gap-1">
          <Link href="/admin/notifications" className="relative grid size-10 place-items-center" aria-label="Notifications">
            <Bell className="size-5" />
            {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-olive" />}
          </Link>
          <button onClick={() => setOpen(true)} className="grid size-10 place-items-center" aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-charcoal/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-ivory pt-4 lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
              <div className="mb-4 flex items-center justify-between px-5">
                <Logo />
                <button onClick={() => setOpen(false)} className="grid size-9 place-items-center" aria-label="Close navigation">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{nav}</div>
              {account}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

export function CalendarIcon() {
  return <CalendarDays className="size-4" />;
}

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBox({ placeholder = "Search…", param = "q" }: { placeholder?: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(sp.get(param) ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get(param) ?? "") === value) return;
      const next = new URLSearchParams(sp);
      if (value) next.set(param, value);
      else next.delete(param);
      next.delete("page");
      router.replace(`${pathname}?${next}`);
    }, 300);
    return () => clearTimeout(t);
  }, [value, sp, param, pathname, router]);
  return (
    <label className="relative block w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="field pl-9" aria-label={placeholder} />
    </label>
  );
}

export function FilterTabs({ options, param = "status", current }: { options: { value: string; label: string; count?: number }[]; param?: string; current?: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto">
      {options.map((o) => {
        const next = new URLSearchParams(sp);
        if (o.value) next.set(param, o.value);
        else next.delete(param);
        next.delete("page");
        const active = (current ?? "") === o.value;
        return (
          <Link key={o.value} href={`${pathname}?${next}`} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs transition", active ? "bg-charcoal text-ivory" : "text-ink hover:bg-charcoal/5")}>
            {o.label}
            {o.count != null && <span className={cn("ml-1.5 tabular-nums", active ? "text-ivory/60" : "text-muted")}>{o.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const next = new URLSearchParams(sp);
    next.set("page", String(p));
    return `${pathname}?${next}`;
  };
  return (
    <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pagination">
      <span className="text-muted">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={cn("grid size-9 place-items-center border border-line bg-white", page <= 1 && "pointer-events-none opacity-40")} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
        <Link aria-disabled={page >= pageCount} href={href(Math.min(pageCount, page + 1))} className={cn("grid size-9 place-items-center border border-line bg-white", page >= pageCount && "pointer-events-none opacity-40")} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </nav>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalEvent = { id: string; date: Date; title: string; href: string; tone?: "olive" | "champagne" | "charcoal" | "taupe" };

/** Server-rendered month grid. Navigation via ?month=YYYY-MM. */
export function MonthCalendar({ month, events, basePath, query = "" }: { month: Date; events: CalEvent[]; basePath: string; query?: string }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((startOffset + days) / 7) * 7 }, (_, i) => {
    const d = i - startOffset + 1;
    return d >= 1 && d <= days ? new Date(month.getFullYear(), month.getMonth(), d) : null;
  });
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const today = new Date();
  const tone = { olive: "bg-olive text-white", champagne: "bg-champagne text-charcoal", charcoal: "bg-charcoal text-ivory", taupe: "bg-taupe/40 text-charcoal" };

  return (
    <div className="border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-display text-2xl">{month.toLocaleString("en-IN", { month: "long", year: "numeric" })}</p>
        <div className="flex gap-1">
          <Link href={`${basePath}?${query}&month=${key(prev)}`} className="grid size-8 place-items-center border border-line hover:bg-ivory" aria-label="Previous month"><ChevronLeft className="size-4" /></Link>
          <Link href={`${basePath}?${query}&month=${key(today)}`} className="grid h-8 place-items-center border border-line px-3 text-xs hover:bg-ivory">Today</Link>
          <Link href={`${basePath}?${query}&month=${key(next)}`} className="grid size-8 place-items-center border border-line hover:bg-ivory" aria-label="Next month"><ChevronRight className="size-4" /></Link>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-line text-center text-[10px] uppercase tracking-[0.15em] text-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const list = d ? events.filter((e) => e.date.toDateString() === d.toDateString()) : [];
          const isToday = d?.toDateString() === today.toDateString();
          return (
            <div key={i} className={cn("min-h-20 border-b border-r border-line p-1.5 sm:min-h-28", !d && "bg-ivory/50", (i + 1) % 7 === 0 && "border-r-0")}>
              {d && <p className={cn("mb-1 inline-grid size-6 place-items-center rounded-full text-[11px] tabular-nums", isToday && "bg-charcoal text-ivory")}>{d.getDate()}</p>}
              <div className="space-y-1">
                {list.slice(0, 3).map((e) => (
                  <Link key={e.id} href={e.href} className={cn("block truncate rounded-[2px] px-1.5 py-0.5 text-[10px] sm:text-[11px]", tone[e.tone ?? "olive"])} title={e.title}>
                    <span className="hidden sm:inline">{e.date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · </span>
                    {e.title}
                  </Link>
                ))}
                {list.length > 3 && <p className="text-[10px] text-muted">+{list.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function parseMonth(v?: string) {
  const m = v && /^(\d{4})-(\d{2})$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

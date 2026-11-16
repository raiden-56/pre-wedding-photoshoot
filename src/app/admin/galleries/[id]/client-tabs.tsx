"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type TabDef = { id: string; label: string; count?: number };

/** Tab bar + panes switched in the browser (used by the static demo, where the server can't read ?tab). */
export function ClientTabs({ tabs, panes }: { tabs: TabDef[]; panes: Record<string, React.ReactNode> }) {
  const sp = useSearchParams();
  const want = sp.get("tab");
  const active = tabs.some((t) => t.id === want) ? want! : tabs[0].id;
  return (
    <>
      <TabNav tabs={tabs} active={active} />
      {panes[active]}
    </>
  );
}

export function TabNav({ tabs, active }: { tabs: TabDef[]; active: string }) {
  return (
    <nav className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Gallery sections">
      {tabs.map((t) => (
        <Link key={t.id} href={`?tab=${t.id}`} scroll={false} aria-current={active === t.id ? "page" : undefined} className={cn("relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] transition-colors", active === t.id ? "border-charcoal text-charcoal" : "border-transparent text-muted hover:text-charcoal")}>
          {t.label}
          {!!t.count && <span className="rounded-full bg-olive px-1.5 text-[10px] text-white">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

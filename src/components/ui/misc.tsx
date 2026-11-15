import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-charcoal/[0.06] text-ink",
  olive: "bg-olive/15 text-olive-deep",
  champagne: "bg-champagne text-charcoal",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/12 text-danger",
  dark: "bg-charcoal text-ivory",
} as const;

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof tones; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide", tones[tone], className)}>{children}</span>;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center border border-dashed border-line px-6 py-16 text-center", className)}>
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-champagne/50 text-olive-deep [&_svg]:size-5">{icon}</div>}
      <p className="font-display text-2xl">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Panel({ title, action, className, children, bodyClassName }: { title?: React.ReactNode; action?: React.ReactNode; className?: string; children: React.ReactNode; bodyClassName?: string }) {
  return (
    <section className={cn("border border-line bg-white", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[13px] font-semibold tracking-wide">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-4xl leading-none sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", light ? "text-ivory" : "text-charcoal", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect x="3.5" y="3.5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="8" y="8" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.55" />
        <path d="M8 20.5c3.2-4.6 6.6-6.9 8-6.9s4.8 2.3 8 6.9" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="16" cy="11.5" r="1.6" fill="currentColor" />
      </svg>
      <span className="leading-none">
        <span className="font-display block text-[1.45rem] tracking-[0.02em]">Saanjh</span>
        <span className="block text-[0.5rem] tracking-[0.45em] uppercase opacity-70">Studio</span>
      </span>
    </span>
  );
}

export function StatusDot({ tone }: { tone: "olive" | "warning" | "danger" | "neutral" | "success" }) {
  const c = { olive: "bg-olive", warning: "bg-warning", danger: "bg-danger", neutral: "bg-taupe", success: "bg-success" }[tone];
  return <span className={cn("inline-block size-1.5 rounded-full", c)} />;
}

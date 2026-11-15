"use client";

import { useState } from "react";

type Datum = { label: string; value: number; hint?: string };

/**
 * Single-series bar chart: thin bars with 4px rounded data-ends anchored to the
 * baseline, recessive grid, per-bar hover tooltip and an sr-only table view.
 * One series → no legend; the panel title names it.
 */
export function BarChart({ data, format, height = 200, title }: { data: Datum[]; format: (n: number) => string; height?: number; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const ticks = [0, nice / 2, nice];
  const W = 100 / Math.max(1, data.length);
  const maxIdx = data.findIndex((d) => d.value === max);

  return (
    <figure className="relative" aria-label={title}>
      <div className="relative" style={{ height }}>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / nice) * 100}%` }}>
            <span className="w-14 shrink-0 -translate-y-1/2 text-right text-[10px] tabular-nums text-muted">{format(t)}</span>
            <span className={`h-px flex-1 ${t === 0 ? "bg-charcoal/30" : "bg-line/70"}`} />
          </div>
        ))}
        <div className="absolute bottom-0 left-16 right-0 top-0 flex items-end">
          {data.map((d, i) => {
            const h = (d.value / nice) * 100;
            return (
              <div
                key={d.label}
                className="relative flex h-full items-end justify-center"
                style={{ width: `${W}%` }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.label}: ${format(d.value)}`}
              >
                <div
                  className={`w-[42%] max-w-7 rounded-t-[4px] transition-colors ${hover === i ? "bg-charcoal" : "bg-olive"}`}
                  style={{ height: `${Math.max(d.value > 0 ? 1.5 : 0, h)}%` }}
                />
                {i === maxIdx && hover == null && d.value > 0 && (
                  <span className="absolute -translate-y-1 whitespace-nowrap text-[10px] font-medium tabular-nums text-ink" style={{ bottom: `${h}%` }}>
                    {format(d.value)}
                  </span>
                )}
                {hover === i && (
                  <div className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap border border-line bg-white px-2.5 py-1.5 text-[11px] shadow-lg" style={{ bottom: `${h}%` }}>
                    <p className="font-medium text-charcoal">{format(d.value)}</p>
                    <p className="text-muted">{d.hint ?? d.label}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="ml-16 mt-2 flex">
        {data.map((d) => (
          <span key={d.label} className="text-center text-[10px] uppercase tracking-wider text-muted" style={{ width: `${W}%` }}>
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function niceMax(v: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return n * exp;
}

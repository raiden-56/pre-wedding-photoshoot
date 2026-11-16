import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { POSE_GROUPS } from "@/content/poses";
import { photo } from "@/content/photos";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "Poses for pre-wedding and post-wedding shoots",
  description: "Sixteen easy poses for your pre-wedding and post-wedding photoshoot, with simple directions for each — from the walk and talk to the veil in the wind.",
  alternates: { canonical: "/poses" },
};

export default function PosesPage() {
  return (
    <>
      <section className="container-x pb-10 pt-32 sm:pt-36">
        <p className="eyebrow mb-3">Pose guide</p>
        <h1 className="font-display max-w-3xl text-display">Poses for your pre-wedding and post-wedding shoot</h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink/80">You don’t need to be a model. Each pose here is a small direction we give on the day — read them once, then forget them, and we’ll guide you gently through the rest.</p>
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Pose groups">
          {POSE_GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="inline-flex h-10 items-center rounded-full border border-charcoal/15 px-4 text-sm transition-colors duration-150 hover:border-charcoal">
              {g.title} <span className="ml-2 text-xs tabular-nums text-muted">{g.poses.length}</span>
            </a>
          ))}
        </nav>
      </section>

      {POSE_GROUPS.map((g, gi) => (
        <section key={g.id} id={g.id} className={`scroll-mt-20 py-16 sm:py-20 ${gi % 2 ? "bg-white" : ""}`}>
          <div className="container-x">
            <div className="mb-10 grid gap-4 lg:grid-cols-12">
              <h2 className="font-display text-headline lg:col-span-5">{g.title}</h2>
              <p className="self-end text-[15px] leading-relaxed text-ink/80 lg:col-span-6 lg:col-start-7">{g.intro}</p>
            </div>
            <ol className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {g.poses.map((p, i) => {
                const img = photo(p.photo);
                return (
                  <li key={p.id} id={p.id} className="scroll-mt-24">
                    <Reveal delay={(i % 4) * 0.05}>
                      <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
                        <Image src={img.src} alt={img.alt} fill sizes="(min-width:1024px) 23vw, (min-width:640px) 46vw, 92vw" quality={85} className="object-cover" />
                      </div>
                      <p className="mt-4 text-xs tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</p>
                      <h3 className="font-display mt-1 text-2xl">{p.name}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.why}</p>
                      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink">
                        {p.steps.map((s) => (
                          <li key={s} className="flex gap-2.5">
                            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-olive" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ))}

      <section className="container-x py-16 sm:py-20">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-charcoal/10 pt-10 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl">Nervous in front of the camera?</h2>
            <p className="mt-2 max-w-xl text-[15px] text-ink/80">Most couples are. We plan the light, the location and the poses with you before the day.</p>
          </div>
          <Link href="/contact" className="inline-flex h-12 shrink-0 items-center gap-2 bg-charcoal px-6 text-sm font-medium text-ivory transition-colors duration-150 hover:bg-ink">
            Plan your shoot <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

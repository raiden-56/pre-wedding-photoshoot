import Image from "next/image";
import { InfiniteSlider } from "@/components/motion/infinite-slider";
import { photo } from "@/content/photos";

/** Two counter-drifting rows of prints — slows down under the cursor so a frame can be studied. */
export function PhotoMarquee({ rows }: { rows: [string[], string[]] }) {
  return (
    <div className="space-y-3 overflow-hidden py-2" aria-label="A strip of recent photographs">
      {rows.map((ids, r) => (
        <InfiniteSlider key={r} gap={12} speed={r ? 28 : 36} speedOnHover={6} reverse={r === 1}>
          {ids.map((id) => {
            const p = photo(id);
            const portrait = p.height > p.width;
            return (
              <div key={id} className={`relative h-[200px] shrink-0 overflow-hidden bg-ivory-deep sm:h-[260px] ${portrait ? "w-[150px] sm:w-[190px]" : "w-[280px] sm:w-[380px]"}`}>
                <Image src={p.src} alt={p.alt} fill sizes="380px" className="object-cover" />
              </div>
            );
          })}
        </InfiniteSlider>
      ))}
    </div>
  );
}

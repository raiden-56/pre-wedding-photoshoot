/** Tiny, safe markdown subset renderer (## headings, paragraphs, - lists). No HTML injection. */
export function Prose({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-6 text-[16px] leading-[1.85] text-ink/85">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) return <h2 key={i} className="font-display pt-4 text-3xl text-charcoal">{b.slice(3)}</h2>;
        if (b.split("\n").every((l) => l.startsWith("- ")))
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.split("\n").map((l, k) => (
                <li key={k}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        const [first, ...rest] = b.split("\n");
        if (first.startsWith("## "))
          return (
            <div key={i}>
              <h2 className="font-display pt-4 text-3xl text-charcoal">{first.slice(3)}</h2>
              <p className="mt-3">{rest.join(" ")}</p>
            </div>
          );
        return <p key={i}>{b.replace(/\n/g, " ")}</p>;
      })}
    </div>
  );
}

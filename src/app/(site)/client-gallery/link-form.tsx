"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/form";

export function GalleryLinkForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const url = new URL(value.trim(), window.location.origin);
          if (!/^\/(gallery|guest)\//.test(url.pathname)) throw new Error();
          router.push(url.pathname + url.search);
        } catch {
          setError("That doesn’t look like a gallery link.");
        }
      }}
    >
      <div className="flex-1">
        <Input value={value} onChange={(e) => (setValue(e.target.value), setError(null))} placeholder="https://…/gallery/…" aria-label="Gallery link" />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <button className="grid h-[42px] w-11 shrink-0 place-items-center bg-charcoal text-ivory" aria-label="Open gallery">
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}

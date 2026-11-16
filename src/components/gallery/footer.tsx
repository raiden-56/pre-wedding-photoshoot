import Link from "next/link";
import { Logo } from "@/components/ui/misc";

export function GalleryFooter() {
  return (
    <footer className="border-t border-line py-10">
      <div className="container-x flex flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
        <Link href="/" aria-label="Saanjh Studio">
          <Logo />
        </Link>
        <p className="text-center">Private gallery · please don’t post links publicly · photographs © Saanjh Studio</p>
      </div>
    </footer>
  );
}

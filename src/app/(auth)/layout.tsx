import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/ui/misc";
import { photo } from "@/content/photos";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const p = photo("45");
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-charcoal lg:block">
        <Image src={p.src} alt={p.alt} fill priority sizes="50vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent" />
        <p className="font-display absolute bottom-12 left-12 max-w-md text-4xl leading-tight text-ivory">Make every photograph feel like a memory worth keeping.</p>
      </div>
      <div className="flex flex-col px-5 py-8 sm:px-12">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
      </div>
    </div>
  );
}

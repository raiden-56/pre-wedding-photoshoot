import Link from "next/link";
import { requireClientPage } from "@/lib/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/ui/misc";
import { DashboardNav } from "./nav";

export const metadata = { title: { default: "Your dashboard", template: "%s · Your dashboard" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClientPage();
  return (
    <div className="min-h-svh bg-ivory">
      <header className="border-b border-charcoal/10 bg-ivory">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="Saanjh Studio home">
            <Logo />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
        <div className="container-x">
          <DashboardNav />
        </div>
      </header>
      <main className="container-x py-10 sm:py-12">{children}</main>
    </div>
  );
}

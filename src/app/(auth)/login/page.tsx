import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser, isStaff } from "@/lib/auth/session";
import { GuestMode } from "@/components/demo/guest-mode";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user) ? "/admin" : "/dashboard");
  return (
    <>
      <p className="eyebrow mb-3">Welcome back</p>
      <h1 className="font-display text-5xl">Sign in</h1>
      <p className="mb-8 mt-3 text-sm text-muted">Couples and studio team members sign in here. Family members can open galleries straight from their invitation link.</p>
      <GuestMode className="mb-8" />
      <LoginForm next={next} />
      <p className="mt-8 text-sm text-muted">
        Photographer setting up a new studio?{" "}
        <Link href="/register" className="text-charcoal underline underline-offset-4">
          Create a studio account
        </Link>
      </p>
    </>
  );
}

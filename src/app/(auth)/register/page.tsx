import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/forms";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Create a studio account", robots: { index: false } };

export default async function RegisterPage() {
  const open = process.env.ALLOW_STUDIO_SIGNUP === "true" || (await db.studio.count()) === 0;
  return (
    <>
      <p className="eyebrow mb-3">For photographers</p>
      <h1 className="font-display text-5xl">Create your studio</h1>
      {open ? (
        <>
          <p className="mb-8 mt-3 text-sm text-muted">Manage clients, shoots, private galleries, selections, payments and deliveries in one place.</p>
          <RegisterForm />
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">Studio sign-up is currently closed on this installation. Set <code className="bg-ivory-deep px-1">ALLOW_STUDIO_SIGNUP=true</code> to allow new studios.</p>
      )}
      <p className="mt-8 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-charcoal underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}

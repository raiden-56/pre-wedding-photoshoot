"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";

/** Client wrapper so server layouts don't pass the action across the server/client boundary themselves. */
export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button className="inline-flex items-center gap-1.5 text-ink transition-colors duration-150 hover:text-charcoal">
        <LogOut className="size-4" /> Sign out
      </button>
    </form>
  );
}

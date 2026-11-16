import Link from "next/link";
import { EmptyState } from "@/components/ui/misc";

export function NotLinked() {
  return (
    <EmptyState
      title="Your account isn’t linked to a booking yet"
      description="The studio links your account once your booking is confirmed. If you think this is a mistake, contact the studio."
      action={
        <Link href="/contact" className="text-sm font-medium underline underline-offset-2">
          Contact the studio
        </Link>
      }
    />
  );
}

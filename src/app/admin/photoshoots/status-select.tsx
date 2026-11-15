"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SHOOT_STATUSES } from "@/lib/validation";
import { SHOOT_STATUS_LABEL } from "@/components/admin/status";
import { setShootStatus } from "@/server/actions/admin";
import { toast } from "@/components/ui/toaster";
import { Select } from "@/components/ui/form";

export function ShootStatusSelect({ id, value }: { id: string; value: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label="Photoshoot status"
      defaultValue={value}
      disabled={pending}
      className="h-9 py-1 text-xs"
      onChange={(e) =>
        start(async () => {
          const r = await setShootStatus(id, e.target.value);
          if (r.ok) {
            toast(r.message ?? "Updated");
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      {SHOOT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {SHOOT_STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}

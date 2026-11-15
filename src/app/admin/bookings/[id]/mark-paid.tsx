"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { markPaymentPaid } from "@/server/actions/admin";

export function MarkPaid({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [ref, setRef] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Mark received</Button>;
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="h-8 w-32 py-0 text-xs" aria-label="Method">
        <option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank</option><option value="CASH">Cash</option><option value="CARD">Card</option>
      </Select>
      <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference" className="h-8 w-36 py-0 text-xs" />
      <Button size="sm" disabled={pending} onClick={() => start(async () => {
        const r = await markPaymentPaid(paymentId, method, ref);
        if (r.ok) { toast(r.message ?? "Saved"); router.refresh(); } else toast.error(r.error);
      })}>
        {pending ? <Loader2 className="animate-spin" /> : <Check />} Confirm
      </Button>
    </div>
  );
}

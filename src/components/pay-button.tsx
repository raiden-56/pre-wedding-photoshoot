"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { confirmOnlinePayment, startOnlinePayment } from "@/server/actions/payments";

type RzpResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(s);
  });
}

export function PayButton({ paymentId, label = "Pay online" }: { paymentId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await startOnlinePayment(paymentId);
          if (!res.ok) return toast.error(res.error);
          await loadCheckout();
          const d = res.data!;
          const rzp = new window.Razorpay!({
            key: d.key,
            amount: d.amount,
            currency: "INR",
            order_id: d.orderId,
            name: d.name,
            description: d.description,
            prefill: d.prefill,
            theme: { color: "#242321" },
            handler: async (r: RzpResponse) => {
              const v = await confirmOnlinePayment(paymentId, r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
              if (v.ok) toast(v.message ?? "Payment confirmed");
              else toast.error(v.error);
              router.refresh();
            },
          });
          rzp.on("payment.failed", () => toast.error("Payment failed", "No money was taken. You can try again."));
          rzp.open();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Payment error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <CreditCard />}
      {label}
    </Button>
  );
}

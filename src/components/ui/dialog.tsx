"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  side = "center",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string; description?: string; side?: "center" | "right" | "bottom" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-up_.3s_ease]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 bg-ivory shadow-2xl focus:outline-none",
          side === "center" && "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 sm:p-8",
          side === "right" && "inset-y-0 right-0 h-dvh w-full max-w-xl overflow-y-auto p-6 sm:p-8",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl p-5 pb-8",
          className,
        )}
        {...props}
      >
        {side === "bottom" && <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-taupe/60" />}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="font-display text-3xl leading-tight">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1.5 text-sm text-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded-full p-1.5 text-muted transition hover:bg-charcoal/5 hover:text-charcoal" aria-label="Close">
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

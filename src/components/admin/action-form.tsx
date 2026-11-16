"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { ActionResult } from "@/lib/utils";
import { DEMO, DEMO_MESSAGE } from "@/lib/demo";

export type FormAction = (prev: ActionResult<unknown> | undefined, formData: FormData) => Promise<ActionResult<unknown>>;

/** Server-action form with field errors, toast on success, and router refresh. */
export function ActionForm({
  action,
  children,
  className,
  onSuccess,
  resetOnSuccess,
}: {
  action: FormAction;
  children: ReactNode | ((state: ActionResult<unknown> | undefined) => ReactNode);
  className?: string;
  onSuccess?: (res: ActionResult<unknown>) => void;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, undefined);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (state.message) toast(state.message);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      router.refresh();
    } else if (!state.fieldErrors) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {typeof children === "function" ? children(state) : children}
      {state && !state.ok && state.fieldErrors && <FormError message={state.error} />}
    </form>
  );
}

export function fieldError(state: ActionResult<unknown> | undefined, name: string) {
  return state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;
}

/** Dialog wrapping an ActionForm that closes itself on success. */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  children,
  side,
  submitLabel = "Save",
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  action: FormAction;
  children: (state: ActionResult<unknown> | undefined) => ReactNode;
  side?: "center" | "right" | "bottom";
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description} side={side}>
        <ActionForm action={action} onSuccess={() => setOpen(false)} className="space-y-4">
          {(state) => (
            <>
              {children(state)}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <PendingSubmit>{submitLabel}</PendingSubmit>
              </div>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

import { useFormStatus } from "react-dom";
function PendingSubmit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

/** Button that runs a server action (with optional confirmation) and refreshes. */
export function ActionButton({
  action,
  confirm,
  children,
  successMessage,
  ...props
}: Omit<ButtonProps, "onClick" | "action"> & { action: () => Promise<ActionResult<unknown>>; confirm?: string; successMessage?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={async () => {
        if (DEMO) return toast.info("Demo mode", DEMO_MESSAGE);
        if (confirm && !window.confirm(confirm)) return;
        setPending(true);
        try {
          const res = await action();
          if (res.ok) {
            toast(res.message ?? successMessage ?? "Done");
            router.refresh();
          } else toast.error(res.error);
        } catch (e) {
          toast.error("Something went wrong", e instanceof Error ? e.message : undefined);
        } finally {
          setPending(false);
        }
      }}
    >
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

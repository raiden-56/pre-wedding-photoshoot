"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { inquirySchema, type InquiryInput } from "@/lib/validation";
import { BUDGET_RANGES, SHOOT_TYPES } from "@/content/site";
import { submitInquiry } from "@/server/actions/public";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function InquiryForm({ packages, defaultPackage }: { packages: { id: string; name: string }[]; defaultPackage?: string }) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const form = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { shootType: "Pre-Wedding", packageId: defaultPackage ?? "", budget: "", website: "" },
  });
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    start(async () => {
      const res = await submitInquiry(values);
      if (res.ok) {
        setDone(res.data?.reference ?? "");
        form.reset();
      } else {
        setServerError(res.error);
        Object.entries(res.fieldErrors ?? {}).forEach(([k, v]) => v?.[0] && form.setError(k as keyof InquiryInput, { message: v[0] }));
      }
    });
  });

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="border border-line bg-white p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-olive text-white">
            <Check className="size-6" />
          </div>
          <p className="font-display mt-6 text-4xl">Thank you — we’ve got it.</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            Your inquiry reference is <strong className="text-charcoal">{done}</strong>. We reply within one working day with availability, ideas and next steps.
          </p>
          <Button variant="outline" className="mt-8" onClick={() => setDone(null)}>
            Send another inquiry
          </Button>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Field label="Your name *" error={e.name?.message} htmlFor="name">
            <Input id="name" autoComplete="name" {...form.register("name")} />
          </Field>
          <Field label="Partner’s name" error={e.partnerName?.message} htmlFor="partnerName">
            <Input id="partnerName" {...form.register("partnerName")} />
          </Field>
          <Field label="Email *" error={e.email?.message} htmlFor="email">
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          <Field label="Phone / WhatsApp *" error={e.phone?.message} htmlFor="phone">
            <Input id="phone" type="tel" autoComplete="tel" placeholder="+91" {...form.register("phone")} />
          </Field>
          <Field label="Photoshoot type *" error={e.shootType?.message} htmlFor="shootType">
            <Select id="shootType" {...form.register("shootType")}>
              {SHOOT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Preferred date" error={e.preferredDate?.message} htmlFor="preferredDate">
            <Input id="preferredDate" type="date" {...form.register("preferredDate")} />
          </Field>
          <Field label="Preferred location" error={e.location?.message} htmlFor="location">
            <Input id="location" placeholder="Goa, Udaipur, your hometown…" {...form.register("location")} />
          </Field>
          <Field label="Package preference" htmlFor="packageId">
            <Select id="packageId" {...form.register("packageId")}>
              <option value="">Not sure yet</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Budget range" className="sm:col-span-2" htmlFor="budget">
            <div className="flex flex-wrap gap-2">
              {BUDGET_RANGES.map((b) => (
                <label key={b} className="cursor-pointer">
                  <input type="radio" value={b} {...form.register("budget")} className="peer sr-only" />
                  <span className="inline-block rounded-full border border-line px-3.5 py-1.5 text-xs transition peer-checked:border-charcoal peer-checked:bg-charcoal peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-olive">
                    {b}
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Tell us about the two of you" className="sm:col-span-2" error={e.message?.message} htmlFor="message">
            <Textarea id="message" rows={5} placeholder="How you met, the mood you love, any must-have moments…" {...form.register("message")} />
          </Field>
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...form.register("website")} />
          <div className="sm:col-span-2">
            <FormError message={serverError} />
            <div className="mt-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">We’ll only use your details to reply to this inquiry.</p>
              <Button type="submit" size="lg" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                {pending ? "Sending…" : "Send inquiry"}
              </Button>
            </div>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

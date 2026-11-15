"use client";

import { useActionState } from "react";
import { Field, FormError, Input, SubmitButton } from "@/components/ui/form";
import { loginAction, registerAction, setPasswordAction, type FormState } from "@/server/actions/auth";

const fe = (s: FormState, k: string) => s?.fieldErrors?.[k]?.[0];

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" error={fe(state, "email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" error={fe(state, "password")} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <Field label="Studio name" error={fe(state, "studioName")} htmlFor="studioName">
        <Input id="studioName" name="studioName" required />
      </Field>
      <Field label="Your name" error={fe(state, "name")} htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Email" error={fe(state, "email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" error={fe(state, "password")} hint="At least 8 characters with a letter and a number" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton className="w-full" size="lg" pendingText="Creating studio…">
        Create studio account
      </SubmitButton>
    </form>
  );
}

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(setPasswordAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" error={fe(state, "password")} hint="At least 8 characters with a letter and a number" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" error={fe(state, "confirm")} htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton className="w-full" size="lg" pendingText="Saving…">
        Set password &amp; continue
      </SubmitButton>
    </form>
  );
}

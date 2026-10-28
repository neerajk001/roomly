"use client";

import { Field } from "@/components/auth/field";
import { SubmitButton } from "@/components/auth/submit-button";
import { resendVerificationAction, type AuthFormState } from "@/app/(auth)/actions";
import { useActionState } from "react";

const initialState: AuthFormState = {};

export function ResendVerificationForm() {
  const [state, formAction] = useActionState(resendVerificationAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.notice !== undefined && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.notice}
        </p>
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <SubmitButton pendingText="Sending…">Resend verification email</SubmitButton>
    </form>
  );
}

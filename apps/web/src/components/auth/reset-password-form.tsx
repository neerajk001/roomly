"use client";

import { Field } from "@/components/auth/field";
import { SubmitButton } from "@/components/auth/submit-button";
import { resetPasswordAction, type AuthFormState } from "@/app/(auth)/actions";
import { useActionState } from "react";

const initialState: AuthFormState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        errors={state.fieldErrors?.password}
      />
      <SubmitButton pendingText="Updating…">Update password</SubmitButton>
    </form>
  );
}

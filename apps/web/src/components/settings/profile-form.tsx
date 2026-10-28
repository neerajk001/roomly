"use client";

import { updateProfileAction, type SettingsState } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

const initialState: SettingsState = {};

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.notice !== undefined && (
        <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {state.notice}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          maxLength={80}
          required
          aria-invalid={state.fieldErrors?.name !== undefined ? true : undefined}
        />
        {state.fieldErrors?.name?.map((message) => (
          <p key={message} role="alert" className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>
      <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}

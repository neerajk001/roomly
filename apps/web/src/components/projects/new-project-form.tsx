"use client";

import { createProjectAction, type ProjectFormState } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

const initialState: ProjectFormState = {};

export function NewProjectForm({ basePath }: { basePath: "/app" | "/studio" }) {
  const [state, formAction, pending] = useActionState(createProjectAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="basePath" value={basePath} />
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          placeholder="E.g. Living room refresh"
          aria-invalid={state.fieldErrors?.name !== undefined ? true : undefined}
          autoFocus
        />
        {state.fieldErrors?.name?.map((message) => (
          <p key={message} role="alert" className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}

"use client";

import { createProjectAction, type ProjectFormState } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

const initialState: ProjectFormState = {};

export function NewProjectForm({
  basePath,
  clients,
  autoFocus = true,
}: {
  basePath: "/app" | "/studio";
  clients?: { id: string; name: string }[];
  autoFocus?: boolean;
}) {
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
          autoFocus={autoFocus}
        />
        {state.fieldErrors?.name?.map((message) => (
          <p key={message} role="alert" className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>
      {clients !== undefined && clients.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="clientId">Client (optional)</Label>
          <select
            id="clientId"
            name="clientId"
            defaultValue=""
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}

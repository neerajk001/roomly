"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createClientAction,
  updateClientAction,
  type ClientFormState,
} from "@/server/actions/clients";
import { useActionState } from "react";

export interface ClientFormValues {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export function ClientForm({ client }: { client?: ClientFormValues }) {
  const action = client?.id !== undefined ? updateClientAction : createClientAction;
  const [state, formAction, pending] = useActionState(action, {} as ClientFormState);

  return (
    <form action={formAction} className="space-y-4">
      {client?.id !== undefined && <input type="hidden" name="clientId" value={client.id} />}
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="client-name">Name</Label>
          <Input id="client-name" name="name" required defaultValue={client?.name ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-email">Email</Label>
          <Input
            id="client-email"
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-phone">Phone</Label>
          <Input id="client-phone" name="phone" defaultValue={client?.phone ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="client-notes">Notes</Label>
          <textarea
            id="client-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={client?.notes ?? ""}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : client?.id !== undefined ? "Save client" : "Add client"}
      </Button>
    </form>
  );
}

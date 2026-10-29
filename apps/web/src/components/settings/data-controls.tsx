"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction, type AccountState } from "@/server/actions/account";
import { useActionState, useState } from "react";

export function DataControls() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, {} as AccountState);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <a
          href="/api/account/export"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/50"
        >
          Export my data (JSON)
        </a>
        <Button type="button" size="sm" variant="outline" onClick={() => { setOpen((value) => !value); }}>
          {open ? "Cancel" : "Delete my account"}
        </Button>
      </div>

      {open && (
        <form action={formAction} className="space-y-3 rounded-lg border border-destructive/40 p-4">
          <p className="text-sm text-destructive">
            This deletes your account, workspace, projects, rooms, renders and credits. It cannot be
            undone.
          </p>
          {state.error !== undefined && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input id="delete-confirm" name="confirm" autoComplete="off" />
          </div>
          <Button type="submit" size="sm" variant="destructive" disabled={pending}>
            {pending ? "Deleting..." : "Permanently delete"}
          </Button>
        </form>
      )}
    </div>
  );
}

"use client";

import { updateWorkspaceAction, type SettingsState } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@roomdesigner/shared";
import { useActionState } from "react";

const initialState: SettingsState = {};

interface WorkspacePreferencesFormProps {
  mode: string;
  currency: string;
  unitSystem: string;
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function WorkspacePreferencesForm({
  mode,
  currency,
  unitSystem,
}: WorkspacePreferencesFormProps) {
  const [state, formAction, pending] = useActionState(updateWorkspaceAction, initialState);

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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="mode">Mode</Label>
          <select id="mode" name="mode" defaultValue={mode} className={selectClass}>
            <option value="HOME">Home</option>
            <option value="PRO">Professional</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <select id="currency" name="currency" defaultValue={currency} className={selectClass}>
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitSystem">Units</Label>
          <select
            id="unitSystem"
            name="unitSystem"
            defaultValue={unitSystem}
            className={selectClass}
          >
            <option value="METRIC">Metric (m, cm)</option>
            <option value="IMPERIAL">Imperial (ft, in)</option>
          </select>
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}

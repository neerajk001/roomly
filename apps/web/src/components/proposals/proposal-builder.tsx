"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProposalAction, type ProposalFormState } from "@/server/actions/proposals";
import { useActionState, useState } from "react";

export function ProposalBuilder({
  projectId,
  estimates,
  outputs,
  defaultTerms,
}: {
  projectId: string;
  estimates: { id: string; label: string }[];
  outputs: { id: string; index: number; thumbUrl: string; roomName: string }[];
  defaultTerms: string;
}) {
  const [state, formAction, pending] = useActionState(createProposalAction, {} as ProposalFormState);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const options = Object.entries(selected).map(([outputId, caption]) => ({
    outputId,
    caption: caption === "" ? undefined : caption,
  }));

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="options" value={JSON.stringify(options)} />

      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="proposal-title">Title</Label>
          <Input id="proposal-title" name="title" required maxLength={160} defaultValue="Design proposal" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proposal-estimate">Estimate</Label>
          <select
            id="proposal-estimate"
            name="estimateId"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            required
          >
            {estimates.map((estimate) => (
              <option key={estimate.id} value={estimate.id}>
                {estimate.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="proposal-expiry">Valid for (days)</Label>
          <Input id="proposal-expiry" name="expiresInDays" inputMode="numeric" defaultValue="14" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="proposal-intro">Intro</Label>
          <textarea
            id="proposal-intro"
            name="intro"
            rows={3}
            maxLength={2000}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="proposal-terms">Terms</Label>
          <textarea
            id="proposal-terms"
            name="terms"
            rows={4}
            maxLength={4000}
            defaultValue={defaultTerms}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Pin renders (up to 4)</legend>
        {outputs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Favorite some renders first; only favorites can be pinned.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {outputs.map((output) => {
              const checked = output.id in selected;
              const count = Object.keys(selected).length;
              return (
                <li key={output.id} className="space-y-1 rounded-lg border border-border p-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && count >= 4}
                      onChange={(event) => {
                        setSelected((current) => {
                          const next = { ...current };
                          if (event.target.checked) next[output.id] = "";
                          else delete next[output.id];
                          return next;
                        });
                      }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                    <img src={output.thumbUrl} alt="" className="h-10 w-14 rounded object-cover" />
                    {output.roomName} · option {output.index + 1}
                  </label>
                  {checked && (
                    <Input
                      aria-label={`Caption for option ${String(output.index + 1)}`}
                      placeholder="Option A — warm minimal"
                      maxLength={120}
                      value={selected[output.id] ?? ""}
                      onChange={(event) => {
                        setSelected((current) => ({ ...current, [output.id]: event.target.value }));
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <Button type="submit" disabled={pending || estimates.length === 0}>
        {pending ? "Saving..." : "Create draft proposal"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Sending freezes the options and the estimate version, and emails the client a public link.
      </p>
    </form>
  );
}

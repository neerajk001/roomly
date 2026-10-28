"use client";

import { completeOnboardingAction, type OnboardingState } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@roomdesigner/shared";
import { useActionState, useState } from "react";

const initialState: OnboardingState = {};

export function OnboardingWizard({ defaultCurrency }: { defaultCurrency: string }) {
  const [mode, setMode] = useState<"HOME" | "PRO">("HOME");
  const [state, formAction, pending] = useActionState(completeOnboardingAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="mode" value={mode} />

      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">How will you use RoomDesigner?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "HOME" as const,
                title: "I'm designing my home",
                body: "Redesign your own rooms with concept visuals and a rough budget.",
              },
              {
                value: "PRO" as const,
                title: "I'm a design professional",
                body: "Run client projects, proposals and estimates from one place.",
              },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => {
                setMode(option.value);
              }}
              className={`rounded-xl border p-4 text-left transition-colors ${
                mode === option.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="block text-sm font-medium text-foreground">{option.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{option.body}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {mode === "PRO" && (
        <div className="space-y-2">
          <Label htmlFor="studioName">Studio name</Label>
          <Input
            id="studioName"
            name="studioName"
            required
            maxLength={80}
            placeholder="E.g. Northlight Interiors"
            aria-invalid={state.fieldErrors?.studioName !== undefined ? true : undefined}
          />
          {state.fieldErrors?.studioName?.map((message) => (
            <p key={message} role="alert" className="text-xs text-destructive">
              {message}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            name="currency"
            defaultValue={defaultCurrency}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
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
            defaultValue="METRIC"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="METRIC">Metric (m, cm)</option>
            <option value="IMPERIAL">Imperial (ft, in)</option>
          </select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Setting up…" : "Continue"}
      </Button>
    </form>
  );
}

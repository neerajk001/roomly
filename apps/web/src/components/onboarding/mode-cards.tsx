"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@roomdesigner/shared";
import { useActionState, useState } from "react";
import { completeOnboardingAction, type OnboardingState } from "@/app/onboarding/actions";

export function ModeCards({
  defaultCurrency,
  defaultUnitSystem,
  initialMode = "HOME",
}: {
  defaultCurrency: string;
  defaultUnitSystem: string;
  initialMode?: "HOME" | "PRO";
}) {
  const [mode, setMode] = useState<"HOME" | "PRO">(initialMode);
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    {} as OnboardingState,
  );

  const selectMode = (value: "HOME" | "PRO") => {
    setMode(value);
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="mode" value={mode} />
      {state.error !== undefined && (
        <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.fieldErrors !== undefined && (
        <div role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {Object.entries(state.fieldErrors).map(([field, messages]) => (
            <p key={field}>{messages.join(" ")}</p>
          ))}
        </div>
      )}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-medium">How will you use RoomDesigner?</legend>
        {(
          [
            { value: "HOME", label: "Homeowner", body: "Design my own rooms" },
            { value: "PRO", label: "Professional", body: "Design for clients" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            aria-label={option.label}
            type="button"
            disabled={pending}
            aria-pressed={mode === option.value}
            onClick={() => selectMode(option.value)}
            className={`rounded-xl border p-5 text-left ${mode === option.value ? "border-foreground bg-muted" : "border-border bg-card"}`}
          >
            <span className="block font-semibold">{option.label}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{option.body}</span>
          </button>
        ))}
      </fieldset>
      {mode === "PRO" && (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="studioName">Studio name</Label>
            <Input
              id="studioName"
              name="studioName"
              required
              maxLength={80}
              placeholder="E.g. Northlight Interiors"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              name="currency"
              defaultValue={defaultCurrency}
              className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"
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
              defaultValue={defaultUnitSystem}
              className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="METRIC">Metric (m, cm)</option>
              <option value="IMPERIAL">Imperial (ft, in)</option>
            </select>
          </div>
        </div>
      )}

      {mode === "HOME" && (
        <>
          <input type="hidden" name="currency" value={defaultCurrency} />
          <input type="hidden" name="unitSystem" value={defaultUnitSystem} />
        </>
      )}

      {
        <div className="flex flex-col items-start justify-between gap-3 pt-1 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">You can change workspace settings later.</p>
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Setting up…" : "Continue"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      }
    </form>
  );
}

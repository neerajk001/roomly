"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@roomdesigner/shared";
import { useActionState, useState } from "react";
import { completeOnboardingAction, type OnboardingState } from "@/app/onboarding/actions";

const HOME_BENEFITS = ["Explore styles", "Keep what you love", "Plan a budget"];
const PRO_BENEFITS = ["Manage client projects", "Create estimates", "Send proposals"];

export function ModeCards({
  defaultCurrency,
  defaultUnitSystem,
}: {
  defaultCurrency: string;
  defaultUnitSystem: string;
}) {
  const [mode, setMode] = useState<"HOME" | "PRO">("HOME");
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    {} as OnboardingState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {(
          [
            {
              value: "HOME" as const,
              title: "My own space",
              body: "I'm redesigning a home, apartment, or room for myself.",
              benefits: HOME_BENEFITS,
              image: "/demo/living-after.jpg",
              cta: "Continue as homeowner",
            },
            {
              value: "PRO" as const,
              title: "I'm a design professional",
              body: "I work with clients on interiors, renovations or design projects.",
              benefits: PRO_BENEFITS,
              image: "/demo/office-after.jpg",
              cta: "Continue as professional",
            },
          ] as const
        ).map((option) => {
          const active = mode === option.value;
          return (
            <div
              key={option.value}
              className={`overflow-hidden rounded-2xl border-2 bg-white transition-colors ${
                active ? "border-[#2f5233]" : "border-[#e2ddd0]"
              }`}
            >
              <div className="grid sm:grid-cols-[1fr_45%]">
                <div className="p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef1e8] text-lg">
                    {option.value === "HOME" ? "⌂" : "▦"}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#1f2a24]">
                    {option.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#5b665f]">{option.body}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-[#405048]">
                    {option.benefits.map((benefit) => (
                      <li key={benefit}>✓ {benefit}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    onClick={() => {
                      setMode(option.value);
                    }}
                    aria-pressed={active}
                    className={`mt-4 w-full ${
                      option.value === "HOME"
                        ? "bg-[#2f5233] text-white hover:bg-[#27452b]"
                        : "border border-[#2f5233] bg-white text-[#2f5233] hover:bg-[#eef1e8]"
                    }`}
                  >
                    {option.cta} →
                  </Button>
                </div>
                <div className="hidden sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
                  <img
                    src={option.image}
                    alt=""
                    className="h-full w-full object-cover"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {mode === "PRO" && (
        <div className="grid gap-4 rounded-xl border border-[#e2ddd0] bg-white p-4 sm:grid-cols-3">
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
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
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
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
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

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs text-[#7a857d]">
          ⚙ You can change workspace settings later.
        </p>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="bg-[#2f5233] text-white hover:bg-[#27452b]"
        >
          {pending
            ? "Setting up..."
            : mode === "HOME"
              ? "Continue as homeowner →"
              : "Continue as professional →"}
        </Button>
      </div>
    </form>
  );
}

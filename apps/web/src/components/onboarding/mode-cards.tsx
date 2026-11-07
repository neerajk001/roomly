"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@roomdesigner/shared";
import { useActionState, useState } from "react";
import { completeOnboardingAction, type OnboardingState } from "@/app/onboarding/actions";

const HOME_BENEFITS = ["Explore styles", "Keep what you love", "Plan a budget"];
const PRO_BENEFITS = ["Manage client projects", "Create estimates", "Send proposals"];

function CheckIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="4 10 8 14 16 5" />
    </svg>
  );
}

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

  const selectMode = (value: "HOME" | "PRO") => {
    setMode(value);
  };

  const OPTIONS = [
    {
      value: "HOME" as const,
      label: "For Homeowners",
      title: "My own space",
      body: "I'm redesigning a home, apartment, or room for myself.",
      benefits: HOME_BENEFITS,
      image: "/demo/living-after.jpg",
      cta: "Continue as homeowner",
      accent: "bg-[#FFD400]",
      selectedBorder: "border-[#FFD400]",
    },
    {
      value: "PRO" as const,
      label: "For Professionals",
      title: "I'm a design professional",
      body: "I work with clients on interiors, renovations or design projects.",
      benefits: PRO_BENEFITS,
      image: "/demo/office-after.jpg",
      cta: "Continue as professional",
      accent: "bg-[#cfe3ff]",
      selectedBorder: "border-[#1f4fff]",
    },
  ];

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

      <div className="space-y-5">
        {OPTIONS.map((option) => {
          const active = mode === option.value;
          return (
            <div
              key={option.value}
              className={`overflow-hidden border bg-white transition-colors ${
                active ? option.selectedBorder : "border-black"
              }`}
            >
              <div className="grid sm:grid-cols-[1fr_45%]">
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center border border-black text-black ${option.accent}`}
                    >
                      {option.value === "HOME" ? (
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="3" y="3" width="8" height="18" />
                          <rect x="13" y="8" width="8" height="13" />
                          <line x1="6" y1="7" x2="8" y2="7" />
                          <line x1="6" y1="11" x2="8" y2="11" />
                          <line x1="6" y1="15" x2="8" y2="15" />
                          <line x1="16" y1="12" x2="18" y2="12" />
                          <line x1="16" y1="16" x2="18" y2="16" />
                        </svg>
                      )}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-black">
                      {option.label}
                    </span>
                  </div>

                  <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight text-black">
                    {option.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-black/70">{option.body}</p>

                  <ul className="mt-4 space-y-2">
                    {option.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-3 text-sm text-black">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-black bg-white text-black">
                          <CheckIcon />
                        </span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      selectMode(option.value);
                    }}
                    aria-pressed={active}
                    className={`mt-6 flex w-full items-center justify-center gap-3 border border-black px-5 py-3 text-sm font-bold transition-all ${
                      option.value === "HOME"
                        ? "bg-[#1f4fff] text-white shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000]"
                        : "bg-white text-black shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000]"
                    }`}
                  >
                    <span>{option.cta}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>

                <div className="relative hidden sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
                  <img
                    src={option.image}
                    alt=""
                    className="h-full w-full object-cover"
                    aria-hidden="true"
                  />
                  {active && (
                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center bg-[#1f4fff] text-white">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {mode === "PRO" && (
        <div className="grid gap-4 border border-black bg-white p-4 sm:grid-cols-3">
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
              className="h-9 w-full border border-black bg-white px-3 text-sm"
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
              className="h-9 w-full border border-black bg-white px-3 text-sm"
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
          <p className="text-xs text-black/60">You can change workspace settings later.</p>
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="flex w-full items-center justify-center gap-3 border border-black bg-[#1f4fff] px-5 py-3 text-sm font-bold text-white shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000] disabled:opacity-60 sm:w-auto"
          >
            {pending
              ? "Setting up..."
              : mode === "PRO"
                ? "Open my design studio"
                : "Open my home workspace"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      }
    </form>
  );
}

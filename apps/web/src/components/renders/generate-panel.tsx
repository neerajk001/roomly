"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { STYLES, totalCreditCost } from "@roomdesigner/shared";
import Link from "next/link";
import { useState } from "react";

export interface RestyleRequest {
  styleKey: string;
  quality: "draft" | "final";
  variations: number;
  notes: string;
}

export function GeneratePanel({
  hasPhoto,
  pending,
  error,
  onCreate,
}: {
  hasPhoto: boolean;
  pending: boolean;
  error: string | null;
  onCreate: (request: RestyleRequest) => void;
}) {
  const [styleKey, setStyleKey] = useState("modern");
  const [quality, setQuality] = useState<"draft" | "final">("draft");
  const [variations, setVariations] = useState(3);
  const [notes, setNotes] = useState("");
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const creditsError = error !== null && /credit/i.test(error);
  const showCreditsModal = creditsError && dismissedFor !== error;

  const cost = totalCreditCost(quality, variations);

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-5">
      {!hasPhoto && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          Add a photo of this room before generating.
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Style</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STYLES.map((style) => (
            <button
              key={style.key}
              type="button"
              aria-pressed={styleKey === style.key}
              onClick={() => {
                setStyleKey(style.key);
              }}
              className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                styleKey === style.key
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="block font-medium text-foreground">{style.label}</span>
              <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted-foreground">
                {style.promptHint}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="variations">Variations</Label>
          <select
            id="variations"
            className={selectClass}
            value={variations}
            onChange={(event) => {
              setVariations(Number.parseInt(event.target.value, 10));
            }}
          >
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quality">Quality</Label>
          <select
            id="quality"
            className={selectClass}
            value={quality}
            onChange={(event) => {
              setQuality(event.target.value === "final" ? "final" : "draft");
            }}
          >
            <option value="draft">Draft (faster, cheaper)</option>
            <option value="final">Final (best quality — recommended)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea
          id="notes"
          maxLength={300}
          rows={2}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
          placeholder="E.g. keep the rug and the shelf on the left"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {error !== null && !creditsError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showCreditsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Not enough credits"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm space-y-3 rounded-xl bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Not enough credits</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/pricing"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                Get more credits
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDismissedFor(error);
                }}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!hasPhoto || pending}
          aria-busy={pending}
          onClick={() => {
            onCreate({ styleKey, quality, variations, notes });
          }}
        >
          {pending ? "Starting…" : `Generate ${variations} concept${variations === 1 ? "" : "s"}`}
        </Button>
        <span className="text-sm text-muted-foreground">
          Costs <strong className="text-foreground">{cost}</strong> credit{cost === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        AI-generated concept visual. Not to scale. Dimensions are never sent to the image model.
      </p>
    </div>
  );
}

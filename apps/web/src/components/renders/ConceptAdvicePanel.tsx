"use client";

import { useState, useTransition } from "react";
import type { ConceptAdvice } from "@roomdesigner/shared";
import { getConceptAdviceAction } from "@/server/actions/concept-advice";

export function ConceptAdvicePanel({
  roomId,
  outputId,
  advice,
  onAdvice,
  onUse,
}: {
  roomId: string;
  outputId: string;
  advice?: ConceptAdvice;
  onAdvice(advice: ConceptAdvice): void;
  onUse(instruction: string): void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-label="Suggestions for selected concept"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Suggestions for this concept</h2>
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                const result = await getConceptAdviceAction({ roomId, outputId });
                if (result.advice) onAdvice(result.advice);
                else setError(result.error ?? "Suggestions are unavailable.");
              } catch {
                setError("Suggestions could not be loaded. Please try again.");
              }
            })
          }
        >
          {pending ? "Preparing suggestions…" : advice ? "Review suggestions" : "Get suggestions"}
        </button>
      </div>
      {!advice && !pending && (
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a concept, then request ideas for refining it. Nothing changes until you apply an
          edit.
        </p>
      )}
      {pending && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Preparing suggestions for the selected image…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {advice && (
        <div className="mt-3 space-y-3">
          {advice.source === "demo" && (
            <p className="text-xs font-medium text-muted-foreground">
              Demo suggestions · based on preferences; image analysis is disabled.
            </p>
          )}
          <p className="text-sm">{advice.summary}</p>
          {advice.suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No changes suggested for this concept. You can still describe your own edit.
            </p>
          ) : (
            <ul className="grid gap-3">
              {advice.suggestions.map((suggestion) => (
                <li
                  key={suggestion.title}
                  className="rounded-lg border border-border bg-muted/40 p-3"
                >
                  <h3 className="text-sm font-semibold">{suggestion.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">{suggestion.observation}</p>
                  <p className="mt-2 text-xs">{suggestion.reason}</p>
                  <button
                    type="button"
                    onClick={() => onUse(suggestion.instruction)}
                    className="mt-3 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium"
                  >
                    Use this idea
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

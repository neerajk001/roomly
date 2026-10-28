"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface GalleryOutput {
  id: string;
  votes: number;
  isFavorite: boolean;
  url: string;
  thumbUrl: string;
}

export function ShareGallery({
  token,
  outputs,
  beforeUrl,
  initiallyVoted,
}: {
  token: string;
  outputs: GalleryOutput[];
  beforeUrl: string | null;
  initiallyVoted: string[];
}) {
  const [voted, setVoted] = useState<Set<string>>(() => new Set(initiallyVoted));
  const [votes, setVotes] = useState<Record<string, number>>(
    () => Object.fromEntries(outputs.map((output) => [output.id, output.votes])),
  );
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const vote = async (outputId: string) => {
    setError(null);
    const response = await fetch(`/api/share/${token}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outputId }),
    });
    if (response.status === 409) {
      setVoted((current) => new Set(current).add(outputId));
      setError("You already voted for this one.");
      return;
    }
    if (!response.ok) {
      setError("Could not record your vote. Try again.");
      return;
    }
    const body = (await response.json()) as { votes: number };
    setVotes((current) => ({ ...current, [outputId]: body.votes }));
    setVoted((current) => new Set(current).add(outputId));
  };

  const selectedOutput = outputs.find((output) => output.id === selected) ?? null;

  return (
    <div className="space-y-5">
      {error !== null && (
        <p role="alert" className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {selectedOutput !== null && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg border border-border">
            {beforeUrl !== null && (
              /* eslint-disable-next-line @next/next/no-img-element -- signed URL */
              <img src={beforeUrl} alt="Before" className="block w-full" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
            <img src={selectedOutput.url} alt="Chosen concept" className="block w-full" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelected(null); }}>
            Back to the gallery
          </Button>
        </div>
      )}

      {selectedOutput === null && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {outputs.map((output) => {
            const hasVoted = voted.has(output.id);
            return (
              <li key={output.id} className="overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => {
                    setSelected(output.id);
                  }}
                  aria-label="Enlarge concept"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                  <img
                    src={output.thumbUrl}
                    alt="AI-generated concept"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </button>
                <div className="flex items-center justify-between gap-2 border-t border-border p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={hasVoted ? "secondary" : "outline"}
                    disabled={hasVoted}
                    onClick={() => {
                      void vote(output.id);
                    }}
                  >
                    {hasVoted ? "Voted" : "Vote"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {votes[output.id] ?? 0} {votes[output.id] === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {outputs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing to show yet. The designer may still be working on this.
        </p>
      )}
    </div>
  );
}

"use client";

import { conceptFamily } from "./concept-history";
import type { RenderJobView } from "./types";

export function ConceptEditHistory({
  jobs,
  outputId,
  onSelect,
}: {
  jobs: RenderJobView[];
  outputId: string;
  onSelect(jobId: string, outputId: string): void;
}) {
  const family = conceptFamily(jobs, outputId);
  return (
    <details className="rounded-xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Changes for this concept ({Math.max(0, family.length - 1)})
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Versions stay linked to their source image. Choose one to view or refine it.
      </p>
      <ol className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {family.map(({ job, output }) => (
          <li key={output.id}>
            <button
              type="button"
              aria-pressed={output.id === outputId}
              onClick={() => onSelect(job.id, output.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${output.id === outputId ? "border-foreground bg-muted" : "border-border"}`}
            >
              {job.kind === "EDIT" ? job.label : `Original concept ${output.index + 1}`}{" "}
              {output.id === outputId ? "· Selected" : ""}
            </button>
          </li>
        ))}
      </ol>
    </details>
  );
}

"use client";

import { useState } from "react";
import { ROOM_CHECKLISTS, type RoomAssessment } from "@roomdesigner/shared";

export function RoomAssessmentNotice({
  assessment,
  checking = false,
  includeItems = [],
  notes = "",
  busy = false,
  onRevise,
  onRetry,
}: {
  assessment?: RoomAssessment;
  checking?: boolean;
  includeItems?: string[];
  notes?: string;
  busy?: boolean;
  onRevise?(items: string[], notes: string): void;
  onRetry?(): void;
}) {
  const [items, setItems] = useState(includeItems);
  const [request, setRequest] = useState(notes.slice(0, 300));
  const labelFor = (key: string) =>
    ROOM_CHECKLISTS.map((room) => room.items.find(([id]) => id === key)?.[1]).find(Boolean) ??
    key.replace("staging:", "");
  if (checking)
    return (
      <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">
        Checking your photo, room boundaries and furniture fit before generating…
      </p>
    );
  if (!assessment) return null;
  const demo = assessment.source === "demo";
  if (assessment.decision !== "ready")
    return (
      <section
        role="alert"
        aria-label="Room assessment needs attention"
        className="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <h2 className="font-semibold">
          {assessment.decision === "needs-photo"
            ? "A clearer room view is needed"
            : "Review what fits in this room"}
        </h2>
        <p className="text-sm">{assessment.nextStep}</p>
        <p className="text-xs text-muted-foreground">
          No concept visuals were generated. Your generation credits were returned.
        </p>
        <a
          href="#room-details"
          onClick={() => {
            if (location.hash === "#room-details") window.dispatchEvent(new Event("hashchange"));
          }}
          className="inline-block rounded-lg border border-border px-3 py-2 text-sm"
        >
          Review photo &amp; room details
        </a>
        {assessment.decision === "needs-photo" &&
          (onRetry ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRetry}
              className="block rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Check photo &amp; generate 3 ideas · 3 credits
            </button>
          ) : (
            <a href="#generation-choices" className="block text-sm underline">
              After updating the photo, generate again using the choices above
            </a>
          ))}
        {assessment.decision === "review-items" && (
          <>
            <ul className="space-y-2 text-sm">
              {assessment.items
                .filter((item) => item.fit === "cannot-fit")
                .map((item) => (
                  <li key={item.key}>
                    <strong>{labelFor(item.key)}:</strong> {item.footprint} {item.placement}
                  </li>
                ))}
            </ul>
            {onRevise ? (
              <form
                className="space-y-3 border-t border-border pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  onRevise(items, request);
                }}
              >
                <fieldset disabled={busy}>
                  <legend className="mb-2 text-sm font-medium">Revise selected items</legend>
                  <div className="flex flex-wrap gap-3">
                    {includeItems.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={items.includes(key)}
                          onChange={(event) =>
                            setItems((old) =>
                              event.target.checked
                                ? [...old, key]
                                : old.filter((item) => item !== key),
                            )
                          }
                        />
                        {labelFor(key)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm">
                  Update your request (optional)
                  <textarea
                    aria-label="Updated room request"
                    maxLength={300}
                    rows={2}
                    disabled={busy}
                    value={request}
                    onChange={(event) => setRequest(event.target.value)}
                    className="mt-2 block w-full rounded-lg border border-border bg-background p-3"
                  />
                </label>
                <button
                  disabled={busy}
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Generate with updated choices · 3 credits
                </button>
              </form>
            ) : (
              <a href="#generation-choices" className="inline-block text-sm underline">
                Review generation choices above
              </a>
            )}
          </>
        )}
      </section>
    );
  return (
    <details className="rounded-lg border border-border bg-card p-3">
      <summary className="cursor-pointer text-sm font-medium">
        {demo ? "Demo planning · photo analysis is disabled" : "Room planning"}
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p>{assessment.summary}</p>
        <p className="text-xs text-muted-foreground">
          {demo
            ? "These checks support the fake-image demo only."
            : "AI placement guidance, not a measured plan or guaranteed furniture clearance."}
        </p>
        {assessment.layoutGuidance.length > 0 && (
          <ul className="list-disc space-y-1 pl-5">
            {assessment.layoutGuidance.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        {assessment.items.length > 0 && (
          <ul className="space-y-2">
            {assessment.items.map((item) => (
              <li key={item.key}>
                <strong>
                  {labelFor(item.key)}
                  {item.fit === "compact" ? " · compact option" : ""}:
                </strong>{" "}
                {item.footprint} {item.placement}
              </li>
            ))}
          </ul>
        )}
        {assessment.limitations.length > 0 && (
          <p className="text-xs text-muted-foreground">{assessment.limitations.join(" ")}</p>
        )}
      </div>
    </details>
  );
}

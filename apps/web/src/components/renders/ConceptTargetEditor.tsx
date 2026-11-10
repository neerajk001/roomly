"use client";

import { useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { editRegionSchema, type ConceptAdvice, type EditTarget } from "@roomdesigner/shared";
import { getConceptAdviceAction } from "@/server/actions/concept-advice";

const INITIAL_TARGET: EditTarget = {
  label: "Selected area",
  region: { left: 250, top: 250, right: 750, bottom: 750 },
};

export function ConceptTargetEditor({
  objectDetectionAvailable = false,
  roomId,
  outputId,
  imageUrl,
  advice,
  target,
  onChange,
  onAdvice,
  disabled,
  children,
  actions,
}: {
  objectDetectionAvailable?: boolean;
  roomId: string;
  outputId: string;
  imageUrl: string;
  advice?: ConceptAdvice;
  target?: EditTarget;
  onChange(target: EditTarget | undefined): void;
  onAdvice(advice: ConceptAdvice): void;
  disabled: boolean;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<EditTarget["region"] | null>(null);
  const region = preview ?? target?.region;
  function point(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1000, Math.round(((event.clientX - rect.left) * 1000) / rect.width))),
      y: Math.max(0, Math.min(1000, Math.round(((event.clientY - rect.top) * 1000) / rect.height))),
    };
  }
  function drawn(event: PointerEvent<HTMLDivElement>) {
    if (!anchor.current) return null;
    const end = point(event);
    return {
      left: Math.min(anchor.current.x, end.x),
      top: Math.min(anchor.current.y, end.y),
      right: Math.max(anchor.current.x, end.x),
      bottom: Math.max(anchor.current.y, end.y),
    };
  }
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(170px,34dvh)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1">
      <div className="flex min-h-0 min-w-0 flex-col bg-muted/70">
        <div className="flex shrink-0 items-center justify-between px-4 pt-3 text-xs text-muted-foreground">
          <span>Concept preview</span>
          <span>{target ? "Selected area" : "Whole image"}</span>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
          <div
            className={`relative inline-block min-w-0 max-w-full overflow-hidden rounded-lg bg-muted ${drawing && !disabled ? "touch-none cursor-crosshair" : ""}`}
            role="group"
            aria-label="Draw editable area"
            onPointerDown={(event) => {
              if (!drawing || disabled || imageFailed || !event.isPrimary || event.button !== 0)
                return;
              anchor.current = point(event);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (disabled) return;
              const next = drawn(event);
              if (next) setPreview(next);
            }}
            onPointerUp={(event) => {
              const next = drawn(event);
              anchor.current = null;
              setPreview(null);
              if (!next || disabled) return;
              const result = editRegionSchema.safeParse(next);
              if (result.success) {
                onChange({ label: "Selected area", region: result.data });
                setDrawing(false);
                setError(null);
              } else
                setError(
                  "Choose a rectangle at least 1% wide and high, covering at most 80% of the image.",
                );
            }}
            onPointerCancel={() => {
              anchor.current = null;
              setPreview(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed authorized concept URL */}
            <img
              src={imageUrl}
              alt="Concept area selection"
              draggable={false}
              className="block max-h-[26dvh] w-auto max-w-full select-none lg:max-h-[calc(100dvh-190px)]"
              onError={() => {
                setImageFailed(true);
                setError(
                  "The image could not be loaded. Reopen the room to refresh it before selecting an area.",
                );
              }}
            />
            {region && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute border-2 border-primary bg-primary/15"
                style={{
                  left: `${region.left / 10}%`,
                  top: `${region.top / 10}%`,
                  width: `${(region.right - region.left) / 10}%`,
                  height: `${(region.bottom - region.top) / 10}%`,
                  boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.2)",
                }}
              />
            )}
          </div>
        </div>
        <p role="status" className="shrink-0 px-4 pb-3 text-center text-xs text-muted-foreground">
          {drawing
            ? "Drag over the object or area you want to change."
            : target
              ? "The marked rectangle can change. The rest stays protected."
              : "Select an area for a focused change, or edit the whole image."}
        </p>
      </div>
      <aside
        aria-label="Concept edit controls"
        className="flex min-h-0 min-w-0 flex-col border-t border-border bg-card lg:border-t-0 lg:border-l"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <details open={!!target}>
            <summary className="cursor-pointer text-sm font-medium">
              Change a specific area (optional)
            </summary>
            <h2 className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Edit scope
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={!target}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${!target ? "border-foreground bg-foreground text-background" : "border-border"}`}
                onClick={() => {
                  onChange(undefined);
                  setDrawing(false);
                  setPreview(null);
                }}
              >
                Use whole image
              </button>
              <button
                type="button"
                disabled={disabled || imageFailed}
                aria-pressed={!!target}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${target ? "border-foreground bg-foreground text-background" : "border-border"}`}
                onClick={() => {
                  onChange(target ?? INITIAL_TARGET);
                  setDrawing(true);
                  setError(null);
                }}
              >
                Mark an area
              </button>
              {objectDetectionAvailable && (
                <button
                  type="button"
                  disabled={disabled || pending}
                  aria-busy={pending}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-50"
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      try {
                        const result = await getConceptAdviceAction({ roomId, outputId });
                        if (result.advice) onAdvice(result.advice);
                        else
                          setError(
                            result.error ??
                              "Objects could not be identified. Mark an area instead.",
                          );
                      } catch {
                        setError("Objects could not be identified. Mark an area instead.");
                      }
                    })
                  }
                >
                  {pending ? "Finding objects…" : "Find objects"}
                </button>
              )}
            </div>
            {pending && (
              <p role="status" className="mt-2 text-xs">
                Reviewing the selected concept…
              </p>
            )}
            {error && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {error}
              </p>
            )}
            {advice && (
              <p className="mt-3 text-xs text-muted-foreground">
                {advice.source === "demo"
                  ? "Demo mode: object detection is disabled. Mark an area manually."
                  : advice.objects?.length
                    ? "Choose an object, then review its approximate bounds."
                    : "No object bounds available. Mark an area manually."}
              </p>
            )}
            {advice?.source === "ai" && !!advice.objects?.length && (
              <div className="mb-3 flex flex-wrap gap-2">
                {advice.objects.map((object, index) => (
                  <button
                    key={`${object.label}-${index}`}
                    type="button"
                    disabled={disabled}
                    aria-pressed={target === object}
                    className="rounded-lg border border-border px-3 py-2 text-xs"
                    onClick={() => {
                      onChange(object);
                      setDrawing(false);
                    }}
                  >
                    {object.label}
                  </button>
                ))}
              </div>
            )}
          </details>
          <div className="mt-5 border-t border-border pt-5">{children}</div>
          {target && (
            <details className="mt-5 border-t border-border pt-4">
              <summary className="cursor-pointer text-xs font-medium">
                Adjust selection edges
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["left", "top", "right", "bottom"] as const).map((edge) => (
                  <label key={edge} className="text-xs capitalize">
                    {edge} edge ({target.region[edge] / 10}%)
                    <input
                      aria-label={`${edge} edge`}
                      type="range"
                      min={edge === "right" || edge === "bottom" ? 10 : 0}
                      max={edge === "left" || edge === "top" ? 990 : 1000}
                      step={10}
                      value={target.region[edge]}
                      disabled={disabled || imageFailed}
                      className="mt-2 block w-full accent-black"
                      onChange={(event) => {
                        const result = editRegionSchema.safeParse({
                          ...target.region,
                          [edge]: Number(event.target.value),
                        });
                        if (result.success) {
                          onChange({ ...target, region: result.data });
                          setError(null);
                        } else
                          setError("Keep the edges apart and the area below 80% of the image.");
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
          )}
        </div>
        <div className="shrink-0 border-t border-border bg-card p-3 sm:p-4">{actions}</div>
      </aside>
    </div>
  );
}

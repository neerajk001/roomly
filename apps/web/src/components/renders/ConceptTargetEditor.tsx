"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { editRegionSchema, type ConceptAdvice, type EditTarget } from "@roomdesigner/shared";
import { getConceptAdviceAction } from "@/server/actions/concept-advice";

const INITIAL_TARGET: EditTarget = {
  label: "Selected area",
  region: { left: 250, top: 250, right: 750, bottom: 750 },
};

export function ConceptTargetEditor({
  roomId,
  outputId,
  imageUrl,
  advice,
  target,
  onChange,
  onAdvice,
  disabled,
}: {
  roomId: string;
  outputId: string;
  imageUrl: string;
  advice?: ConceptAdvice;
  target?: EditTarget;
  onChange(target: EditTarget | undefined): void;
  onAdvice(advice: ConceptAdvice): void;
  disabled: boolean;
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
    <details className="my-3 rounded-lg border border-border p-3" open={target ? true : undefined}>
      <summary className="cursor-pointer text-sm font-medium">
        Choose an object or area (optional)
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Select an object or mark a rectangle. Review its edges: everything inside can change; the
        area outside is protected.
      </p>
      <div className="my-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || pending}
          className="rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                const result = await getConceptAdviceAction({ roomId, outputId });
                if (result.advice) onAdvice(result.advice);
                else
                  setError(
                    result.error ?? "Objects could not be identified. Mark an area instead.",
                  );
              } catch {
                setError("Objects could not be identified. Mark an area instead.");
              }
            })
          }
        >
          {pending ? "Looking for objects…" : "Find objects"}
        </button>
        <button
          type="button"
          disabled={disabled || imageFailed}
          className="rounded-lg border border-border px-3 py-2 text-xs"
          onClick={() => {
            onChange(target ?? INITIAL_TARGET);
            setDrawing(true);
            setError(null);
          }}
        >
          Mark an area
        </button>
        {target && (
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg border border-border px-3 py-2 text-xs"
            onClick={() => {
              onChange(undefined);
              setDrawing(false);
              setPreview(null);
            }}
          >
            Use whole image
          </button>
        )}
      </div>
      {pending && (
        <p role="status" className="text-xs">
          Reviewing the selected concept…
        </p>
      )}
      {error && (
        <p role="alert" className="my-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {advice && (
        <p className="mb-2 text-xs text-muted-foreground">
          {advice.source === "demo"
            ? "Demo mode: object detection is disabled. Mark an area manually."
            : advice.objects?.length
              ? "Approximate object bounds. Choose one, then adjust the rectangle as needed."
              : "No object bounds available for this concept. Mark an area manually."}
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
      {target && (
        <>
          <div
            className={`relative overflow-hidden rounded-lg bg-muted ${drawing && !disabled ? "touch-none cursor-crosshair" : ""}`}
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
              className="block h-auto w-full select-none"
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
          <p role="status" className="mt-2 text-xs">
            {drawing
              ? "Drag across the image, or adjust the edges below."
              : `Editing only: ${target.label}. Adjust the edges below if needed.`}
          </p>
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
                    } else setError("Keep the edges apart and the area below 80% of the image.");
                  }}
                />
              </label>
            ))}
          </div>
        </>
      )}
    </details>
  );
}

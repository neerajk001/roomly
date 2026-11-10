"use client";

import { useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import {
  editRegionSchema,
  editTargetSchema,
  editTargetRegions,
  type EditRegion,
  type EditTarget,
  type ConceptAdvice,
} from "@roomdesigner/shared";
import { getConceptAdviceAction } from "@/server/actions/concept-advice";

const INITIAL: EditRegion = { left: 250, top: 250, right: 750, bottom: 750 };
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
  const regions = target ? editTargetRegions(target) : [];
  const [active, setActive] = useState(0);
  const index = Math.min(active, Math.max(0, regions.length - 1));
  const [drawing, setDrawing] = useState(!!target);
  const [preview, setPreview] = useState<EditRegion | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finding, startFinding] = useTransition();
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const region = regions[index];
  function update(next: EditRegion[], label?: string) {
    if (!next.length) {
      onChange(undefined);
      setActive(0);
      setDrawing(false);
      setError(null);
      return true;
    }
    const parsed = editTargetSchema.safeParse({
      label: label ?? (next.length > 1 ? "Selected areas" : "Selected area"),
      region: next[0],
      ...(next.length > 1 ? { additionalRegions: next.slice(1) } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Review the selected areas.");
      return false;
    }
    onChange(parsed.data);
    setError(null);
    return true;
  }
  function point(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1000, Math.round(((event.clientX - box.left) * 1000) / box.width))),
      y: Math.max(0, Math.min(1000, Math.round(((event.clientY - box.top) * 1000) / box.height))),
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
  function redraw() {
    if (!regions.length) update([INITIAL]);
    setDrawing(true);
    setError(null);
  }
  function add() {
    const options = Array.from({ length: 25 }, (_, i) => ({
      left: 50 + (i % 5) * 150,
      top: 50 + Math.floor(i / 5) * 150,
      right: 150 + (i % 5) * 150,
      bottom: 150 + Math.floor(i / 5) * 150,
    }));
    const next = options.find(
      (r) => !regions.some((old) => JSON.stringify(old) === JSON.stringify(r)),
    );
    if (next && update([...regions, next])) {
      setActive(regions.length);
      setDrawing(true);
    }
  }
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(170px,34dvh)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1">
      <div className="flex min-h-0 min-w-0 flex-col bg-muted/70">
        <div className="flex shrink-0 justify-between px-4 pt-3 text-xs text-muted-foreground">
          <span>Concept preview</span>
          <span>
            {regions.length
              ? regions.length + " selected area" + (regions.length > 1 ? "s" : "")
              : "Whole image"}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
          <div
            role="group"
            aria-label="Draw editable area"
            className={
              "relative inline-block min-w-0 max-w-full overflow-hidden rounded-lg bg-muted " +
              (drawing && !disabled ? "touch-none cursor-crosshair" : "")
            }
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
              const checked = editRegionSchema.safeParse(next);
              if (!checked.success) {
                setError(
                  "Draw an area at least 1% wide and high, covering at most 80% of the image.",
                );
                return;
              }
              update(
                regions.length
                  ? regions.map((r, i) => (i === index ? checked.data : r))
                  : [checked.data],
              );
            }}
            onPointerCancel={() => {
              anchor.current = null;
              setPreview(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- authorized signed concept image */}
            <img
              src={imageUrl}
              alt="Concept area selection"
              draggable={false}
              className="block max-h-[26dvh] w-auto max-w-full select-none lg:max-h-[calc(100dvh-190px)]"
              onError={() => {
                setImageFailed(true);
                setError("The image could not be loaded. Reopen the room before selecting areas.");
              }}
            />
            {regions.map((saved, i) => {
              const r = i === index && preview ? preview : saved;
              return (
                <div
                  key={i}
                  aria-hidden="true"
                  className={
                    "pointer-events-none absolute border-2 " +
                    (i === index
                      ? "border-primary bg-primary/15"
                      : "border-foreground bg-foreground/10")
                  }
                  style={{
                    left: r.left / 10 + "%",
                    top: r.top / 10 + "%",
                    width: (r.right - r.left) / 10 + "%",
                    height: (r.bottom - r.top) / 10 + "%",
                  }}
                >
                  <span className="absolute left-0 top-0 bg-foreground px-1.5 py-0.5 text-[10px] text-background">
                    {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <p role="status" className="shrink-0 px-4 pb-3 text-center text-xs text-muted-foreground">
          {regions.length
            ? drawing
              ? "Drag again to redraw area " +
                (index + 1) +
                ". Add another area to edit separate parts."
              : "Selected areas can change. Everything outside them stays protected."
            : "Select an area for a focused change, or edit the whole image."}
        </p>
      </div>
      <aside
        aria-label="Concept edit controls"
        className="flex min-h-0 min-w-0 flex-col border-t border-border bg-card lg:border-l lg:border-t-0"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {error && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <details open={!!target}>
            <summary className="cursor-pointer text-sm font-medium">
              Change a specific area (optional)
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={!target}
                onClick={() => update([])}
                className="rounded-lg border border-border px-3 py-2 text-xs"
              >
                Use whole image
              </button>
              <button
                type="button"
                disabled={disabled || imageFailed}
                aria-pressed={drawing && !!target}
                onClick={redraw}
                className="rounded-lg border border-border px-3 py-2 text-xs"
              >
                Mark an area
              </button>
              <button
                type="button"
                disabled={disabled || imageFailed || !target || regions.length >= 5}
                onClick={add}
                className="rounded-lg border border-border px-3 py-2 text-xs"
              >
                Add area
              </button>
            </div>
            {!!regions.length && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {regions.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      aria-pressed={i === index}
                      onClick={() => {
                        setActive(i);
                        setDrawing(true);
                      }}
                      className={
                        "rounded-lg border px-3 py-2 text-xs " +
                        (i === index
                          ? "border-foreground bg-foreground text-background"
                          : "border-border")
                      }
                    >
                      Area {i + 1}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={disabled || imageFailed}
                    onClick={redraw}
                    className="text-xs underline"
                  >
                    Redraw area {index + 1}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (update(regions.filter((_, i) => i !== index)))
                        setActive(Math.max(0, index - 1));
                    }}
                    className="text-xs underline"
                  >
                    Remove area {index + 1}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => update([])}
                    className="text-xs underline"
                  >
                    Clear all areas
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Up to 5 areas. Select an area number to redraw or adjust it.
                </p>
              </div>
            )}
            {objectDetectionAvailable && (
              <button
                type="button"
                disabled={disabled || finding}
                aria-busy={finding}
                className="mt-3 rounded-lg border border-border px-3 py-2 text-xs"
                onClick={() =>
                  startFinding(async () => {
                    setError(null);
                    try {
                      const result = await getConceptAdviceAction({ roomId, outputId });
                      if (result.advice) onAdvice(result.advice);
                      else
                        setError(
                          result.error ?? "Objects could not be found. Mark an area instead.",
                        );
                    } catch {
                      setError("Objects could not be found. Mark an area instead.");
                    }
                  })
                }
              >
                {finding ? "Finding objects…" : "Find objects"}
              </button>
            )}
            {advice?.source === "demo" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Demo mode: object detection is disabled. Mark an area manually.
              </p>
            )}
            {advice?.source === "ai" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {advice.objects?.map((object, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    className="rounded-lg border border-border px-3 py-2 text-xs"
                    onClick={() => {
                      update([object.region], object.label);
                      setActive(0);
                      setDrawing(true);
                    }}
                  >
                    {object.label}
                  </button>
                ))}
              </div>
            )}
          </details>
          <div className="mt-5 border-t border-border pt-5">{children}</div>
          {region && (
            <details className="mt-5 border-t border-border pt-4">
              <summary className="cursor-pointer text-xs font-medium">
                Adjust selection edges
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">Area {index + 1}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["left", "top", "right", "bottom"] as const).map((edge) => (
                  <label key={edge} className="text-xs capitalize">
                    {edge} edge ({region[edge] / 10}%)
                    <input
                      aria-label={edge + " edge"}
                      type="range"
                      min={edge === "right" || edge === "bottom" ? 10 : 0}
                      max={edge === "left" || edge === "top" ? 990 : 1000}
                      step={10}
                      value={region[edge]}
                      disabled={disabled || imageFailed}
                      className="mt-2 block w-full accent-black"
                      onChange={(event) => {
                        const checked = editRegionSchema.safeParse({
                          ...region,
                          [edge]: Number(event.target.value),
                        });
                        if (checked.success)
                          update(regions.map((r, i) => (i === index ? checked.data : r)));
                        else
                          setError(
                            "Keep the edges apart and the combined selection below 80% of the image.",
                          );
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

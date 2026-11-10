"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { ComparisonImage } from "./ComparisonImage";

export function RoomComparison({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string | null;
  afterUrl: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"side" | "slider">("side");
  const [mobileImage, setMobileImage] = useState<"Before" | "After">("Before");
  const [clip, setClip] = useState(50);
  const [dimensions, setDimensions] = useState<
    Record<string, { width: number; height: number } | undefined>
  >({});
  const before = beforeUrl ? dimensions[beforeUrl] : undefined;
  const after = afterUrl ? dimensions[afterUrl] : undefined;
  const compatible =
    !!before &&
    !!after &&
    Math.abs(before.width / before.height / (after.width / after.height) - 1) < 0.02;
  const slider = mode === "slider" && compatible;
  function picture(url: string, label: string) {
    return (
      <ComparisonImage
        key={url}
        url={url}
        label={label}
        onReady={(width, height) =>
          setDimensions((old) =>
            old[url]?.width === width && old[url]?.height === height
              ? old
              : { ...old, [url]: { width, height } },
          )
        }
        onFailure={() => setDimensions((old) => ({ ...old, [url]: undefined }))}
      />
    );
  }
  function controls() {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 py-3">
        <div
          aria-label="Comparison view"
          className="flex gap-1 rounded-lg border border-border bg-card p-1"
        >
          {(
            [
              ["side", "Side by side"],
              ["slider", "Slider"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === "slider" ? slider : !slider}
              disabled={value === "slider" && !compatible}
              onClick={() => setMode(value)}
              className={
                "rounded-md px-3 py-2 text-sm font-medium disabled:opacity-40 " +
                ((value === "slider" ? slider : !slider) ? "bg-foreground text-background" : "")
              }
            >
              {label}
            </button>
          ))}
        </div>
        {expanded && !slider && (
          <div
            aria-label="Mobile comparison image"
            className="flex gap-1 rounded-lg border border-border p-1 md:hidden"
          >
            {(["Before", "After"] as const).map((label) => (
              <button
                key={label}
                type="button"
                aria-pressed={mobileImage === label}
                onClick={() => setMobileImage(label)}
                className={
                  "rounded-md px-3 py-2 text-sm " +
                  (mobileImage === label ? "bg-foreground text-background" : "")
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  function canvas(full: boolean) {
    if (!beforeUrl || !afterUrl)
      return (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {!beforeUrl
            ? "Add a room photo to compare before and after."
            : "Generate a concept to compare it with your room photo."}
        </p>
      );
    if (slider)
      return (
        <div className={full ? "flex min-h-0 flex-1 flex-col" : ""}>
          <div
            role="group"
            aria-label="Image comparison canvas"
            className={
              "relative overflow-hidden rounded-xl border border-border bg-muted " +
              (full ? "min-h-0 flex-1" : "h-[60dvh] min-h-72 max-h-[800px]")
            }
          >
            <div className="absolute inset-0">{picture(beforeUrl, "Before")}</div>
            <div
              data-comparison-overlay
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - clip}% 0 0)` }}
            >
              {picture(afterUrl, "After")}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-background shadow"
              style={{ left: clip + "%" }}
            />
            {clip > 0 && (
              <span className="pointer-events-none absolute bottom-3 left-3 rounded bg-foreground px-2 py-1 text-xs text-background">
                After
              </span>
            )}
            {clip < 100 && (
              <span className="pointer-events-none absolute bottom-3 right-3 rounded bg-foreground px-2 py-1 text-xs text-background">
                Before
              </span>
            )}
          </div>
          <label className="block shrink-0 pt-3 text-sm">
            Drag to compare
            <input
              type="range"
              aria-label="Before and after slider"
              aria-valuetext={`${clip}% of the after image revealed`}
              min={0}
              max={100}
              value={clip}
              onChange={(event) => setClip(Number(event.target.value))}
              className="mt-2 block w-full accent-black"
            />
          </label>
        </div>
      );
    return (
      <div
        className={
          "grid gap-3 md:grid-cols-2 " + (full ? "min-h-0 flex-1 grid-rows-1" : "grid-cols-1")
        }
      >
        {(
          [
            { label: "Before", url: beforeUrl },
            { label: "After", url: afterUrl },
          ] as const
        ).map(({ label, url }) => (
          <figure
            key={label}
            className={
              "min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-muted " +
              (full ? (mobileImage === label ? "flex" : "hidden md:flex") : "flex")
            }
          >
            <figcaption className="shrink-0 border-b border-border bg-card px-3 py-2 text-sm font-medium">
              {label}
              {label === "After" ? " · selected concept" : " · original photo"}
            </figcaption>
            <div className={full ? "min-h-0 flex-1" : "h-[55dvh] min-h-72 max-h-[760px]"}>
              {picture(url, label)}
            </div>
          </figure>
        ))}
      </div>
    );
  }
  function note() {
    if (!beforeUrl || !afterUrl) return null;
    return (
      <p className="shrink-0 pt-3 text-xs text-muted-foreground">
        {before && after && !compatible
          ? "These images have different proportions. Side by side keeps both complete; the slider is unavailable."
          : "Full images are shown without cropping. Slider alignment is approximate; use side by side if camera framing differs."}
      </p>
    );
  }
  return (
    <Dialog.Root open={expanded} onOpenChange={setExpanded}>
      <section
        aria-label="Room comparison"
        className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Before / After</h2>
          <Dialog.Trigger asChild>
            <button
              type="button"
              disabled={!beforeUrl || !afterUrl}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-40"
            >
              Expand comparison
            </button>
          </Dialog.Trigger>
        </div>
        {!expanded && (
          <>
            {beforeUrl && afterUrl && controls()}
            {canvas(false)}
            {note()}
          </>
        )}
      </section>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-foreground/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[80] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background p-3 outline-none sm:p-5"
        >
          <header className="flex shrink-0 items-center justify-between gap-3">
            <Dialog.Title className="text-base font-semibold">
              Compare before &amp; after
            </Dialog.Title>
            <Dialog.Close className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
              Close comparison
            </Dialog.Close>
          </header>
          {controls()}
          {canvas(true)}
          {note()}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import { DESIGN_TRADITIONS, stylesForTradition } from "@roomdesigner/shared";
import { StylePreview } from "./StylePreview";

export function StyleDirectionPicker({
  traditionKey,
  styles,
  roomType,
  onTradition,
  onToggle,
  onExplore,
}: {
  traditionKey: string;
  styles: string[];
  roomType: string;
  onTradition(key: string): void;
  onToggle(key: string): void;
  onExplore(): void;
}) {
  const tradition = DESIGN_TRADITIONS.find((item) => item.key === traditionKey);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Find your design direction</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with an influence, then choose up to three looks. These are curated starting points
          to explore.
        </p>
      </div>
      {!tradition ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Design traditions">
          {DESIGN_TRADITIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onTradition(item.key)}
              className="rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-foreground"
            >
              <span className="block font-semibold">
                {item.label} <span aria-hidden="true">→</span>
              </span>
              <span className="mt-2 block text-sm text-muted-foreground">{item.description}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{tradition.label} · choose your looks</h2>
            <button
              type="button"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              onClick={() => onTradition("")}
            >
              Change tradition
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {roomType === "OTHER"
              ? "Living room style references"
              : `${roomType.toLowerCase().replaceAll("_", " ")} style references`}{" "}
            · AI-created examples, adapted to your own room when you generate.
          </p>
          <div className="grid grid-cols-1 gap-4 min-[450px]:grid-cols-2 xl:grid-cols-3">
            {stylesForTradition(traditionKey).map((style) => {
              const active = styles.includes(style.key);
              return (
                <button
                  key={style.key}
                  type="button"
                  aria-pressed={active}
                  disabled={!active && styles.length >= 3}
                  onClick={() => onToggle(style.key)}
                  className={`overflow-hidden rounded-xl border bg-card text-left disabled:opacity-50 ${active ? "border-foreground ring-2 ring-foreground" : "border-border"}`}
                >
                  <StylePreview style={style} roomType={roomType} />
                  <span className="block space-y-2 p-4">
                    <span className="flex items-center justify-between gap-2 font-semibold">
                      {style.label}
                      <span aria-hidden="true">{active ? "✓" : "+"}</span>
                    </span>
                    <span className="block text-sm leading-relaxed text-muted-foreground">
                      {style.promptHint}
                    </span>
                    <span className="flex gap-1.5" aria-hidden="true">
                      {style.palette.map((color) => (
                        <span
                          key={color}
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {styles.length} of 3 looks selected. Each selected look gets a concept.
          </p>
          <button
            type="button"
            onClick={onExplore}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium"
          >
            Choose looks for me
          </button>
        </>
      )}
    </div>
  );
}

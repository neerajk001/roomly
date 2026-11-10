"use client";
import { useState } from "react";
import { STYLES, checklistForRoom, totalCreditCost } from "@roomdesigner/shared";
import { Button } from "@/components/ui/button";
export interface RestyleRequest {
  styleKey: string;
  quality: "draft" | "final";
  variations: number;
  notes: string;
  stagingItems: string[];
  includeItems?: string[];
}
export function GeneratePanel({
  roomType,
  hasPhoto,
  pending,
  error,
  onCreate,
}: {
  roomType: string;
  hasPhoto: boolean;
  pending: boolean;
  error: string | null;
  onCreate: (request: RestyleRequest) => void;
}) {
  const [styleKey, setStyleKey] = useState("modern");
  const [quality, setQuality] = useState<"draft" | "final">("draft");
  const [variations, setVariations] = useState(3);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<string[]>([]);
  return (
    <section id="generation-choices" className="space-y-4">
      {!hasPhoto && (
        <p className="text-sm text-muted-foreground">Add a room photo in Room setup first.</p>
      )}
      <label className="block text-sm font-medium">
        Design style
        <select
          aria-label="Design style"
          value={styleKey}
          onChange={(e) => setStyleKey(e.target.value)}
          className="mt-2 block h-11 w-full rounded-lg border border-border bg-background px-3"
        >
          {STYLES.map((style) => (
            <option key={style.key} value={style.key}>
              {style.label}
            </option>
          ))}
        </select>
      </label>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Preferences & generation options
        </summary>
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Items to include (optional)</legend>
            <div className="grid grid-cols-2 gap-2">
              {checklistForRoom(roomType).map(([id, label]) => (
                <label
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={items.includes(id)}
                    onChange={(e) =>
                      setItems((previous) =>
                        e.target.checked
                          ? [...previous, id]
                          : previous.filter((item) => item !== id),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            Client instructions
            <textarea
              aria-label="Client instructions"
              rows={2}
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-border bg-background p-3"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Variations
              <select
                aria-label="Variations"
                value={variations}
                onChange={(e) => setVariations(Number(e.target.value))}
                className="mt-2 block h-10 w-full rounded-lg border border-border bg-background px-2"
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Quality
              <select
                aria-label="Quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value === "final" ? "final" : "draft")}
                className="mt-2 block h-10 w-full rounded-lg border border-border bg-background px-2"
              >
                <option value="draft">Draft</option>
                <option value="final">Best quality</option>
              </select>
            </label>
          </div>
        </div>
      </details>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={pending || !hasPhoto}
          onClick={() =>
            onCreate({
              styleKey,
              quality,
              variations,
              notes,
              stagingItems: [],
              includeItems: items,
            })
          }
        >
          {pending ? "Starting…" : "Generate " + variations + " concepts"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {totalCreditCost(quality, variations)} credits
        </span>
      </div>
      <p className="text-xs text-muted-foreground">AI-generated concept visuals. Not to scale.</p>
    </section>
  );
}

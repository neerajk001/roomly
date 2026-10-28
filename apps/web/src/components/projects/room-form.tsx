"use client";

import { createRoomAction, type ProjectFormState } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useState } from "react";

const initialState: ProjectFormState = {};

const ROOM_TYPES = [
  ["LIVING_ROOM", "Living room"],
  ["BEDROOM", "Bedroom"],
  ["KITCHEN", "Kitchen"],
  ["BATHROOM", "Bathroom"],
  ["DINING_ROOM", "Dining room"],
  ["HOME_OFFICE", "Home office"],
  ["KIDS_ROOM", "Kids room"],
  ["BALCONY", "Balcony"],
  ["HALLWAY", "Hallway"],
  ["OTHER", "Other"],
] as const;

type Unit = "metric" | "imperial";

interface OpeningRow {
  id: string;
  type: "DOOR" | "WINDOW";
  width: string;
  height: string;
  qty: string;
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function toMm(value: string, unit: Unit): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(unit === "metric" ? parsed * 1000 : parsed * 304.8);
}

export function RoomForm({
  projectId,
  basePath,
}: {
  projectId: string;
  basePath: "/app" | "/studio";
}) {
  const [state, formAction, pending] = useActionState(createRoomAction, initialState);
  const [unit, setUnit] = useState<Unit>("metric");
  const [width, setWidth] = useState("4");
  const [length, setLength] = useState("5");
  const [height, setHeight] = useState("2.7");
  const [openings, setOpenings] = useState<OpeningRow[]>([]);

  const unitLabel = unit === "metric" ? "m" : "ft";

  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    const factor = next === "imperial" ? 1 / 0.3048 : 0.3048;
    const convert = (value: string) => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? (parsed * factor).toFixed(2) : value;
    };
    setWidth(convert(width));
    setLength(convert(length));
    setHeight(convert(height));
    setOpenings((rows) =>
      rows.map((row) => ({
        ...row,
        width: convert(row.width),
        height: convert(row.height),
      })),
    );
    setUnit(next);
  };

  const openingsPayload = openningsPayload(openings, unit);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="basePath" value={basePath} />
      <input type="hidden" name="widthMm" value={toMm(width, unit)} />
      <input type="hidden" name="lengthMm" value={toMm(length, unit)} />
      <input type="hidden" name="heightMm" value={toMm(height, unit)} />
      <input type="hidden" name="openings" value={JSON.stringify(openingsPayload)} />

      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.fieldErrors?.openings?.map((message) => (
        <p key={message} role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="room-name">Room name</Label>
          <Input id="room-name" name="name" required maxLength={80} placeholder="Living room" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="room-type">Room type</Label>
          <select id="room-type" name="type" defaultValue="LIVING_ROOM" className={selectClass}>
            {ROOM_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-foreground">
          Floor plan
          <span className="inline-flex rounded-md border border-input p-0.5" role="group" aria-label="Units">
            <button
              type="button"
              aria-pressed={unit === "metric"}
              onClick={() => {
                switchUnit("metric");
              }}
              className={`rounded px-3 py-1 text-xs ${unit === "metric" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Metric
            </button>
            <button
              type="button"
              aria-pressed={unit === "imperial"}
              onClick={() => {
                switchUnit("imperial");
              }}
              className={`rounded px-3 py-1 text-xs ${unit === "imperial" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Imperial
            </button>
          </span>
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="room-width">Width ({unitLabel})</Label>
            <Input
              id="room-width"
              inputMode="decimal"
              value={width}
              onChange={(event) => {
                setWidth(event.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-length">Length ({unitLabel})</Label>
            <Input
              id="room-length"
              inputMode="decimal"
              value={length}
              onChange={(event) => {
                setLength(event.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-height">Ceiling height ({unitLabel})</Label>
            <Input
              id="room-height"
              inputMode="decimal"
              value={height}
              onChange={(event) => {
                setHeight(event.target.value);
              }}
              required
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Doors and windows</legend>
        {openings.length === 0 && (
          <p className="text-xs text-muted-foreground">None added. You can add them later.</p>
        )}
        {openings.map((row, index) => (
          <div key={row.id} className="grid items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_5rem_auto]">
            <div className="space-y-1">
              <Label htmlFor={`opening-type-${row.id}`} className="text-xs">
                Kind
              </Label>
              <select
                id={`opening-type-${row.id}`}
                value={row.type}
                onChange={(event) => {
                  const value = event.target.value === "WINDOW" ? "WINDOW" : "DOOR";
                  setOpenings((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, type: value } : r)),
                  );
                }}
                className={selectClass}
              >
                <option value="DOOR">Door</option>
                <option value="WINDOW">Window</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`opening-width-${row.id}`} className="text-xs">
                Width ({unitLabel})
              </Label>
              <Input
                id={`opening-width-${row.id}`}
                inputMode="decimal"
                value={row.width}
                onChange={(event) => {
                  const value = event.target.value;
                  setOpenings((rows) => rows.map((r, i) => (i === index ? { ...r, width: value } : r)));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`opening-height-${row.id}`} className="text-xs">
                Height ({unitLabel})
              </Label>
              <Input
                id={`opening-height-${row.id}`}
                inputMode="decimal"
                value={row.height}
                onChange={(event) => {
                  const value = event.target.value;
                  setOpenings((rows) => rows.map((r, i) => (i === index ? { ...r, height: value } : r)));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`opening-qty-${row.id}`} className="text-xs">
                Qty
              </Label>
              <Input
                id={`opening-qty-${row.id}`}
                inputMode="numeric"
                value={row.qty}
                onChange={(event) => {
                  const value = event.target.value;
                  setOpenings((rows) => rows.map((r, i) => (i === index ? { ...r, qty: value } : r)));
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpenings((rows) => rows.filter((_, i) => i !== index));
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpenings((rows) => [
              ...rows,
              {
                id: crypto.randomUUID(),
                type: "DOOR",
                width: unit === "metric" ? "0.9" : "3",
                height: unit === "metric" ? "2.1" : "6.9",
                qty: "1",
              },
            ]);
          }}
        >
          Add door or window
        </Button>
      </fieldset>

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Adding…" : "Add room"}
      </Button>
    </form>
  );
}

function openningsPayload(rows: OpeningRow[], unit: Unit) {
  return rows
    .map((row) => ({
      type: row.type,
      widthMm: toMm(row.width, unit),
      heightMm: toMm(row.height, unit),
      qty: Number.parseInt(row.qty, 10),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.widthMm) &&
        Number.isFinite(row.heightMm) &&
        Number.isFinite(row.qty),
    );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveRateCardAction, type RateCardState } from "@/server/actions/rate-cards";
import { useActionState, useState } from "react";

interface Row {
  key: string;
  label: string;
  category: string;
  unit: string;
  price: string;
}

export function RateCardEditor({
  rateCardId,
  name,
  markupBps,
  taxBps,
  items,
  currency,
}: {
  rateCardId: string;
  name: string;
  markupBps: number;
  taxBps: number;
  items: { key: string; label: string; category: string; unit: string; unitPriceMinor: number }[];
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(saveRateCardAction, {} as RateCardState);
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((item) => ({
      key: item.key,
      label: item.label,
      category: item.category,
      unit: item.unit,
      price: (item.unitPriceMinor / 100).toFixed(2),
    })),
  );

  const payload = rows.map((row) => ({
    key: row.key,
    label: row.label,
    category: row.category,
    unit: row.unit,
    unitPriceMinor: Math.round((Number.parseFloat(row.price) || 0) * 100),
  }));

  const units = [
    ["AREA_WALL", "per m² wall"],
    ["AREA_FLOOR", "per m² floor"],
    ["AREA_CEILING", "per m² ceiling"],
    ["LENGTH_PERIMETER", "per m perimeter"],
    ["PER_UNIT", "per unit"],
    ["LUMP_SUM", "lump sum"],
  ] as const;

  const update = (index: number, patch: Partial<Row>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="rateCardId" value={rateCardId} />
      <input type="hidden" name="items" value={JSON.stringify(payload)} />

      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.notice !== undefined && (
        <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {state.notice}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="rate-name">Name</Label>
          <Input id="rate-name" name="name" defaultValue={name} maxLength={120} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-markup">Markup %</Label>
          <Input
            id="rate-markup"
            name="markupPercent"
            inputMode="decimal"
            defaultValue={(markupBps / 100).toString()}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-tax">Tax %</Label>
          <Input
            id="rate-tax"
            name="taxPercent"
            inputMode="decimal"
            defaultValue={(taxBps / 100).toString()}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_1fr_7rem_auto] gap-2 text-xs font-medium text-muted-foreground">
          <span>Label</span>
          <span>Category</span>
          <span>Unit</span>
          <span>Price ({currency})</span>
          <span />
        </div>
        {rows.map((row, index) => (
          <div key={row.key} className="grid grid-cols-[1fr_1fr_1fr_7rem_auto] items-center gap-2">
            <Input
              aria-label={`Label ${String(index + 1)}`}
              value={row.label}
              onChange={(event) => {
                update(index, { label: event.target.value });
              }}
            />
            <Input
              aria-label={`Category ${String(index + 1)}`}
              value={row.category}
              onChange={(event) => {
                update(index, { category: event.target.value });
              }}
            />
            <select
              aria-label={`Unit ${String(index + 1)}`}
              value={row.unit}
              onChange={(event) => {
                update(index, { unit: event.target.value });
              }}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {units.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              aria-label={`Price ${String(index + 1)}`}
              inputMode="decimal"
              value={row.price}
              onChange={(event) => {
                update(index, { price: event.target.value });
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setRows((current) => current.filter((_, i) => i !== index));
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setRows((current) => [
              ...current,
              {
                key: `custom-${crypto.randomUUID()}`,
                label: "Custom item",
                category: "custom",
                unit: "LUMP_SUM",
                price: "0.00",
              },
            ]);
          }}
        >
          Add item
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save rate card"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Prices are stored per m² / m / unit in your workspace currency. Imperial display is coming
        with the estimate builder.
      </p>
    </form>
  );
}

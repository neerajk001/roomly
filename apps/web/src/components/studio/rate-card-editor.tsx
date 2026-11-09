"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  importRateCardCsvAction,
  saveRateCardAction,
  type RateCardState,
} from "@/server/actions/rate-cards";
import { useActionState, useState } from "react";
import {
  parseDisplayRate,
  formatDecimalHundredths,
  formatMoneyInput,
  displayRateMinor,
  rateUnitLabel,
} from "@roomdesigner/estimate";

interface Row {
  key: string;
  label: string;
  category: string;
  unit: string;
  price: string;
  storedPrice: number;
  priceEdited: boolean;
}

export function RateCardEditor({
  rateCardId,
  name,
  markupBps,
  taxBps,
  items,
  currency,
  unitSystem = "METRIC",
}: {
  rateCardId: string;
  name: string;
  markupBps: number;
  taxBps: number;
  items: { key: string; label: string; category: string; unit: string; unitPriceMinor: number }[];
  currency: string;
  unitSystem?: string;
}) {
  const [state, formAction, pending] = useActionState(saveRateCardAction, {} as RateCardState);
  const [csvState, csvAction, csvPending] = useActionState(
    importRateCardCsvAction,
    {} as RateCardState,
  );
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<Row[]>(() =>
    items
      .map((item) => ({
        key: item.key,
        label: item.label,
        category: item.category,
        unit: item.unit,
        price: formatMoneyInput(
          displayRateMinor(item.unitPriceMinor, item.unit, unitSystem),
          currency,
        ),
        storedPrice: item.unitPriceMinor,
        priceEdited: false,
      }))
      .sort((a, b) => a.category.localeCompare(b.category)),
  );

  const payload = rows.map((row) => ({
    key: row.key,
    label: row.label,
    category: row.category,
    unit: row.unit,
    unitPriceMinor: !row.priceEdited
      ? row.storedPrice
      : parseDisplayRate(row.price, row.unit, unitSystem, currency),
  }));

  const units = [
    ["AREA_WALL", `per ${rateUnitLabel("AREA_WALL", unitSystem)} wall`],
    ["AREA_FLOOR", `per ${rateUnitLabel("AREA_FLOOR", unitSystem)} floor`],
    ["AREA_CEILING", `per ${rateUnitLabel("AREA_CEILING", unitSystem)} ceiling`],
    ["LENGTH_PERIMETER", `per ${rateUnitLabel("LENGTH_PERIMETER", unitSystem)} perimeter`],
    ["PER_UNIT", "per unit"],
    ["LUMP_SUM", "lump sum"],
  ] as const;

  const update = (index: number, patch: Partial<Row>) => {
    setRows((current) =>
      current
        .map((row, i) =>
          i === index
            ? {
                ...row,
                ...patch,
                ...(patch.price !== undefined ? { priceEdited: patch.priceEdited ?? true } : {}),
              }
            : row,
        )
        .sort((a, b) => a.category.localeCompare(b.category)),
    );
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
        <p
          role="status"
          className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
        >
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
            defaultValue={formatDecimalHundredths(markupBps)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate-tax">Tax %</Label>
          <Input
            id="rate-tax"
            name="taxPercent"
            inputMode="decimal"
            defaultValue={formatDecimalHundredths(taxBps)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="hidden gap-2 text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-[1fr_1fr_1fr_7rem_auto]">
          <span>Label</span>
          <span>Category</span>
          <span>Unit</span>
          <span>Price ({currency})</span>
          <span />
        </div>
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="grid grid-cols-1 items-center gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_7rem_auto]"
          >
            {(index === 0 || rows[index - 1]?.category !== row.category) && (
              <h3 className="col-span-full text-sm font-semibold">
                {row.category || "Uncategorized"}
              </h3>
            )}
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
                const metric = row.priceEdited
                  ? (parseDisplayRate(row.price, row.unit, unitSystem, currency) ?? 0)
                  : row.storedPrice;
                const unit = event.target.value;
                update(index, {
                  unit,
                  price: formatMoneyInput(displayRateMinor(metric, unit, unitSystem), currency),
                  storedPrice: metric,
                  priceEdited: false,
                });
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
              aria-label={`Price ${String(index + 1)} (${currency} per ${rateUnitLabel(row.unit, unitSystem)})`}
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
            <div className="col-span-full flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0 || rows[index - 1]?.category !== row.category}
                onClick={() =>
                  setRows((current) => {
                    const next = [...current];
                    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                    return next;
                  })
                }
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === rows.length - 1 || rows[index + 1]?.category !== row.category}
                onClick={() =>
                  setRows((current) => {
                    const next = [...current];
                    [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                    return next;
                  })
                }
              >
                Move down
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setRows((current) =>
              [
                ...current,
                {
                  key: `custom-${crypto.randomUUID()}`,
                  label: "Custom item",
                  category: "custom",
                  unit: "LUMP_SUM",
                  price: "0.00",
                  storedPrice: 0,
                  priceEdited: false,
                },
              ].sort((a, b) => a.category.localeCompare(b.category)),
            );
          }}
        >
          Add item
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save rate card"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {unitSystem === "IMPERIAL"
          ? "Prices are displayed per sq ft / ft."
          : "Prices are displayed per m² / m."}{" "}
        Storage and CSV imports use metric rates. Unedited prices retain their exact stored value.
      </p>

      <div className="space-y-2 border-t border-border pt-4">
        <Label htmlFor="rate-csv">CSV import / export</Label>
        <p className="text-xs text-muted-foreground">
          Header: key,label,category,unit,price. Any invalid row rejects the whole file.
        </p>
        <textarea
          id="rate-csv"
          rows={4}
          value={csvText}
          onChange={(event) => {
            setCsvText(event.target.value);
          }}
          placeholder="key,label,category,unit,price"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/rate-cards/${rateCardId}/export`}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/50"
          >
            Export CSV
          </a>
        </div>
      </div>

      {csvState.error !== undefined && (
        <p role="alert" className="text-sm text-destructive">
          {csvState.error}
        </p>
      )}
      {csvState.notice !== undefined && (
        <p role="status" className="text-sm text-muted-foreground">
          {csvState.notice}
        </p>
      )}
      <Button type="submit" formAction={csvAction} disabled={csvPending || csvText.trim() === ""}>
        {csvPending ? "Importing..." : "Import CSV"}
      </Button>
      <input type="hidden" name="csv" value={csvText} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="markupPercent" value={markupBps / 100} />
      <input type="hidden" name="taxPercent" value={taxBps / 100} />
    </form>
  );
}

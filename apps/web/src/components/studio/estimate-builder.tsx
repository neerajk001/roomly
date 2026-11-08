"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveEstimateAction, type SaveEstimateState } from "@/server/actions/studio-estimates";
import { formatMoney } from "@roomdesigner/shared";
import {
  recompute,
  parseDisplayRate,
  formatDecimalHundredths,
  displayRateMinor,
  displayQuantity,
  storedQuantity,
  rateUnitLabel,
  rangeForTotal,
} from "@roomdesigner/estimate";
import { useActionState, useState } from "react";
import Link from "next/link";

interface Line {
  id: string;
  label: string;
  category: string;
  unit: string;
  quantity: string;
  price: string;
  originalQuantity: number;
  originalPriceMinor: number;
  quantityEdited: boolean;
  priceEdited: boolean;
}

export function EstimateBuilder({
  roomId,
  rateCardId,
  rateCardName,
  currency,
  markupBps,
  taxBps,
  lines,
  versions,
  unitSystem = "METRIC",
  estimatePath,
  readOnly = false,
  selectedVersion,
  initialRangeBps = 0,
}: {
  roomId: string;
  rateCardId: string;
  rateCardName: string;
  currency: string;
  markupBps: number;
  taxBps: number;
  lines: {
    label: string;
    category: string;
    unit: string;
    quantity: number;
    unitPriceMinor: number;
  }[];
  versions: { id: string; version: number; totalMinor: number; createdAt: string }[];
  unitSystem?: string;
  estimatePath: string;
  readOnly?: boolean;
  initialRangeBps?: number;
  selectedVersion?: {
    version: number;
    sent: boolean;
    subtotalMinor: number;
    markupMinor: number;
    taxMinor: number;
    totalMinor: number;
  };
}) {
  const [state, formAction, pending] = useActionState(saveEstimateAction, {} as SaveEstimateState);
  const [rows, setRows] = useState<Line[]>(() =>
    lines.map((line, index) => ({
      id: `line-${String(index)}`,
      label: line.label,
      category: line.category,
      unit: line.unit,
      quantity: displayQuantity(line.quantity, line.unit, unitSystem).toFixed(2),
      price: formatDecimalHundredths(displayRateMinor(line.unitPriceMinor, line.unit, unitSystem)),
      originalQuantity: line.quantity,
      originalPriceMinor: line.unitPriceMinor,
      quantityEdited: false,
      priceEdited: false,
    })),
  );
  const [rangeBps, setRangeBps] = useState(initialRangeBps);

  const metricRow = (row: Line) => ({
    label: row.label,
    category: row.category,
    unit: row.unit,
    quantity: row.quantityEdited
      ? storedQuantity(Number(row.quantity), row.unit, unitSystem)
      : row.originalQuantity,
    unitPriceMinor: row.priceEdited
      ? parseDisplayRate(row.price, row.unit, unitSystem)
      : row.originalPriceMinor,
  });

  const computed = recompute(
    rows.map((row) => ({
      label: row.label,
      category: row.category,
      unit: row.unit as never,
      quantity:
        Number.isFinite(metricRow(row).quantity) &&
        metricRow(row).quantity >= 0 &&
        metricRow(row).quantity <= 100000
          ? metricRow(row).quantity
          : 0,
      unitPriceMinor: metricRow(row).unitPriceMinor ?? 0,
    })),
    { currency, markupBps, taxBps, rangeBps },
  );

  const payload = rows.map(metricRow);
  const invalid = payload.some(
    (row) =>
      row.unitPriceMinor === null ||
      !Number.isFinite(row.quantity) ||
      row.quantity < 0 ||
      row.quantity > 100000,
  );
  const totals = readOnly && selectedVersion !== undefined ? selectedVersion : computed;
  const bounds = rangeForTotal(totals.totalMinor, rangeBps);

  const update = (index: number, patch: Partial<Line>) => {
    setRows((current) =>
      current.map((row, i) =>
        i === index
          ? {
              ...row,
              ...patch,
              ...(patch.price !== undefined ? { priceEdited: true } : {}),
              ...(patch.quantity !== undefined ? { quantityEdited: true } : {}),
            }
          : row,
      ),
    );
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="roomId" value={roomId} />
      <input type="hidden" name="rateCardId" value={rateCardId} />
      <input type="hidden" name="lines" value={JSON.stringify(payload)} />
      <input type="hidden" name="rangeBps" value={rangeBps} />
      {readOnly && selectedVersion !== undefined && (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          Saved version {selectedVersion.version} is read-only
          {selectedVersion.sent ? " and referenced by a sent proposal" : ""}.{" "}
          <Link
            className="underline"
            href={`${estimatePath}?copy=${versions.find((version) => version.version === selectedVersion.version)?.id ?? ""}`}
          >
            Create a new version from this
          </Link>
        </p>
      )}
      <fieldset disabled={readOnly} className="space-y-4">
        {state.error !== undefined && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
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

        <p className="text-xs text-muted-foreground">
          Rate card: {rateCardName}
          {!readOnly && ` · current markup ${markupBps / 100}% · current tax ${taxBps / 100}%`}.
          Units: {unitSystem === "IMPERIAL" ? "sq ft / ft" : "m² / m"}.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rangeBps > 0}
            onChange={(event) => setRangeBps(event.target.checked ? 2000 : 0)}
          />
          Show as a rough ±20% range
        </label>

        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_2fr_1fr_1fr_auto]"
            >
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
              <Input
                aria-label={`Quantity ${String(index + 1)} (${rateUnitLabel(row.unit, unitSystem)})`}
                inputMode="decimal"
                value={row.quantity}
                onChange={(event) => {
                  update(index, { quantity: event.target.value });
                }}
              />
              <Input
                aria-label={`Unit price ${String(index + 1)} (${currency} per ${rateUnitLabel(row.unit, unitSystem)})`}
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
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
                  size="sm"
                  variant="ghost"
                  disabled={index === rows.length - 1}
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
              setRows((current) => [
                ...current,
                {
                  id: `line-${crypto.randomUUID()}`,
                  label: "Custom line",
                  category: "custom",
                  unit: "LUMP_SUM",
                  quantity: "1",
                  price: "0.00",
                  originalQuantity: 1,
                  originalPriceMinor: 0,
                  quantityEdited: false,
                  priceEdited: false,
                },
              ]);
            }}
          >
            Add line
          </Button>
          <Button type="submit" size="sm" disabled={pending || invalid}>
            {pending ? "Saving..." : "Save as new version"}
          </Button>
        </div>

        {invalid && (
          <p role="alert" className="text-sm text-destructive">
            Check quantities and prices. Prices must have at most two decimal places and be within
            the supported limit.
          </p>
        )}
        <dl className="grid max-w-xs grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="text-right">{formatMoney(totals.subtotalMinor, currency)}</dd>
          <dt className="text-muted-foreground">Markup</dt>
          <dd className="text-right">{formatMoney(totals.markupMinor, currency)}</dd>
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="text-right">{formatMoney(totals.taxMinor, currency)}</dd>
          <dt className="font-medium">Total</dt>
          <dd className="text-right font-medium">
            {rangeBps > 0
              ? `${formatMoney(bounds.lowMinor, currency)} – ${formatMoney(bounds.highMinor, currency)}`
              : formatMoney(totals.totalMinor, currency)}
          </dd>
        </dl>
      </fieldset>

      {versions.length > 0 && (
        <div className="space-y-1 border-t border-border pt-3">
          <Label className="text-xs">Version history</Label>
          <ul className="space-y-1 text-sm">
            {versions.map((version) => (
              <li key={version.id} className="flex justify-between gap-2 text-muted-foreground">
                <Link className="underline" href={`${estimatePath}?version=${version.id}`}>
                  v{version.version}
                </Link>
                <span>{formatMoney(version.totalMinor, currency)}</span>
                <span className="text-xs">{new Date(version.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

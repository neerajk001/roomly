"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveEstimateAction, type SaveEstimateState } from "@/server/actions/studio-estimates";
import { formatMoney } from "@roomdesigner/shared";
import { recompute, parseDecimalHundredths, formatDecimalHundredths } from "@roomdesigner/estimate";
import { useActionState, useMemo, useState } from "react";

interface Line {
  id: string;
  label: string;
  category: string;
  unit: string;
  quantity: string;
  price: string;
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
}) {
  const [state, formAction, pending] = useActionState(saveEstimateAction, {} as SaveEstimateState);
  const [rows, setRows] = useState<Line[]>(() =>
    lines.map((line, index) => ({
      id: `line-${String(index)}`,
      label: line.label,
      category: line.category,
      unit: line.unit,
      quantity: line.quantity.toFixed(2),
      price: formatDecimalHundredths(line.unitPriceMinor),
    })),
  );

  const computed = useMemo(
    () =>
      recompute(
        rows.map((row) => ({
          label: row.label,
          category: row.category,
          unit: row.unit as never,
          quantity:
            Number.isFinite(Number(row.quantity)) &&
            Number(row.quantity) >= 0 &&
            Number(row.quantity) <= 100000
              ? Number(row.quantity)
              : 0,
          unitPriceMinor: parseDecimalHundredths(row.price) ?? 0,
        })),
        { currency, markupBps, taxBps },
      ),
    [rows, currency, markupBps, taxBps],
  );

  const payload = rows.map((row) => ({
    label: row.label,
    category: row.category,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitPriceMinor: parseDecimalHundredths(row.price),
  }));

  const update = (index: number, patch: Partial<Line>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="roomId" value={roomId} />
      <input type="hidden" name="rateCardId" value={rateCardId} />
      <input type="hidden" name="lines" value={JSON.stringify(payload)} />

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

      <p className="text-xs text-muted-foreground">
        Rate card: {rateCardName} · markup {markupBps / 100}% · tax {taxBps / 100}%
      </p>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_2fr_1fr_1fr_auto]">
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
              aria-label={`Quantity ${String(index + 1)}`}
              inputMode="decimal"
              value={row.quantity}
              onChange={(event) => {
                update(index, { quantity: event.target.value });
              }}
            />
            <Input
              aria-label={`Unit price ${String(index + 1)}`}
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
                id: `line-${crypto.randomUUID()}`,
                label: "Custom line",
                category: "custom",
                unit: "LUMP_SUM",
                quantity: "1",
                price: "0.00",
              },
            ]);
          }}
        >
          Add line
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save as new version"}
        </Button>
      </div>

      <dl className="grid max-w-xs grid-cols-2 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right">{formatMoney(computed.subtotalMinor, currency)}</dd>
        <dt className="text-muted-foreground">Markup</dt>
        <dd className="text-right">{formatMoney(computed.markupMinor, currency)}</dd>
        <dt className="text-muted-foreground">Tax</dt>
        <dd className="text-right">{formatMoney(computed.taxMinor, currency)}</dd>
        <dt className="font-medium">Total</dt>
        <dd className="text-right font-medium">{formatMoney(computed.totalMinor, currency)}</dd>
      </dl>

      {versions.length > 0 && (
        <div className="space-y-1 border-t border-border pt-3">
          <Label className="text-xs">Version history</Label>
          <ul className="space-y-1 text-sm">
            {versions.map((version) => (
              <li key={version.id} className="flex justify-between gap-2 text-muted-foreground">
                <span>v{version.version}</span>
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

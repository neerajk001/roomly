"use client";

import { Button } from "@/components/ui/button";
import { CATEGORY_IMPACT, formatMoney, typicalSizeFor, type ScopeItem } from "@roomdesigner/shared";
import { computeEstimate, rankChanges, type RateItem } from "@roomdesigner/estimate";
import { track } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const RANGE_BPS = 2000;

export interface EstimatePanelProps {
  projectId: string;
  roomId: string;
  roomType: string;
  widthMm: number | null;
  lengthMm: number | null;
  heightMm: number | null;
  openings: { type: "DOOR" | "WINDOW"; widthMm: number; heightMm: number; qty: number }[];
  rateItems: RateItem[];
  scope: ScopeItem[];
  currency: string;
  budgetMinor: number | null;
  usedTypicalSize: boolean;
}

export function EstimatePanel(props: EstimatePanelProps) {
  useEffect(() => {
    track("estimate_viewed", { usedTypical: props.usedTypicalSize });
  }, [props.usedTypicalSize]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(props.scope.map((item) => item.itemKey)),
  );

  const typical = typicalSizeFor(props.roomType);
  const usedTypical =
    props.usedTypicalSize ||
    props.widthMm === null ||
    props.lengthMm === null ||
    props.heightMm === null;

  const result = useMemo(() => {
    const room = {
      widthMm: props.widthMm ?? typical.widthMm,
      lengthMm: props.lengthMm ?? typical.lengthMm,
      heightMm: props.heightMm ?? typical.heightMm,
      openings: props.openings,
    };
    const selections = props.scope
      .filter((item) => selected.has(item.itemKey))
      .map((item) => ({ itemKey: item.itemKey }));
    return computeEstimate(room, props.rateItems, selections, {
      currency: props.currency,
      markupBps: 0,
      taxBps: 0,
      rangeBps: RANGE_BPS,
    });
  }, [props, selected, typical]);

  const ranked = useMemo(
    () => rankChanges(result.lines, CATEGORY_IMPACT, props.budgetMinor ?? undefined),
    [result.lines, props.budgetMinor],
  );

  const top = ranked.slice(0, 3);
  const highMinor = result.highMinor ?? result.totalMinor;
  const overBudget = props.budgetMinor !== null && highMinor > props.budgetMinor;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {formatMoney(result.lowMinor ?? 0, props.currency)} –{" "}
          {formatMoney(highMinor, props.currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          Rough range. Actual prices vary by location and provider.
          {usedTypical ? " Uses typical room sizes — extra rough." : ""}
        </p>
        {props.budgetMinor !== null && (
          <p className={`mt-1 text-xs ${overBudget ? "text-destructive" : "text-emerald-700"}`}>
            {overBudget
              ? "This is over your budget. Try renter mode or fewer categories."
              : "Within your budget."}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">What to change first</p>
        <ol className="space-y-1 text-sm">
          {top.map((change, index) => (
            <li key={change.itemKey} className="flex items-center justify-between gap-3">
              <span>
                {String(index + 1)}. {change.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatMoney(change.estimatedCostMinor, props.currency)}
                {props.budgetMinor !== null ? (change.fitsBudget ? " · fits" : " · over") : ""}
              </span>
            </li>
          ))}
          {top.length === 0 && <li className="text-muted-foreground">Nothing selected.</li>}
        </ol>
      </div>

      <details>
        <summary className="cursor-pointer text-sm font-medium">Adjust cost categories</summary>
        <fieldset className="mt-3 space-y-2">
          <legend className="text-sm font-medium">Categories</legend>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {props.scope.map((item) => {
              const line = result.lines.find((entry) => entry.itemKey === item.itemKey);
              const active = selected.has(item.itemKey);
              return (
                <li key={item.itemKey}>
                  <label className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(item.itemKey)) next.delete(item.itemKey);
                            else next.add(item.itemKey);
                            return next;
                          });
                        }}
                      />
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {line !== undefined ? formatMoney(line.totalMinor, props.currency) : "—"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </details>

      <Button asChild variant="outline" size="sm">
        <Link href={`/app/projects/${props.projectId}/rooms/${props.roomId}/shopping-list`}>
          Shopping list
        </Link>
      </Button>
    </div>
  );
}

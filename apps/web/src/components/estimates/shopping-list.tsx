"use client";

import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@roomdesigner/shared";
import { useState } from "react";

export interface ShoppingItem {
  key: string;
  label: string;
  sizeGuide: string;
  amountMinor: number | null;
  sharePercent: number;
}

export function ShoppingList({
  items,
  currency,
  budgetMinor,
}: {
  items: ShoppingItem[];
  currency: string;
  budgetMinor: number | null;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const lines = items.map(
      (item) =>
        `${checked.has(item.key) ? "[x]" : "[ ]"} ${item.label} — ${item.sizeGuide}${
          item.amountMinor !== null ? ` — ${formatMoney(item.amountMinor, currency)}` : ""
        }`,
    );
    const text = `Shopping list\n\n${lines.join("\n")}\n\nRough prices, illustrative only.`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const isChecked = checked.has(item.key);
          return (
            <li key={item.key} className="flex items-start justify-between gap-4 py-3">
              <label className="flex flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    setChecked((current) => {
                      const next = new Set(current);
                      if (next.has(item.key)) next.delete(item.key);
                      else next.add(item.key);
                      return next;
                    });
                  }}
                  className="mt-1"
                />
                <span>
                  <span className={`block text-sm font-medium ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.sizeGuide}</span>
                </span>
              </label>
              <p className="shrink-0 text-sm text-muted-foreground">
                {item.amountMinor !== null && budgetMinor !== null
                  ? formatMoney(item.amountMinor, currency)
                  : `${String(item.sharePercent)}%`}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? "Copied" : "Copy list"}
        </Button>
        <PrintButton />
      </div>
    </div>
  );
}

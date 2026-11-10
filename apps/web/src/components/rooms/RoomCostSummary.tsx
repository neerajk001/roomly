import Link from "next/link";
import { formatMoney } from "@roomdesigner/shared";
export interface EstimateSummary {
  currency: string;
  lowMinor: number;
  highMinor: number;
  top: { label: string; totalMinor: number }[];
}

export function RoomCostSummary({ estimate }: { estimate: EstimateSummary }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Estimated cost range</h2>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Based on your room measurements and selected scope. This range is shared across
            concepts; prices may vary by location and provider.
          </p>
        </div>
        <span className="shrink-0 rounded-xl border border-border bg-card px-2 py-1 text-[11px] font-semibold">
          {estimate.currency}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {formatMoney(estimate.lowMinor, estimate.currency)} –{" "}
        {formatMoney(estimate.highMinor, estimate.currency)}
      </p>
      <p className="mt-4 text-xs font-semibold text-foreground">Suggested estimate priorities</p>
      <ul className="mt-2 divide-y divide-border">
        {estimate.top.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2 py-2 text-xs">
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="shrink-0 font-semibold text-foreground">
              {formatMoney(item.totalMinor, estimate.currency)}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="#cost-breakdown"
        className="mt-3 block rounded-xl border border-border bg-card px-3 py-2 text-center text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-white"
      >
        View itemized costs →
      </Link>
    </section>
  );
}

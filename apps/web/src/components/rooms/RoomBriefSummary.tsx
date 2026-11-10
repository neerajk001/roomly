export function RoomBriefSummary({
  roomLabel,
  dimensions,
  keepList,
  notes,
}: {
  roomLabel: string;
  dimensions: string;
  keepList: string[];
  notes: string | null;
}) {
  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground">
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          Room details &amp; selected items
        </span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="border-t border-border px-4 py-3">
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Room</dt>
            <dd className="font-semibold text-foreground">{roomLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dimensions</dt>
            <dd className="font-semibold text-foreground">{dimensions}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Keep items</dt>
            <dd className="font-semibold text-foreground">
              {keepList.length > 0 ? keepList.join(", ") : "None"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="font-semibold text-foreground">
              {notes === null || notes === "" ? "None" : notes}
            </dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

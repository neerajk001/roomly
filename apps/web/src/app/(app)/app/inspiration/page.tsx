import { requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

export const metadata = { title: "Inspiration" };

type InspirationItem = {
  id: string;
  styleKey: string;
  styleLabel: string;
  roomType: "LIVING_ROOM" | "BEDROOM" | "KITCHEN" | "HOME_OFFICE" | "BATHROOM" | "DINING_ROOM";
  roomLabel: string;
  image: string;
  small: boolean;
};

const ITEMS: readonly InspirationItem[] = [
  {
    id: "scandinavian-living",
    styleKey: "scandinavian",
    styleLabel: "Scandinavian",
    roomType: "LIVING_ROOM",
    roomLabel: "Living room",
    image: "/demo/living-after.jpg",
    small: false,
  },
  {
    id: "japandi-living",
    styleKey: "japandi",
    styleLabel: "Japandi",
    roomType: "LIVING_ROOM",
    roomLabel: "Living room",
    image: "/demo/homeowner-feature.jpg",
    small: false,
  },
  {
    id: "modern-kitchen",
    styleKey: "modern",
    styleLabel: "Modern",
    roomType: "KITCHEN",
    roomLabel: "Kitchen",
    image: "/demo/kitchen-after.jpg",
    small: true,
  },
  {
    id: "boho-bedroom",
    styleKey: "bohemian",
    styleLabel: "Boho",
    roomType: "BEDROOM",
    roomLabel: "Bedroom",
    image: "/demo/hero-after-boho.jpg",
    small: false,
  },
  {
    id: "minimalist-living",
    styleKey: "minimalist",
    styleLabel: "Minimalist",
    roomType: "LIVING_ROOM",
    roomLabel: "Living room",
    image: "/demo/hero-after-minimal.jpg",
    small: true,
  },
  {
    id: "coastal-bedroom",
    styleKey: "coastal",
    styleLabel: "Coastal",
    roomType: "BEDROOM",
    roomLabel: "Bedroom",
    image: "/demo/bedroom-after.jpg",
    small: false,
  },
  {
    id: "industrial-office",
    styleKey: "industrial",
    styleLabel: "Industrial",
    roomType: "HOME_OFFICE",
    roomLabel: "Home office",
    image: "/demo/office-after.jpg",
    small: true,
  },
  {
    id: "mid-century-dining",
    styleKey: "mid-century",
    styleLabel: "Mid-century",
    roomType: "DINING_ROOM",
    roomLabel: "Dining room",
    image: "/demo/dining-after.jpg",
    small: false,
  },
  {
    id: "contemporary-bath",
    styleKey: "contemporary",
    styleLabel: "Contemporary",
    roomType: "BATHROOM",
    roomLabel: "Bathroom",
    image: "/demo/bath-after.jpg",
    small: true,
  },
  {
    id: "farmhouse-kitchen",
    styleKey: "farmhouse",
    styleLabel: "Farmhouse",
    roomType: "KITCHEN",
    roomLabel: "Kitchen",
    image: "/demo/kitchen-after.jpg",
    small: false,
  },
  {
    id: "art-deco-living",
    styleKey: "art-deco",
    styleLabel: "Art deco",
    roomType: "LIVING_ROOM",
    roomLabel: "Living room",
    image: "/demo/hero-after-modern.jpg",
    small: false,
  },
  {
    id: "traditional-dining",
    styleKey: "traditional",
    styleLabel: "Traditional",
    roomType: "DINING_ROOM",
    roomLabel: "Dining room",
    image: "/demo/dining-after.jpg",
    small: false,
  },
];

const FILTERS = [
  ["", "All"],
  ["LIVING_ROOM", "Living rooms"],
  ["BEDROOM", "Bedrooms"],
  ["KITCHEN", "Kitchens"],
  ["SMALL", "Small spaces"],
] as const;

function href(params: { type?: string; q?: string }): string {
  const search = new URLSearchParams();
  if (params.type !== undefined && params.type !== "") search.set("type", params.type);
  if (params.q !== undefined && params.q !== "") search.set("q", params.q);
  const query = search.toString();
  return query === "" ? "/app/inspiration" : `/app/inspiration?${query}`;
}

function matches(item: InspirationItem, type: string, query: string): boolean {
  if (type === "SMALL" && !item.small) return false;
  if (type !== "" && type !== "SMALL" && item.roomType !== type) return false;
  if (query === "") return true;
  const haystack = `${item.styleLabel} ${item.roomLabel}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default async function InspirationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  await requireWorkspace();
  const { type, q } = await searchParams;
  const activeType = type ?? "";
  const query = q?.trim() ?? "";
  const results = ITEMS.filter((item) => matches(item, activeType, query));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl">
          Find your next idea
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Explore styles, rooms and looks worth trying.
        </p>
      </div>

      <form
        action="/app/inspiration"
        method="get"
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
      >
        {activeType === "" ? null : <input type="hidden" name="type" value={activeType} />}
        <svg
          className="h-4 w-4 shrink-0 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <label htmlFor="inspiration-search" className="sr-only">
          Search inspiration
        </label>
        <input
          id="inspiration-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search rooms, styles, colors..."
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => {
          const active = activeType === value;
          return (
            <Link
              key={label}
              href={href({ type: value, q: query })}
              aria-current={active ? "page" : undefined}
              className={`border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-border bg-foreground text-white"
                  : "border-border bg-card text-foreground hover:bg-foreground/5"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {results.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-semibold text-foreground">No looks match that search</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Try a different room or style, or clear your filters.
          </p>
          <Link
            href="/app/inspiration"
            className="mt-4 inline-block rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item, index) => (
            <li key={item.id} className="contents">
              <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
                <img
                  src={item.image}
                  alt={`${item.styleLabel} ${item.roomLabel.toLowerCase()}`}
                  className="h-40 w-full border-b border-border object-cover"
                  loading={index < 3 ? "eager" : "lazy"}
                />
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.styleLabel}</p>
                      <p className="text-[11px] text-muted-foreground">{item.roomLabel}</p>
                    </div>
                    <span className="text-muted-foreground" aria-hidden="true">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 3h12v18l-6-4-6 4z" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <Link
                      href={`/new?style=${item.styleKey}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-foreground hover:text-white"
                    >
                      <span>Use this style</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                    <span className="text-muted-foreground" aria-hidden="true">
                      ⋮
                    </span>
                  </div>
                </div>
              </article>

              {index === 1 ? (
                <aside className="flex flex-col rounded-xl border border-border bg-accent p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
                      <line x1="9" y1="19" x2="15" y2="19" />
                    </svg>
                  </span>
                  <p className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground">
                    Found a look you love?
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Try it on your own room and see how it looks.
                  </p>
                  <Link
                    href="/new"
                    className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-all   hover:shadow-sm"
                  >
                    <span>Create a design</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </aside>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

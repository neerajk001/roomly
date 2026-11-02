import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { getStyle } from "@roomdesigner/shared";
import { requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

export const metadata = { title: "Saved" };

const ROOM_LABELS: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
  DINING_ROOM: "Dining room",
  HOME_OFFICE: "Home office",
  KIDS_ROOM: "Kids room",
  BALCONY: "Balcony",
  HALLWAY: "Hallway",
  OTHER: "Room",
};

const VIEWS = [
  ["all", "All saved"],
  ["rooms", "Rooms"],
  ["styles", "Styles"],
] as const;

const COLLECTIONS = [
  ["all", "Dream home"],
  ["living", "Living room ideas"],
  ["bedroom", "Bedroom ideas"],
  ["later", "For later"],
] as const;

type Collection = (typeof COLLECTIONS)[number][0];

function href(params: {
  view?: string;
  collection?: string;
  sort?: string;
  q?: string;
}): string {
  const search = new URLSearchParams();
  if (params.view !== undefined && params.view !== "all") search.set("view", params.view);
  if (params.collection !== undefined && params.collection !== "all")
    search.set("collection", params.collection);
  if (params.sort !== undefined && params.sort !== "recent") search.set("sort", params.sort);
  if (params.q !== undefined && params.q !== "") search.set("q", params.q);
  const query = search.toString();
  return query === "" ? "/app/saved" : `/app/saved?${query}`;
}

function inCollection(roomType: string, collection: Collection): boolean {
  if (collection === "all") return true;
  if (collection === "living") return roomType === "LIVING_ROOM";
  if (collection === "bedroom") return roomType === "BEDROOM";
  return roomType !== "LIVING_ROOM" && roomType !== "BEDROOM";
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; collection?: string; sort?: string; q?: string }>;
}) {
  const { view, collection, sort, q } = await searchParams;
  const { workspace } = await requireWorkspace();
  const activeView = view === "rooms" || view === "styles" ? view : "all";
  const activeCollection: Collection =
    collection === "living" || collection === "bedroom" || collection === "later"
      ? collection
      : "all";
  const activeSort = sort === "oldest" ? "oldest" : "recent";
  const query = q?.trim() ?? "";

  const savedRaw = await prisma.renderOutput.findMany({
    where: { isFavorite: true, job: { workspaceId: workspace.id } },
    orderBy: { createdAt: activeSort === "oldest" ? "asc" : "desc" },
    take: 48,
    include: {
      asset: { select: { storageKey: true } },
      thumbAsset: { select: { storageKey: true } },
      job: {
        select: {
          styleKey: true,
          room: {
            select: {
              id: true,
              projectId: true,
              type: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const all = await Promise.all(
    savedRaw.map(async (output) => {
      const roomLabel = ROOM_LABELS[output.job.room.type] ?? "Room";
      const styleLabel = output.job.styleKey === null ? "Saved" : (getStyle(output.job.styleKey)?.label ?? "Saved");
      return {
        id: output.id,
        roomId: output.job.room.id,
        projectId: output.job.room.projectId,
        roomType: output.job.room.type,
        roomLabel,
        styleLabel,
        styleKey: output.job.styleKey,
        title: `${styleLabel} ${roomLabel.toLowerCase()}`,
        url: await presignGet(output.thumbAsset?.storageKey ?? output.asset.storageKey),
      };
    }),
  );

  const counts = {
    all: all.length,
    living: all.filter((item) => item.roomType === "LIVING_ROOM").length,
    bedroom: all.filter((item) => item.roomType === "BEDROOM").length,
    later: all.filter((item) => item.roomType !== "LIVING_ROOM" && item.roomType !== "BEDROOM").length,
  };

  const filtered = all.filter((item) => {
    if (!inCollection(item.roomType, activeCollection)) return false;
    if (activeView === "rooms" && item.roomType === "OTHER") return false;
    if (activeView === "styles" && item.styleKey === null) return false;
    if (query === "") return true;
    return `${item.title} ${item.roomLabel} ${item.styleLabel}`
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_250px]">
      <div className="min-w-0 space-y-5">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.02] tracking-tight text-black sm:text-5xl">
            Your saved concepts
          </h1>
          <p className="mt-2 text-sm text-black/70">The looks you want to come back to.</p>
        </div>

        <form action="/app/saved" method="get" className="flex items-center gap-2 border border-black bg-white px-3 py-2">
          {activeView === "all" ? null : <input type="hidden" name="view" value={activeView} />}
          {activeCollection === "all" ? null : <input type="hidden" name="collection" value={activeCollection} />}
          <svg className="h-4 w-4 shrink-0 text-black/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <label htmlFor="saved-search" className="sr-only">
            Search saved items
          </label>
          <input
            id="saved-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search your saved items..."
            className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/50"
          />
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {VIEWS.map(([value, label]) => {
              const active = activeView === value;
              return (
                <Link
                  key={value}
                  href={href({ view: value, collection: activeCollection, sort: activeSort, q: query })}
                  aria-current={active ? "page" : undefined}
                  className={`border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-black bg-white text-black hover:bg-black/5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <Link
            href={href({
              view: activeView,
              collection: activeCollection,
              sort: activeSort === "recent" ? "oldest" : "recent",
              q: query,
            })}
            className="border border-black bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5"
          >
            {activeSort === "recent" ? "Recently saved" : "Oldest first"} ▾
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="border border-dashed border-black/40 bg-white p-10 text-center">
            <p className="text-sm font-bold text-black">Nothing saved here yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-black/60">
              Tap the bookmark on a concept and it will appear here.
            </p>
            <Link
              href="/app/inspiration"
              className="mt-4 inline-block border border-black bg-[#1f4fff] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_#000]"
            >
              Find inspiration
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <li key={item.id}>
                <article className="flex flex-col overflow-hidden border border-black bg-white">
                  <Link href={`/app/projects/${item.projectId}/rooms/${item.roomId}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                    <img
                      src={item.url}
                      alt={item.title}
                      className="h-36 w-full border-b border-black object-cover"
                      loading="lazy"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold leading-snug text-black">{item.title}</p>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[#1f4fff]" aria-hidden="true">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 3h12v18l-6-4-6 4z" />
                          </svg>
                        </span>
                        <span className="text-black/60" aria-hidden="true">⋮</span>
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="border border-black/30 px-1.5 py-0.5 text-[10px] text-black/70">
                        {item.roomLabel}
                      </span>
                      <span className="border border-black/30 px-1.5 py-0.5 text-[10px] text-black/70">
                        {item.styleLabel}
                      </span>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="h-fit border border-black bg-white lg:sticky lg:top-4">
        <div className="flex items-center justify-between border-b border-black px-3 py-2.5">
          <p className="text-sm font-bold text-black">Collections</p>
          <span className="text-black/60" aria-hidden="true">+</span>
        </div>
        <ul className="divide-y divide-black/10">
          {COLLECTIONS.map(([value, label]) => {
            const active = activeCollection === value;
            return (
              <li key={value}>
                <Link
                  href={href({ view: activeView, collection: value, sort: activeSort, q: query })}
                  aria-current={active ? "true" : undefined}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 text-xs transition-colors ${
                    active ? "bg-black/[0.04] font-semibold text-black" : "text-black/80 hover:bg-black/[0.03]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 text-black/50">{counts[value]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

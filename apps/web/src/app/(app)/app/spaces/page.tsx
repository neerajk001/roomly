import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

export const metadata = { title: "My spaces" };

const FILTERS = [
  ["", "All spaces"],
  ["LIVING_ROOM", "Living room"],
  ["BEDROOM", "Bedroom"],
  ["KITCHEN", "Kitchen"],
  ["HOME_OFFICE", "Home office"],
] as const;

function relative(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${String(days)} days ago`;
}

function href(params: { type?: string; sort?: string }): string {
  const search = new URLSearchParams();
  if (params.type !== undefined && params.type !== "") search.set("type", params.type);
  if (params.sort !== undefined && params.sort !== "recent") search.set("sort", params.sort);
  const query = search.toString();
  return query === "" ? "/app/spaces" : `/app/spaces?${query}`;
}

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sort?: string }>;
}) {
  const { type, sort } = await searchParams;
  const { workspace } = await requireWorkspace();
  const activeType = type ?? "";
  const activeSort = sort === "oldest" ? "oldest" : "recent";

  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { createdAt: activeSort === "oldest" ? "asc" : "desc" },
    take: 24,
    include: {
      rooms: {
        orderBy: { createdAt: "asc" },
        include: {
          assets: {
            where: { kind: "ORIGINAL_PHOTO", confirmedAt: { not: null } },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { storageKey: true },
          },
          renderJobs: {
            select: { _count: { select: { outputs: true } } },
          },
        },
      },
    },
  });

  const filtered =
    activeType === ""
      ? projects
      : projects.filter((project) => project.rooms.some((room) => room.type === activeType));

  const covers = new Map<string, string>();
  for (const project of filtered.slice(0, 9)) {
    const key = project.rooms.flatMap((room) => room.assets)[0]?.storageKey;
    if (key !== undefined) covers.set(project.id, await presignGet(key));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.02] tracking-tight text-black sm:text-5xl">
            Your spaces
          </h1>
          <p className="mt-2 text-sm text-black/70">Every room, every idea, in one place.</p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 border border-black bg-[#1f4fff] px-5 py-3 text-sm font-bold text-white shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          <span aria-hidden="true">+</span>
          <span>New room design</span>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => {
            const active = activeType === value;
            return (
              <Link
                key={label}
                href={href({ type: value, sort: activeSort })}
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
          href={href({ type: activeType, sort: activeSort === "recent" ? "oldest" : "recent" })}
          className="border border-black bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5"
        >
          {activeSort === "recent" ? "Latest first" : "Oldest first"} ▾
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-black/40 bg-white p-10 text-center">
          <p className="text-sm font-bold text-black">No spaces yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-black/60">
            Create your first design: upload a photo, pick a style and get concept visuals.
          </p>
          <Link
            href="/new"
            className="mt-4 inline-block border border-black bg-[#1f4fff] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_#000]"
          >
            Start a design
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 9).map((project, index) => {
            const concepts = project.rooms.reduce(
              (total, room) =>
                total + room.renderJobs.reduce((sum, job) => sum + job._count.outputs, 0),
              0,
            );
            return (
              <li key={project.id}>
                <Link
                  href={`/app/projects/${project.id}`}
                  className="group block overflow-hidden border border-black bg-white transition-shadow hover:shadow-[4px_4px_0_0_#000]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed or demo asset */}
                  <img
                    src={covers.get(project.id) ?? "/demo/bedroom-after.jpg"}
                    alt=""
                    className="h-44 w-full border-b border-black object-cover"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-black">{project.name}</p>
                      <p className="mt-0.5 text-[11px] text-black/60">
                        {concepts} {concepts === 1 ? "concept" : "concepts"} ·{" "}
                        {relative(project.updatedAt)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 text-black/70">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 3h12v18l-6-4-6 4z" />
                      </svg>
                      <span aria-hidden="true">⋮</span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

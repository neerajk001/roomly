import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import Link from "next/link";
import { z } from "zod";
import { roomTypeSchema } from "@/server/services/rooms";

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

function href(params: { type?: string; sort?: string; page?: number }): string {
  const search = new URLSearchParams();
  if (params.type !== undefined && params.type !== "") search.set("type", params.type);
  if (params.sort !== undefined && params.sort !== "recent") search.set("sort", params.sort);
  if (params.page !== undefined && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query === "" ? "/app/spaces" : `/app/spaces?${query}`;
}

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sort?: string; page?: string }>;
}) {
  const { type, sort, page: pageInput } = await searchParams;
  const { workspace } = await requireWorkspace();
  const parsedType = roomTypeSchema.safeParse(type);
  const activeType = parsedType.success ? parsedType.data : "";
  const page = z.coerce.number().int().min(1).max(100000).catch(1).parse(pageInput);
  const activeSort = sort === "oldest" ? "oldest" : "recent";

  const projects = await prisma.project.findMany({
    where: {
      workspaceId: workspace.id,
      deletedAt: null,
      ...(activeType !== "" ? { rooms: { some: { type: activeType } } } : {}),
    },
    orderBy: { createdAt: activeSort === "oldest" ? "asc" : "desc" },
    skip: (page - 1) * 9,
    take: 10,
    include: {
      rooms: {
        orderBy: { createdAt: "asc" },
        include: {
          assets: {
            where: {
              workspaceId: workspace.id,
              kind: { in: ["ORIGINAL_PHOTO", "BRIEF_UPLOAD"] },
              confirmedAt: { not: null },
            },
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

  const filtered = projects.slice(0, 9);

  const covers = new Map<string, string>();
  for (const project of filtered.slice(0, 9)) {
    const key = project.rooms.flatMap((room) => room.assets)[0]?.storageKey;
    if (key !== undefined) covers.set(project.id, await presignGet(key));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl">
            Your spaces
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every room, every idea, in one place.
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm   active:shadow-none"
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
                    ? "border-border bg-foreground text-white"
                    : "border-border bg-card text-foreground hover:bg-foreground/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <Link
          href={href({ type: activeType, sort: activeSort === "recent" ? "oldest" : "recent" })}
          className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/5"
        >
          {activeSort === "recent" ? "Latest first" : "Oldest first"} ▾
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-semibold text-foreground">No spaces yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Create your first design: upload a photo, pick a style and get concept visuals.
          </p>
          <Link
            href="/new"
            className="mt-4 inline-block rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm"
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
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed or demo asset */}
                  <img
                    src={covers.get(project.id) ?? "/demo/bedroom-after.jpg"}
                    alt=""
                    className="h-44 w-full border-b border-border object-cover"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {project.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {concepts} {concepts === 1 ? "concept" : "concepts"} ·{" "}
                        {relative(project.updatedAt)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
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
      <nav aria-label="Project pages" className="flex items-center justify-between gap-4 text-sm">
        {page > 1 ? (
          <Link
            className="underline"
            href={href({ type: activeType, sort: activeSort, page: page - 1 })}
          >
            Previous projects
          </Link>
        ) : (
          <span />
        )}
        <span className="text-muted-foreground">Page {page}</span>
        {projects.length > 9 ? (
          <Link
            className="underline"
            href={href({ type: activeType, sort: activeSort, page: page + 1 })}
          >
            More projects
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

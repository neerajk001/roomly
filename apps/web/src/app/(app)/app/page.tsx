import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

export const metadata = { title: "Home" };

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

function roomMeta(count: number): string {
  if (count === 0) return "No rooms yet";
  return `${String(count)} ${count === 1 ? "room" : "rooms"}`;
}

export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const { workspace } = await requireWorkspace();

  const allProjects = await prisma.project.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
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
        },
      },
    },
  });

  const filtered =
    type !== undefined && type !== ""
      ? allProjects.filter((project) => project.rooms.some((room) => room.type === type))
      : allProjects;

  const covers = new Map<string, string>();
  for (const project of [...filtered.slice(0, 9), ...allProjects.slice(0, 3)]) {
    if (covers.has(project.id)) continue;
    const key = project.rooms.flatMap((room) => room.assets)[0]?.storageKey;
    if (key !== undefined) covers.set(project.id, await presignGet(key));
  }

  const savedRaw = await prisma.renderOutput.findMany({
    where: { isFavorite: true, job: { workspaceId: workspace.id } },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: {
      asset: { select: { storageKey: true } },
      thumbAsset: { select: { storageKey: true } },
      job: { select: { room: { select: { id: true, projectId: true } } } },
    },
  });
  const saved = await Promise.all(
    savedRaw.map(async (output) => ({
      id: output.id,
      projectId: output.job.room.projectId,
      roomId: output.job.room.id,
      url: await presignGet(output.thumbAsset?.storageKey ?? output.asset.storageKey),
    })),
  );

  return (
    <div className="space-y-10">
      <WorkflowGuide />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="relative">
          <h1 className="font-sans text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Make yourself at home.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Your room ideas, all in one place.</p>
          <svg
            aria-hidden="true"
            className="absolute -top-6 right-0 hidden h-10 w-12 text-foreground sm:block"
            viewBox="0 0 48 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="6" x2="20" y2="32" />
            <line x1="28" y1="6" x2="36" y2="32" />
          </svg>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row">
          <Link
            href="/new"
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-accent px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all   hover:shadow-sm"
          >
            <span>New room design</span>
            <span aria-hidden="true">+</span>
          </Link>
          <Link
            href="/app/inspiration"
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-white"
          >
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
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>View inspiration</span>
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
        <img
          src="/demo/living-after.jpg"
          alt=""
          className="h-28 w-full rounded-xl border border-border object-cover sm:w-56"
        />
        <div className="flex-1">
          <p className="text-base font-semibold text-foreground">Start with a photo of your room</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Get concepts tailored to your space, style, and budget.
          </p>
          <Link
            href="/new"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all   hover:shadow-sm"
          >
            <span>Create your first design</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <span className="hidden text-lg text-muted-foreground sm:block" aria-hidden="true">
          ✕
        </span>
      </section>

      <section id="spaces" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-2xl font-semibold tracking-tight text-foreground">
            Your spaces
          </h2>
          <span className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground">
            Latest first ▾
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => {
            const active = (type ?? "") === value;
            return (
              <Link
                key={label}
                href={value === "" ? "/app" : `/app?type=${value}`}
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

        {filtered.length === 0 ? (
          <div className="border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm font-semibold text-foreground">No spaces yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Create your first design: upload a photo, pick a style and get concept visuals.
            </p>
            <Link
              href="/new"
              className="mt-3 inline-block rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Start a design
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 9).map((project, index) => (
              <li key={project.id}>
                <Link
                  href={`/app/projects/${project.id}`}
                  className="block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed or demo asset */}
                  <img
                    src={covers.get(project.id) ?? "/demo/bedroom-after.jpg"}
                    alt=""
                    className="h-40 w-full border-b border-border object-cover"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="flex items-start justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {roomMeta(project.rooms.length)} · {relative(project.updatedAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                      ⋮
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-lg font-semibold text-foreground">Recent activity</h2>
            <Link href="/app/spaces" className="text-xs font-medium text-foreground underline">
              View all →
            </Link>
          </div>
          {allProjects.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Nothing yet — your projects will show here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {allProjects.slice(0, 3).map((project) => (
                <li key={project.id} className="flex items-center gap-3 py-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed or demo asset */}
                  <img
                    src={covers.get(project.id) ?? "/demo/bedroom-after.jpg"}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {roomMeta(project.rooms.length)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {relative(project.updatedAt).replace("Updated ", "")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="saved" className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-lg font-semibold text-foreground">Saved concepts</h2>
            <Link href="/app/saved" className="text-xs font-medium text-foreground underline">
              View all →
            </Link>
          </div>
          {saved.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Favorite a concept and it will appear here.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {saved.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/app/projects/${item.projectId}/rooms/${item.roomId}`}
                    className="relative block overflow-hidden rounded-xl border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                    <img
                      src={item.url}
                      alt="Saved concept"
                      className="h-24 w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center bg-card/90 text-foreground">
                      <svg
                        className="h-3.5 w-3.5"
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
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
import { WorkflowGuide } from "@/components/app/workflow-guide";

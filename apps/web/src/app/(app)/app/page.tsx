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
  for (const project of filtered.slice(0, 9)) {
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Make yourself at home.</h1>
          <p className="mt-1 text-sm text-[#5b665f]">Your room ideas, all in one place.</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row">
          <Link
            href="/app/new"
            className="rounded-lg bg-[#2f5233] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[#27452b]"
          >
            New room design +
          </Link>
          <Link
            href="/#examples"
            className="rounded-lg border border-[#d8d2c4] bg-white px-4 py-2 text-center text-sm hover:bg-[#faf8f2]"
          >
            View inspiration
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-[#e4dfd3] bg-white p-3 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
        <img src="/demo/living-after.jpg" alt="" className="h-28 w-full rounded-lg object-cover sm:w-56" />
        <div className="flex-1">
          <p className="text-sm font-medium">Start with a photo of your room</p>
          <p className="mt-1 text-xs text-[#6b776f]">
            Get concepts tailored to your space, style and budget.
          </p>
        </div>
        <Link
          href="/app/new"
          className="rounded-lg bg-[#2f5233] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[#27452b]"
        >
          Create your first design →
        </Link>
      </section>

      <section id="spaces" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Your spaces</h2>
          <span className="rounded-lg border border-[#d8d2c4] bg-white px-3 py-1.5 text-xs text-[#405048]">
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
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  active
                    ? "border-[#2f5233] bg-[#2f5233] text-white"
                    : "border-[#d8d2c4] bg-white text-[#405048]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cfc8b8] bg-white/60 p-8 text-center">
            <p className="text-sm font-medium">No spaces yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-[#6b776f]">
              Create your first design: upload a photo, pick a style and get concept visuals.
            </p>
            <Link
              href="/app/new"
              className="mt-3 inline-block rounded-lg bg-[#2f5233] px-4 py-2 text-sm text-white"
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
                  className="block overflow-hidden rounded-xl border border-[#e4dfd3] bg-white transition hover:shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed or demo asset */}
                  <img
                    src={covers.get(project.id) ?? "/demo/bedroom-after.jpg"}
                    alt=""
                    className="h-40 w-full object-cover"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="space-y-0.5 px-3 py-2">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-[#7a857d]">
                      {project.rooms.length === 0
                        ? "No rooms yet"
                        : `${String(project.rooms.length)} ${project.rooms.length === 1 ? "room" : "rooms"}`}{" "}
                      · {relative(project.updatedAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-[#e4dfd3] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent activity</h2>
            <Link href="#spaces" className="text-xs text-[#2f5233] underline">
              View all →
            </Link>
          </div>
          {allProjects.length === 0 ? (
            <p className="mt-3 text-xs text-[#7a857d]">Nothing yet — your projects will show here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#eee8db]">
              {allProjects.slice(0, 3).map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{project.name}</p>
                    <p className="text-xs text-[#7a857d]">Updated the project</p>
                  </div>
                  <span className="shrink-0 text-xs text-[#7a857d]">{relative(project.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="saved" className="rounded-xl border border-[#e4dfd3] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Saved concepts</h2>
            <Link href="#saved" className="text-xs text-[#2f5233] underline">
              View all →
            </Link>
          </div>
          {saved.length === 0 ? (
            <p className="mt-3 text-xs text-[#7a857d]">
              Favorite a concept and it will appear here.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {saved.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/app/projects/${item.projectId}/rooms/${item.roomId}`}
                    className="block overflow-hidden rounded-lg border border-[#e4dfd3]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                    <img src={item.url} alt="Saved concept" className="h-20 w-full object-cover" loading="lazy" />
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

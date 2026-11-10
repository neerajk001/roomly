import Link from "next/link";
import { z } from "zod";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { ROOM_CHECKLISTS, STYLES, getStyle, outputStyleKey } from "@roomdesigner/shared";
import { requireWorkspace } from "@/server/auth/session";

const querySchema = z.object({
  q: z.string().max(120).catch(""),
  room: z.string().max(40).catch(""),
  style: z.string().max(64).catch(""),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
});
export async function SavedDesigns({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = querySchema.parse(await searchParams);
  const { workspace } = await requireWorkspace();
  const saved = await prisma.renderOutput.findMany({
    where: {
      isFavorite: true,
      job: {
        workspaceId: workspace.id,
        status: "SUCCEEDED",
        room: { project: { deletedAt: null } },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      thumbAsset: { select: { storageKey: true } },
      asset: { select: { storageKey: true } },
      job: {
        select: {
          params: true,
          styleKey: true,
          room: { select: { id: true, name: true, type: true, projectId: true } },
        },
      },
    },
  });
  const filtered = saved
    .map((output) => ({
      ...output,
      style: outputStyleKey(output.job.params, output.job.styleKey, output.index),
    }))
    .filter((output) => {
      const room = output.job.room;
      const text = [room.name, getStyle(output.style ?? "")?.label ?? ""].join(" ").toLowerCase();
      return (
        (!query.room || room.type === query.room) &&
        (!query.style || output.style === query.style) &&
        text.includes(query.q.toLowerCase())
      );
    });
  const visible = await Promise.all(
    filtered.slice((query.page - 1) * 24, query.page * 24).map(async (output) => ({
      ...output,
      url: await presignGet(output.thumbAsset?.storageKey ?? output.asset.storageKey),
    })),
  );
  const pageHref = (page: number) =>
    "/app/saved?" +
    new URLSearchParams({
      q: query.q,
      room: query.room,
      style: query.style,
      page: String(page),
    }).toString();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Saved designs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your favourite concepts, ready to revisit.
        </p>
      </header>
      <details
        className="rounded-xl border border-border bg-card p-4"
        open={!!(query.q || query.room || query.style)}
      >
        <summary className="cursor-pointer text-sm font-medium">Search & filter</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-4" action="/app/saved">
          <label className="text-sm">
            Search
            <input
              name="q"
              defaultValue={query.q}
              maxLength={120}
              className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            Room
            <select
              name="room"
              defaultValue={query.room}
              className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-2"
            >
              <option value="">All rooms</option>
              {ROOM_CHECKLISTS.map((room) => (
                <option key={room.key} value={room.key}>
                  {room.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Style
            <select
              name="style"
              defaultValue={query.style}
              className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-2"
            >
              <option value="">All styles</option>
              {STYLES.map((style) => (
                <option key={style.key} value={style.key}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button className="rounded-lg bg-foreground px-4 py-2 text-sm text-background">
              Apply filters
            </button>
            <Link className="py-2 text-sm underline" href="/app/saved">
              Clear
            </Link>
          </div>
        </form>
      </details>
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p>No saved designs here yet.</p>
          <Link className="mt-3 inline-block text-sm underline" href="/app">
            Open my rooms
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((output) => (
            <li key={output.id}>
              <Link
                href={"/app/projects/" + output.job.room.projectId + "/rooms/" + output.job.room.id}
                className="block overflow-hidden rounded-xl border border-border bg-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed image URL */}
                <img
                  src={output.url}
                  alt={
                    (getStyle(output.style ?? "")?.label ?? "Saved") + " " + output.job.room.name
                  }
                  className="h-48 w-full object-cover"
                />
                <div className="p-3">
                  <p className="text-sm font-semibold">
                    {getStyle(output.style ?? "")?.label ?? "Saved concept"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{output.job.room.name}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(query.page > 1 || filtered.length > query.page * 24) && (
        <nav aria-label="Saved design pages" className="flex justify-between text-sm">
          {query.page > 1 ? (
            <Link className="underline" href={pageHref(query.page - 1)}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          {filtered.length > query.page * 24 && (
            <Link className="underline" href={pageHref(query.page + 1)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

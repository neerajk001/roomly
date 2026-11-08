import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import Link from "next/link";

export const metadata = { title: "Studio" };

const PIPELINE = [
  ["DRAFT", "Drafts"],
  ["SENT", "Sent"],
  ["VIEWED", "Viewed"],
  ["APPROVED", "Approved"],
  ["CHANGES_REQUESTED", "Changes"],
] as const;

function relative(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${String(days)} days ago`;
}

export default async function StudioHomePage() {
  const { workspace } = await requireWorkspace();

  const [projects, counts, proposals, clients] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 9,
      include: {
        client: { select: { name: true } },
        rooms: {
          take: 1,
          include: {
            assets: {
              where: {
                workspaceId: workspace.id,
                kind: { in: ["ORIGINAL_PHOTO", "BRIEF_UPLOAD"] },
                confirmedAt: { not: null },
              },
              take: 1,
              select: { storageKey: true },
            },
          },
        },
      },
    }),
    prisma.proposal.groupBy({
      by: ["status"],
      where: { project: { workspaceId: workspace.id } },
      _count: { _all: true },
    }),
    prisma.proposal.findMany({
      where: { project: { workspaceId: workspace.id } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        project: { select: { id: true, name: true, client: { select: { name: true } } } },
      },
    }),
    prisma.client.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
  ]);

  const count = (status: string): number =>
    counts.find((row) => row.status === status)?._count._all ?? 0;

  const covers = new Map<string, string>();
  for (const project of projects) {
    const key = project.rooms.flatMap((room) => room.assets)[0]?.storageKey;
    if (key !== undefined) covers.set(project.id, await presignGet(key));
  }

  return (
    <div className="space-y-10">
      <WorkflowGuide studio />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your studio, in one place.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients} {clients === 1 ? "client" : "clients"} · {projects.length} recent{" "}
            {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row">
          <Link
            href="/studio/projects/new"
            className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary"
          >
            New project +
          </Link>
          <Link
            href="/studio/clients"
            className="rounded-lg border border-border bg-card px-4 py-2 text-center text-sm hover:bg-muted"
          >
            Clients
          </Link>
        </div>
      </div>

      <section aria-label="Proposal pipeline" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {PIPELINE.map(([status, label]) => (
          <div
            key={status}
            className="rounded-xl rounded-xl border border-border bg-card px-3 py-2"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{count(status)}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
          <Link href="/studio" className="text-xs text-primary underline">
            Latest first ▾
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
            <p className="text-sm font-medium">No projects yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Create a project, upload room photos and generate concept options for your client.
            </p>
            <Link
              href="/studio/projects/new"
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-white"
            >
              Create a project
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <li key={project.id}>
                <Link
                  href={`/studio/projects/${project.id}`}
                  className="block overflow-hidden rounded-xl rounded-xl border border-border bg-card transition hover:shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed or demo asset */}
                  <img
                    src={covers.get(project.id) ?? "/demo/kitchen-after.jpg"}
                    alt=""
                    className="h-40 w-full object-cover"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="space-y-0.5 px-3 py-2">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.client?.name ?? "No client"} · updated {relative(project.updatedAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent proposals</h2>
        </div>
        {proposals.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No proposals yet. Build an estimate, then send a branded proposal.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {proposals.map((proposal) => (
              <li
                key={proposal.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{proposal.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {proposal.project.name}
                    {proposal.project.client?.name !== undefined
                      ? ` · ${proposal.project.client.name}`
                      : ""}
                  </p>
                </div>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-primary">
                  {proposal.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
import { WorkflowGuide } from "@/components/app/workflow-guide";

import { NewProjectButton, ProjectGrid } from "@/components/projects/project-grid";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";

export const metadata = { title: "Studio projects" };

export default async function StudioHomePage() {
  const { user, workspace } = await requireWorkspace();
  const projects = await listProjects(prisma, { userId: user.id, workspaceId: workspace.id });
  const pipeline = await prisma.proposal.groupBy({
    by: ["status"],
    where: { project: { workspaceId: workspace.id } },
    _count: { _all: true },
  });
  const pipelineCount = (status: string): number =>
    pipeline.find((row) => row.status === status)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Client projects and their renders.</p>
        </div>
        <NewProjectButton basePath="/studio" />
      </div>
      <section aria-label="Proposal pipeline" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["DRAFT", "Draft"],
            ["SENT", "Sent"],
            ["VIEWED", "Viewed"],
            ["APPROVED", "Approved"],
            ["CHANGES_REQUESTED", "Changes"],
          ] as const
        ).map(([status, label]) => (
          <div key={status} className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold text-foreground">{pipelineCount(status)}</p>
          </div>
        ))}
      </section>
      <ProjectGrid
        projects={projects}
        basePath="/studio"
        emptyTitle="No projects yet"
        emptyBody="Create a project for a client, add the room details and photos, then generate concept visuals."
      />
    </div>
  );
}

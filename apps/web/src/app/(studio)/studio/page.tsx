import { NewProjectButton, ProjectGrid } from "@/components/projects/project-grid";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";

export const metadata = { title: "Studio projects" };

export default async function StudioHomePage() {
  const { user, workspace } = await requireWorkspace();
  const projects = await listProjects(prisma, { userId: user.id, workspaceId: workspace.id });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Client projects and their renders.</p>
        </div>
        <NewProjectButton basePath="/studio" />
      </div>
      <ProjectGrid
        projects={projects}
        basePath="/studio"
        emptyTitle="No projects yet"
        emptyBody="Create a project for a client, add the room details and photos, then generate concept visuals."
      />
    </div>
  );
}

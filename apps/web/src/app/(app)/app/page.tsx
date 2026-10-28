import { NewProjectButton, ProjectGrid } from "@/components/projects/project-grid";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";

export const metadata = { title: "My rooms" };

export default async function AppHomePage() {
  const { user, workspace } = await requireWorkspace();
  const projects = await listProjects(prisma, { userId: user.id, workspaceId: workspace.id });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Concept visuals and rough budgets for your home.
          </p>
        </div>
        <NewProjectButton basePath="/app" />
      </div>
      <ProjectGrid
        projects={projects}
        basePath="/app"
        emptyTitle="No projects yet"
        emptyBody="Create a project, add a room with its measurements and a photo, then generate concept visuals."
      />
    </div>
  );
}

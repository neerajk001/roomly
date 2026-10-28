import { NewProjectForm } from "@/components/projects/new-project-form";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { listClients } from "@/server/services/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "New project" };

export default async function NewStudioProjectPage() {
  const { user, workspace } = await requireWorkspace();
  const clients = await listClients(prisma, { userId: user.id, workspaceId: workspace.id });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">New project</h1>
      <Card>
        <CardHeader>
          <CardTitle>Name the project</CardTitle>
          <CardDescription>You can add rooms and photos next.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewProjectForm basePath="/studio" clients={clients.map((client) => ({ id: client.id, name: client.name }))} />
        </CardContent>
      </Card>
    </div>
  );
}

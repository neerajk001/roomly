import { deleteClientAction } from "@/server/actions/clients";
import { ClientForm } from "@/components/studio/client-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { getClient } from "@/server/services/clients";
import Link from "next/link";

export const metadata = { title: "Client" };

export default async function StudioClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, workspace } = await requireWorkspace();
  const detail = await getClient(prisma, { userId: user.id, workspaceId: workspace.id }, id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/studio/clients" className="text-xs text-muted-foreground underline">
            Back to clients
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {detail.client.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.client.email ?? "No email"} · {detail.client.phone ?? "No phone"}
          </p>
        </div>
        <form action={deleteClientAction}>
          <input type="hidden" name="clientId" value={detail.client.id} />
          <Button type="submit" variant="outline" size="sm">
            Delete client
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            {detail.projects.length === 0
              ? "No projects yet. Create one from the studio and attach this client."
              : `${String(detail.projects.length)} ${detail.projects.length === 1 ? "project" : "projects"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.projects.length > 0 && (
            <ul className="divide-y divide-border">
              {detail.projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/studio/projects/${project.id}`}
                    className="flex items-center justify-between gap-4 py-2 text-sm hover:bg-muted/40"
                  >
                    <span className="text-foreground">{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.updatedAt.toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
          <CardDescription>
            {detail.briefLinkCount} brief {detail.briefLinkCount === 1 ? "link" : "links"} created
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            client={{
              id: detail.client.id,
              name: detail.client.name,
              email: detail.client.email,
              phone: detail.client.phone,
              notes: detail.client.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

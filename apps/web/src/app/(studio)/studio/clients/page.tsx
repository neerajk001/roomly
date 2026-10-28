import { ClientForm } from "@/components/studio/client-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { listClients } from "@/server/services/clients";
import Link from "next/link";

export const metadata = { title: "Clients" };

export default async function StudioClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { user, workspace } = await requireWorkspace();
  const clients = await listClients(prisma, { userId: user.id, workspaceId: workspace.id }, { search: q });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact records for your studio projects.
        </p>
      </div>

      <form className="flex max-w-md gap-2" action="/studio/clients">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or email"
          aria-label="Search clients"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        />
        <button type="submit" className="rounded-md border border-border px-3 text-sm">
          Search
        </button>
      </form>

      {clients.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>{q !== undefined && q !== "" ? "No matches" : "No clients yet"}</CardTitle>
            <CardDescription>
              Add your first client below, then attach them to a project.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/studio/clients/${client.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40"
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">{client.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {client.email ?? "No email"} · {client.phone ?? "No phone"}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {client.projectCount} {client.projectCount === 1 ? "project" : "projects"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add a client</CardTitle>
          <CardDescription>Only the name is required.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}

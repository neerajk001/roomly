import Link from "next/link";
import { HomeQuickDesign } from "@/components/wizard/HomeQuickDesign";
import { GuidedWizard } from "@/components/wizard/guided-wizard";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { prisma } from "@roomdesigner/db";
import { getStyle } from "@roomdesigner/shared";
import { requireWorkspace } from "@/server/auth/session";
import { listClients } from "@/server/services/clients";
export const metadata = { title: "New project" };
export default async function NewStudioProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string; details?: string }>;
}) {
  const { user, workspace } = await requireWorkspace();
  const { style, details } = await searchParams;
  if (details === "1")
    return (
      <div>
        <Link href="/studio/projects/new" className="text-sm underline">
          ← Quick project setup
        </Link>
        <GuidedWizard
          currency={workspace.currency}
          initialStyle={style && getStyle(style) ? style : undefined}
          basePath="/studio"
        />
      </div>
    );
  const clients = (await listClients(prisma, { userId: user.id, workspaceId: workspace.id })).map(
    (client) => ({ id: client.id, name: client.name }),
  );
  return (
    <div>
      <HomeQuickDesign
        clients={clients}
        initialStyle={style && getStyle(style) ? style : undefined}
      />
      <details className="mx-auto mt-6 max-w-4xl rounded-xl border border-border bg-card p-5">
        <summary className="cursor-pointer text-sm font-medium">
          Detailed or multi-room setup
        </summary>
        <div className="mt-4 space-y-5">
          <Link href="/studio/projects/new?details=1" className="inline-block text-sm underline">
            Use the detailed brief wizard →
          </Link>
          <p className="text-sm text-muted-foreground">
            Or create a project first and add photos later.
          </p>
          <NewProjectForm basePath="/studio" clients={clients} autoFocus={false} />
        </div>
      </details>
    </div>
  );
}

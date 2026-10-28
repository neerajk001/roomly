import { ProposalBuilder } from "@/components/proposals/proposal-builder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "New proposal" };

export default async function NewProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: workspace.id, deletedAt: null },
    select: { id: true },
  });
  if (project === null) notFound();

  const estimates = await prisma.estimate.findMany({
    where: { projectId: project.id, project: { workspaceId: workspace.id } },
    orderBy: [{ roomId: "asc" }, { version: "desc" }],
    take: 20,
    include: {
      room: { select: { name: true } },
    },
  });
  const outputs = await prisma.renderOutput.findMany({
    where: { isFavorite: true, job: { workspaceId: workspace.id, room: { projectId: project.id } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      asset: { select: { storageKey: true } },
      thumbAsset: { select: { storageKey: true } },
      job: { select: { room: { select: { name: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/studio/projects/${project.id}`}
          className="text-xs text-muted-foreground underline"
        >
          Back to the project
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">New proposal</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Proposal details</CardTitle>
          <CardDescription>
            {estimates.length === 0
              ? "Build an estimate for a room first."
              : "Pin up to four favorite renders and pick an estimate version."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProposalBuilder
            projectId={project.id}
            estimates={estimates.map((estimate) => ({
              id: estimate.id,
              label: `${estimate.room?.name ?? "Room"} · v${estimate.version} · ${estimate.currency} ${(estimate.totalMinor / 100).toFixed(0)}`,
            }))}
            outputs={await Promise.all(
              outputs.map(async (output) => ({
                id: output.id,
                index: output.index,
                roomName: output.job.room.name,
                thumbUrl: await presignGet(output.thumbAsset?.storageKey ?? output.asset.storageKey),
              })),
            )}
            defaultTerms={workspace.defaultTerms ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}

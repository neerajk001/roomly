import { ProposalBuilder } from "@/components/proposals/proposal-builder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { formatMoney } from "@roomdesigner/shared";

export const metadata = { title: "New proposal" };

export default async function NewProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; revise?: string; pin?: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: workspace.id, deletedAt: null },
    select: { id: true },
  });
  if (project === null) notFound();
  const query = z
    .object({
      edit: z.string().min(1).max(128).optional(),
      revise: z.string().min(1).max(128).optional(),
      pin: z.string().min(1).max(128).optional(),
    })
    .parse(await searchParams);
  const sourceId = query.edit ?? query.revise;
  const source =
    sourceId === undefined
      ? null
      : await prisma.proposal.findFirst({
          where: {
            id: sourceId,
            projectId: project.id,
            project: { workspaceId: workspace.id },
            status: query.edit !== undefined ? "DRAFT" : { not: "DRAFT" },
          },
        });
  if (sourceId !== undefined && source === null) notFound();

  const estimates = await prisma.estimate.findMany({
    where: { projectId: project.id, project: { workspaceId: workspace.id } },
    orderBy: [{ roomId: "asc" }, { version: "desc" }],
    include: {
      room: { select: { name: true } },
    },
  });
  const outputs = await prisma.renderOutput.findMany({
    where: { job: { workspaceId: workspace.id, room: { projectId: project.id } } },
    orderBy: { createdAt: "desc" },
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
            key={source?.id ?? query.pin ?? "new"}
            initial={
              source !== null
                ? {
                    ...(query.edit !== undefined
                      ? { id: source.id, updatedAt: source.updatedAt.toISOString() }
                      : { revisesId: source.id }),
                    title: source.title,
                    intro: source.intro ?? "",
                    terms: source.terms ?? "",
                    estimateId: source.estimateId,
                    expiresInDays:
                      source.expiresAt === null
                        ? 0
                        : Math.max(
                            1,
                            Math.min(
                              365,
                              Math.ceil((source.expiresAt.getTime() - source.createdAt.getTime()) / 86400000),
                            ),
                          ),
                    supersedePrevious: source.supersedePrevious,
                    ...(query.edit !== undefined && source.revisesId !== null
                      ? { revisesId: source.revisesId }
                      : {}),
                    options: source.renderOutputIds.map((outputId) => ({
                      outputId,
                      caption: z.record(z.string(), z.string()).safeParse(source.optionCaptions)
                        .success
                        ? ((source.optionCaptions as Record<string, string>)[outputId] ?? "")
                        : "",
                    })),
                  }
                : query.pin !== undefined && outputs.some((output) => output.id === query.pin)
                  ? {
                      title: "Design proposal",
                      intro: "",
                      terms: workspace.defaultTerms ?? "",
                      estimateId: estimates[0]?.id ?? "",
                      expiresInDays: 14,
                      supersedePrevious: false,
                      options: [{ outputId: query.pin }],
                    }
                  : undefined
            }
            projectId={project.id}
            estimates={estimates.map((estimate) => ({
              id: estimate.id,
              label: `${estimate.room?.name ?? "Room"} · v${estimate.version} · ${formatMoney(estimate.totalMinor, estimate.currency)}`,
            }))}
            outputs={await Promise.all(
              outputs.map(async (output) => ({
                id: output.id,
                index: output.index,
                roomName: output.job.room.name,
                thumbUrl: await presignGet(
                  output.thumbAsset?.storageKey ?? output.asset.storageKey,
                ),
              })),
            )}
            defaultTerms={workspace.defaultTerms ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}

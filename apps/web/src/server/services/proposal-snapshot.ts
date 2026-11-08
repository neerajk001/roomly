import type { Prisma, TransactionClient } from "@roomdesigner/db";
import { z } from "zod";
import { AppError } from "../app-error";

export const proposalSnapshotSchema = z.object({
  title: z.string(),
  intro: z.string().nullable(),
  terms: z.string().nullable(),
  brandName: z.string(),
  brandColor: z.string().nullable(),
  logoStorageKey: z.string().nullable(),
  projectName: z.string(),
  clientName: z.string().nullable(),
  clientEmail: z.string().nullable(),
  currency: z.string(),
  estimate: z.object({
    id: z.string(),
    version: z.number().int(),
    subtotalMinor: z.number().int(),
    markupMinor: z.number().int(),
    taxMinor: z.number().int(),
    totalMinor: z.number().int(),
    lines: z.array(
      z.object({
        label: z.string(),
        quantity: z.number(),
        unitPriceMinor: z.number().int(),
        totalMinor: z.number().int(),
      }),
    ),
  }),
  options: z.array(
    z.object({
      id: z.string(),
      caption: z.string().nullable(),
      storageKey: z.string(),
      thumbKey: z.string(),
      beforeKey: z.string().nullable(),
    }),
  ),
});
export type ProposalSnapshot = z.infer<typeof proposalSnapshotSchema>;

export async function loadProposalDocument(
  db: Prisma | TransactionClient,
  workspaceId: string,
  proposalId: string,
) {
  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId, deletedAt: null } },
    include: {
      estimate: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
      project: { include: { client: true, workspace: true } },
    },
  });
  if (proposal === null) throw new AppError("NOT_FOUND", "Proposal not found.", 404);
  if (proposal.snapshot !== null) {
    const parsed = proposalSnapshotSchema.safeParse(proposal.snapshot);
    if (!parsed.success)
      throw new AppError("INVALID_STATE", "This proposal snapshot could not be read.", 409);
    return { proposal, document: parsed.data };
  }
  const outputs = await db.renderOutput.findMany({
    where: {
      id: { in: proposal.renderOutputIds },
      job: { workspaceId, room: { projectId: proposal.projectId, project: { deletedAt: null } } },
    },
    include: {
      asset: true,
      thumbAsset: true,
      job: {
        include: {
          room: {
            include: {
              assets: {
                where: {
                  workspaceId,
                  confirmedAt: { not: null },
                  kind: { in: ["ORIGINAL_PHOTO", "BRIEF_UPLOAD"] },
                },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (outputs.length !== proposal.renderOutputIds.length)
    throw new AppError(
      "INVALID_STATE",
      "A proposal concept is no longer available. Update the draft before sending.",
      409,
    );
  const captions = z.record(z.string(), z.string()).safeParse(proposal.optionCaptions);
  const workspace = proposal.project.workspace;
  const document = proposalSnapshotSchema.parse({
    title: proposal.title,
    intro: proposal.intro,
    terms: proposal.terms,
    brandName: workspace.brandName ?? workspace.name,
    brandColor: workspace.brandColor,
    logoStorageKey: workspace.logoStorageKey,
    projectName: proposal.project.name,
    clientName: proposal.project.client?.name ?? null,
    clientEmail: proposal.project.client?.email ?? null,
    currency: proposal.estimate.currency,
    estimate: {
      id: proposal.estimate.id,
      version: proposal.estimate.version,
      subtotalMinor: proposal.estimate.subtotalMinor,
      markupMinor: proposal.estimate.markupMinor,
      taxMinor: proposal.estimate.taxMinor,
      totalMinor: proposal.estimate.totalMinor,
      lines: proposal.estimate.lines.map((line) => ({
        label: line.label,
        quantity: line.quantity.toNumber(),
        unitPriceMinor: line.unitPriceMinor,
        totalMinor: line.totalMinor,
      })),
    },
    options: proposal.renderOutputIds.map((id) => {
      const output = outputs.find((item) => item.id === id);
      if (output === undefined) throw new AppError("NOT_FOUND", "Concept not found.", 404);
      return {
        id,
        caption: captions.success ? (captions.data[id] ?? null) : null,
        storageKey: output.asset.storageKey,
        thumbKey: output.thumbAsset?.storageKey ?? output.asset.storageKey,
        beforeKey: output.job.room.assets[0]?.storageKey ?? null,
      };
    }),
  });
  return { proposal, document };
}

export function recordProposalEmail(
  db: TransactionClient,
  input: {
    workspaceId: string;
    proposalId: string;
    kind: "SENT" | "VIEWED" | "APPROVED" | "CHANGES_REQUESTED" | "COMMENT";
    commentId?: string;
  },
) {
  const dedupeKey = `${input.proposalId}:${input.kind}:${input.commentId ?? "once"}`;
  return db.proposalEmail.upsert({
    where: { dedupeKey, workspaceId: input.workspaceId },
    create: { ...input, dedupeKey },
    update: {},
  });
}

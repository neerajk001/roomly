import { randomBytes } from "node:crypto";
import type { Prisma, TransactionClient } from "@roomdesigner/db";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

const optionSchema = z.object({
  outputId: z.string().min(1),
  caption: z.string().trim().max(120).optional(),
});

export const proposalInputSchema = z.object({
  projectId: z.string().min(1),
  estimateId: z.string().min(1),
  title: z.string().trim().min(1, "Add a title.").max(160),
  intro: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(4000).optional(),
  expiresInDays: z.number().int().min(0).max(365).optional(),
  options: z.array(optionSchema).min(1, "Pin at least one render.").max(4),
});

export type ProposalInput = z.infer<typeof proposalInputSchema>;

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createProposal(db: Prisma, ctx: ServiceContext, input: ProposalInput) {
  const parsed = proposalInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Check the proposal.",
      400,
    );
  }
  const data = parsed.data;

  const project = await db.project.findFirst({
    where: { id: data.projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (project === null) throw new AppError("NOT_FOUND", "Project not found.", 404);

  const estimate = await db.estimate.findFirst({
    where: {
      id: data.estimateId,
      projectId: project.id,
      project: { workspaceId: ctx.workspaceId },
    },
    select: { id: true },
  });
  if (estimate === null) throw new AppError("NOT_FOUND", "Estimate not found.", 404);

  const outputs = await db.renderOutput.findMany({
    where: {
      id: { in: data.options.map((option) => option.outputId) },
      job: { workspaceId: ctx.workspaceId, room: { projectId: project.id } },
    },
    select: { id: true },
  });
  if (outputs.length !== data.options.length) {
    throw new AppError("NOT_FOUND", "One of the pinned renders was not found.", 404);
  }

  const latest = await db.proposal.findFirst({
    where: { projectId: project.id, project: { workspaceId: ctx.workspaceId } },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const captions: Record<string, string> = {};
  for (const option of data.options) {
    if (option.caption !== undefined && option.caption !== "") {
      captions[option.outputId] = option.caption;
    }
  }

  return db.proposal.create({
    data: {
      projectId: project.id,
      estimateId: estimate.id,
      version: (latest?.version ?? 0) + 1,
      status: "DRAFT",
      title: data.title,
      intro: data.intro ?? null,
      terms: data.terms ?? null,
      renderOutputIds: data.options.map((option) => option.outputId),
      optionCaptions: captions,
      publicToken: newToken(),
      expiresAt:
        data.expiresInDays !== undefined && data.expiresInDays > 0
          ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
    },
  });
}

export async function sendProposal(
  db: Prisma,
  ctx: ServiceContext,
  proposalId: string,
): Promise<{ token: string }> {
  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
    select: { id: true, status: true, publicToken: true },
  });
  if (proposal === null) throw new AppError("NOT_FOUND", "Proposal not found.", 404);
  if (proposal.status !== "DRAFT") {
    throw new AppError("INVALID_STATE", "Only draft proposals can be sent.", 409);
  }
  const sent = await db.proposal.updateMany({
    where: {
      id: proposal.id,
      status: "DRAFT",
      project: { workspaceId: ctx.workspaceId, deletedAt: null },
    },
    data: { status: "SENT", sentAt: new Date() },
  });
  if (sent.count !== 1)
    throw new AppError("INVALID_STATE", "This proposal has already been sent.", 409);
  return { token: proposal.publicToken };
}

export async function listProposals(db: Prisma, ctx: ServiceContext, projectId: string) {
  return db.proposal.findMany({
    where: { projectId, project: { workspaceId: ctx.workspaceId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      title: true,
      publicToken: true,
      sentAt: true,
      viewedAt: true,
      approvedAt: true,
      approvedByName: true,
      pdfStorageKey: true,
      expiresAt: true,
      createdAt: true,
      _count: { select: { comments: true } },
    },
  });
}

export interface PublicProposal {
  id: string;
  title: string;
  intro: string | null;
  terms: string | null;
  status: string;
  pdfUrl: string | null;
  expiresAt: Date | null;
  approvedByName: string | null;
  approvedOutputId: string | null;
  projectName: string;
  clientName: string | null;
  brandName: string;
  brandColor: string | null;
  logoUrl: string | null;
  currency: string;
  estimate: {
    version: number;
    subtotalMinor: number;
    markupMinor: number;
    taxMinor: number;
    totalMinor: number;
    lines: { label: string; quantity: number; unitPriceMinor: number; totalMinor: number }[];
  };
  options: { id: string; caption: string | null; url: string; thumbUrl: string }[];
  comments: { id: string; authorType: string; authorName: string; body: string; createdAt: Date }[];
}

function effectiveStatus(status: string, expiresAt: Date | null): string {
  if (expiresAt !== null && expiresAt < new Date() && (status === "SENT" || status === "VIEWED")) {
    return "EXPIRED";
  }
  return status;
}

/** Public lookup by token; records the first view. */
export async function getPublicProposal(
  db: Prisma,
  token: string,
  sign: (key: string) => Promise<string>,
): Promise<PublicProposal> {
  const proposal = await db.proposal.findFirst({
    where: { publicToken: token, status: { not: "DRAFT" }, project: { deletedAt: null } },
    include: {
      estimate: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
      project: {
        select: {
          name: true,
          client: { select: { name: true } },
          workspace: {
            select: {
              name: true,
              brandName: true,
              brandColor: true,
              logoStorageKey: true,
              currency: true,
            },
          },
        },
      },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (proposal === null) throw new AppError("NOT_FOUND", "This proposal is not available.", 404);

  let status = effectiveStatus(proposal.status, proposal.expiresAt);
  if (status === "EXPIRED" && proposal.status !== "EXPIRED") {
    const expired = await db.proposal.updateMany({
      where: {
        id: proposal.id,
        status: { in: ["SENT", "VIEWED"] },
        expiresAt: { lt: new Date() },
        project: { deletedAt: null },
      },
      data: { status: "EXPIRED" },
    });
    if (expired.count !== 1) return getPublicProposal(db, token, sign);
  }
  if (status === "SENT") {
    const viewed = await db.proposal.updateMany({
      where: {
        id: proposal.id,
        status: "SENT",
        project: { deletedAt: null },
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
    if (viewed.count !== 1) return getPublicProposal(db, token, sign);
    status = "VIEWED";
  }

  const outputs = await db.renderOutput.findMany({
    where: {
      id: { in: proposal.renderOutputIds },
      job: { room: { projectId: proposal.projectId, project: { deletedAt: null } } },
    },
    include: {
      asset: { select: { storageKey: true } },
      thumbAsset: { select: { storageKey: true } },
    },
  });
  const captions = (proposal.optionCaptions ?? {}) as Record<string, string>;

  return {
    id: proposal.id,
    title: proposal.title,
    intro: proposal.intro,
    terms: proposal.terms,
    status,
    pdfUrl: proposal.pdfStorageKey !== null ? await sign(proposal.pdfStorageKey) : null,
    expiresAt: proposal.expiresAt,
    approvedByName: proposal.approvedByName,
    approvedOutputId: proposal.approvedOutputId,
    projectName: proposal.project.name,
    clientName: proposal.project.client?.name ?? null,
    brandName: proposal.project.workspace.brandName ?? proposal.project.workspace.name,
    brandColor: proposal.project.workspace.brandColor,
    logoUrl:
      proposal.project.workspace.logoStorageKey !== null
        ? await sign(proposal.project.workspace.logoStorageKey)
        : null,
    currency: proposal.estimate.currency,
    estimate: {
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
    options: await Promise.all(
      proposal.renderOutputIds.flatMap((outputId) => {
        const output = outputs.find((entry) => entry.id === outputId);
        if (output === undefined) return [];
        return [
          (async () => ({
            id: output.id,
            caption: captions[output.id] ?? null,
            url: await sign(output.asset.storageKey),
            thumbUrl: await sign(output.thumbAsset?.storageKey ?? output.asset.storageKey),
          }))(),
        ];
      }),
    ),
    comments: proposal.comments.map((comment) => ({
      id: comment.id,
      authorType: comment.authorType,
      authorName: comment.authorName,
      body: comment.body,
      createdAt: comment.createdAt,
    })),
  };
}

async function requireActionable(db: TransactionClient, token: string) {
  const proposal = await db.proposal.findFirst({
    where: { publicToken: token, project: { deletedAt: null } },
    select: { id: true, status: true, expiresAt: true, renderOutputIds: true },
  });
  if (proposal === null) throw new AppError("NOT_FOUND", "Proposal not found.", 404);
  const status = effectiveStatus(proposal.status, proposal.expiresAt);
  if (status === "EXPIRED") throw new AppError("EXPIRED", "This proposal has expired.", 410);
  if (status !== "SENT" && status !== "VIEWED") {
    throw new AppError("INVALID_STATE", "This proposal is not open for client actions.", 409);
  }
  return proposal;
}

function clientName(name: string): string {
  const parsed = z.string().trim().min(1, "Enter your name.").max(120).safeParse(name);
  if (!parsed.success)
    throw new AppError("INVALID_INPUT", "Enter your name (up to 120 characters).", 400);
  return parsed.data;
}

async function claimClientAction(
  db: TransactionClient,
  id: string,
  status?: "APPROVED" | "CHANGES_REQUESTED",
  approval?: { name: string; outputId: string },
) {
  const changed = await db.proposal.updateMany({
    where: {
      id,
      status: { in: ["SENT", "VIEWED"] },
      project: { deletedAt: null },
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    data: {
      ...(status !== undefined ? { status } : { updatedAt: new Date() }),
      ...(approval !== undefined
        ? {
            approvedAt: new Date(),
            approvedByName: approval.name,
            approvedOutputId: approval.outputId,
          }
        : {}),
    },
  });
  if (changed.count !== 1)
    throw new AppError(
      "INVALID_STATE",
      "This proposal changed or expired. Refresh before continuing.",
      409,
    );
}

export async function approveProposal(
  db: Prisma,
  token: string,
  outputId: string,
  name: string,
): Promise<void> {
  const validName = clientName(name);
  await db.$transaction(async (tx) => {
    const proposal = await requireActionable(tx, token);
    if (!proposal.renderOutputIds.includes(outputId)) {
      throw new AppError("NOT_FOUND", "Option not found.", 404);
    }
    await claimClientAction(tx, proposal.id, "APPROVED", { name: validName, outputId });
  });
}

export async function requestChanges(
  db: Prisma,
  token: string,
  name: string,
  message: string,
): Promise<void> {
  const validName = clientName(name);
  const body = message.trim().slice(0, 2000);
  if (body.length < 3) throw new AppError("INVALID_INPUT", "Add a message.", 400);
  await db.$transaction(async (tx) => {
    const proposal = await requireActionable(tx, token);
    await claimClientAction(tx, proposal.id, "CHANGES_REQUESTED");
    await tx.proposalComment.create({
      data: {
        proposalId: proposal.id,
        authorType: "CLIENT",
        authorName: validName,
        body,
      },
    });
  });
}

export async function addProposalComment(
  db: Prisma,
  token: string,
  name: string,
  message: string,
): Promise<void> {
  const validName = clientName(name);
  const body = message.trim().slice(0, 2000);
  if (body.length < 1) throw new AppError("INVALID_INPUT", "Add a message.", 400);
  await db.$transaction(async (tx) => {
    const proposal = await requireActionable(tx, token);
    await claimClientAction(tx, proposal.id);
    await tx.proposalComment.create({
      data: {
        proposalId: proposal.id,
        authorType: "CLIENT",
        authorName: validName,
        body,
      },
    });
  });
}

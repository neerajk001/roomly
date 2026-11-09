import { randomBytes } from "node:crypto";
import type { Prisma, TransactionClient } from "@roomdesigner/db";
import { PrismaRuntime } from "@roomdesigner/db";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";
import { loadProposalDocument, recordProposalEmail } from "./proposal-snapshot";

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
  revisesId: z.string().min(1).optional(),
  supersedePrevious: z.boolean().default(false),
});

export type ProposalInput = z.input<typeof proposalInputSchema>;

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

  if (data.revisesId !== undefined) {
    const source = await db.proposal.findFirst({
      where: {
        id: data.revisesId,
        projectId: project.id,
        project: { workspaceId: ctx.workspaceId },
        status: { not: "DRAFT" },
      },
      select: { id: true },
    });
    if (source === null) throw new AppError("NOT_FOUND", "Original proposal not found.", 404);
  }
  return db.$transaction(
    async (tx) => {
      const locked = await tx.project.updateMany({
        where: { id: project.id, workspaceId: ctx.workspaceId, deletedAt: null },
        data: { updatedAt: new Date() },
      });
      if (locked.count !== 1) throw new AppError("NOT_FOUND", "Project not found.", 404);
      const latest = await tx.proposal.findFirst({
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

      return tx.proposal.create({
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
          revisesId: data.revisesId,
          supersedePrevious: data.supersedePrevious,
          expiresAt:
            data.expiresInDays !== undefined && data.expiresInDays > 0
              ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
              : null,
        },
      });
    },
    { timeout: 15000 },
  );
}

export async function sendProposal(
  db: Prisma,
  ctx: ServiceContext,
  proposalId: string,
  expectedPdfStorageKey?: string,
): Promise<{ token: string }> {
  return db.$transaction(
    async (tx) => {
      const { proposal, document } = await loadProposalDocument(tx, ctx.workspaceId, proposalId);
      if (expectedPdfStorageKey !== undefined && proposal.pdfStorageKey !== expectedPdfStorageKey)
        throw new AppError(
          "INVALID_STATE",
          "The proposal changed after its PDF was prepared. Review it and send again.",
          409,
        );
      if (proposal.status !== "DRAFT") {
        throw new AppError("INVALID_STATE", "Only draft proposals can be sent.", 409);
      }
      const sent = await tx.proposal.updateMany({
        where: {
          id: proposal.id,
          status: "DRAFT",
          updatedAt: proposal.updatedAt,
          project: { workspaceId: ctx.workspaceId, deletedAt: null },
        },
        data: { status: "SENT", sentAt: new Date(), snapshot: document },
      });
      if (sent.count !== 1)
        throw new AppError("INVALID_STATE", "This proposal has already been sent.", 409);
      if (proposal.revisesId !== null && proposal.supersedePrevious) {
        await tx.proposal.updateMany({
          where: {
            id: proposal.revisesId,
            projectId: proposal.projectId,
            project: { workspaceId: ctx.workspaceId },
            status: { in: ["SENT", "VIEWED", "CHANGES_REQUESTED", "EXPIRED"] },
          },
          data: { supersededById: proposal.id },
        });
      }
      await recordProposalEmail(tx, {
        workspaceId: ctx.workspaceId,
        proposalId: proposal.id,
        kind: "SENT",
      });
      return { token: proposal.publicToken };
    },
    { timeout: 15000 },
  );
}

export async function updateProposalDraft(
  db: Prisma,
  ctx: ServiceContext,
  id: string,
  input: ProposalInput,
  expectedUpdatedAt: string,
): Promise<void> {
  const parsed = proposalInputSchema.safeParse(input);
  const stamp = z.iso.datetime().safeParse(expectedUpdatedAt);
  if (!parsed.success || !stamp.success)
    throw new AppError("INVALID_INPUT", "Check the proposal details.", 400);
  const data = parsed.data;
  const proposal = await db.proposal.findFirst({
    where: {
      id,
      projectId: data.projectId,
      project: { workspaceId: ctx.workspaceId, deletedAt: null },
    },
    select: { id: true, status: true },
  });
  if (proposal === null) throw new AppError("NOT_FOUND", "Proposal not found.", 404);
  if (proposal.status !== "DRAFT")
    throw new AppError(
      "INVALID_STATE",
      "Sent proposals are read-only. Create a revision instead.",
      409,
    );
  const estimate = await db.estimate.findFirst({
    where: {
      id: data.estimateId,
      projectId: data.projectId,
      project: { workspaceId: ctx.workspaceId },
    },
    select: { id: true },
  });
  const outputs = await db.renderOutput.count({
    where: {
      id: { in: data.options.map((option) => option.outputId) },
      job: { workspaceId: ctx.workspaceId, room: { projectId: data.projectId } },
    },
  });
  if (estimate === null || outputs !== data.options.length)
    throw new AppError("NOT_FOUND", "Choose an estimate and concepts from this project.", 404);
  const captions = Object.fromEntries(
    data.options
      .filter((option) => option.caption !== undefined)
      .map((option) => [option.outputId, option.caption ?? ""]),
  );
  const updated = await db.proposal.updateMany({
    where: {
      id,
      status: "DRAFT",
      updatedAt: new Date(expectedUpdatedAt),
      project: { workspaceId: ctx.workspaceId, deletedAt: null },
    },
    data: {
      title: data.title,
      intro: data.intro ?? null,
      terms: data.terms ?? null,
      estimateId: data.estimateId,
      renderOutputIds: data.options.map((option) => option.outputId),
      optionCaptions: captions,
      snapshot: PrismaRuntime.DbNull,
      pdfStorageKey: null,
      supersedePrevious: data.supersedePrevious,
      expiresAt:
        data.expiresInDays !== undefined && data.expiresInDays > 0
          ? new Date(Date.now() + data.expiresInDays * 86400000)
          : null,
    },
  });
  if (updated.count !== 1)
    throw new AppError(
      "INVALID_STATE",
      "This draft changed in another tab. Refresh before saving.",
      409,
    );
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
      supersededById: true,
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
    lowMinor?: number;
    highMinor?: number;
    lines: { label: string; quantity: number; unitPriceMinor: number; totalMinor: number }[];
  };
  options: {
    id: string;
    caption: string | null;
    url: string;
    thumbUrl: string;
    beforeUrl: string | null;
  }[];
  supersededToken: string | null;
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
          workspaceId: true,
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
    const viewed = await db.$transaction(async (tx) => {
      const changed = await tx.proposal.updateMany({
        where: {
          id: proposal.id,
          status: "SENT",
          project: { deletedAt: null },
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        data: { status: "VIEWED", viewedAt: new Date() },
      });
      if (changed.count === 1)
        await recordProposalEmail(tx, {
          workspaceId: proposal.project.workspaceId,
          proposalId: proposal.id,
          kind: "VIEWED",
        });
      return changed;
    });
    if (viewed.count !== 1) return getPublicProposal(db, token, sign);
    status = "VIEWED";
  }

  const { document } = await loadProposalDocument(db, proposal.project.workspaceId, proposal.id);
  const replacement =
    proposal.supersededById === null
      ? null
      : await db.proposal.findFirst({
          where: {
            id: proposal.supersededById,
            projectId: proposal.projectId,
            project: { workspaceId: proposal.project.workspaceId, deletedAt: null },
            status: { not: "DRAFT" },
          },
          select: { publicToken: true },
        });

  return {
    id: proposal.id,
    title: document.title,
    intro: document.intro,
    terms: document.terms,
    status,
    pdfUrl: proposal.pdfStorageKey !== null ? await sign(proposal.pdfStorageKey) : null,
    expiresAt: proposal.expiresAt,
    approvedByName: proposal.approvedByName,
    approvedOutputId: proposal.approvedOutputId,
    projectName: document.projectName,
    clientName: document.clientName,
    brandName: document.brandName,
    brandColor: document.brandColor,
    logoUrl: document.logoStorageKey !== null ? await sign(document.logoStorageKey) : null,
    currency: document.currency,
    estimate: {
      version: document.estimate.version,
      subtotalMinor: document.estimate.subtotalMinor,
      markupMinor: document.estimate.markupMinor,
      taxMinor: document.estimate.taxMinor,
      totalMinor: document.estimate.totalMinor,
      lowMinor: document.estimate.lowMinor,
      highMinor: document.estimate.highMinor,
      lines: document.estimate.lines.map((line) => ({
        label: line.label,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        totalMinor: line.totalMinor,
      })),
    },
    options: await Promise.all(
      document.options.map(async (option) => ({
        id: option.id,
        caption: option.caption,
        url: await sign(option.storageKey),
        thumbUrl: await sign(option.thumbKey),
        beforeUrl: option.beforeKey === null ? null : await sign(option.beforeKey),
      })),
    ),
    supersededToken: replacement?.publicToken ?? null,
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
    select: {
      id: true,
      status: true,
      expiresAt: true,
      renderOutputIds: true,
      supersededById: true,
      project: { select: { workspaceId: true } },
    },
  });
  if (proposal === null) throw new AppError("NOT_FOUND", "Proposal not found.", 404);
  const status = effectiveStatus(proposal.status, proposal.expiresAt);
  if (status === "EXPIRED") throw new AppError("EXPIRED", "This proposal has expired.", 410);
  if (proposal.supersededById !== null)
    throw new AppError("INVALID_STATE", "This proposal has been replaced by a newer version.", 409);
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
      supersededById: null,
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
    await recordProposalEmail(tx, {
      workspaceId: proposal.project.workspaceId,
      proposalId: proposal.id,
      kind: "APPROVED",
    });
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
    const comment = await tx.proposalComment.create({
      data: {
        proposalId: proposal.id,
        authorType: "CLIENT",
        authorName: validName,
        body,
      },
    });
    await recordProposalEmail(tx, {
      workspaceId: proposal.project.workspaceId,
      proposalId: proposal.id,
      kind: "CHANGES_REQUESTED",
      commentId: comment.id,
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
    const comment = await tx.proposalComment.create({
      data: {
        proposalId: proposal.id,
        authorType: "CLIENT",
        authorName: validName,
        body,
      },
    });
    await recordProposalEmail(tx, {
      workspaceId: proposal.project.workspaceId,
      proposalId: proposal.id,
      kind: "COMMENT",
      commentId: comment.id,
    });
  });
}

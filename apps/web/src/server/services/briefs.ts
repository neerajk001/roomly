import { randomBytes } from "node:crypto";
import type { Prisma } from "@roomdesigner/db";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

export const briefAnswersSchema = z.object({
  roomType: z.enum([
    "LIVING_ROOM",
    "BEDROOM",
    "KITCHEN",
    "BATHROOM",
    "DINING_ROOM",
    "HOME_OFFICE",
    "KIDS_ROOM",
    "BALCONY",
    "HALLWAY",
    "OTHER",
  ]),
  clientName: z.string().trim().min(1, "Your name is required.").max(120),
  goals: z.string().trim().max(800).optional(),
  styleLikes: z.array(z.string().max(64)).max(3).optional(),
  budgetBand: z
    .enum(["under_1k", "1k_5k", "5k_15k", "15k_plus", "not_sure"])
    .optional(),
  timeline: z.string().trim().max(120).optional(),
  keepItems: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type BriefAnswers = z.infer<typeof briefAnswersSchema>;

const ROOM_LABELS: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
  DINING_ROOM: "Dining room",
  HOME_OFFICE: "Home office",
  KIDS_ROOM: "Kids room",
  BALCONY: "Balcony",
  HALLWAY: "Hallway",
  OTHER: "Room",
};

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createBriefLink(
  db: Prisma,
  ctx: ServiceContext,
  input: { clientId: string; expiresInDays?: number },
): Promise<{ id: string; token: string; expiresAt: Date | null }> {
  const client = await db.client.findFirst({
    where: { id: input.clientId, workspaceId: ctx.workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (client === null) throw new AppError("NOT_FOUND", "Client not found.", 404);

  const expiresAt =
    input.expiresInDays !== undefined && input.expiresInDays > 0
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const link = await db.briefLink.create({
    data: {
      workspaceId: ctx.workspaceId,
      clientId: client.id,
      token: newToken(),
      expiresAt,
    },
  });
  return { id: link.id, token: link.token, expiresAt: link.expiresAt };
}

export interface BriefLinkStatus {
  id: string;
  token: string;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
  submissions: number;
}

export async function listBriefLinks(
  db: Prisma,
  ctx: ServiceContext,
  clientId: string,
): Promise<BriefLinkStatus[]> {
  const links = await db.briefLink.findMany({
    where: { workspaceId: ctx.workspaceId, clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
  });
  return links.map((link) => ({
    id: link.id,
    token: link.token,
    status: link.status,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    submissions: link._count.submissions,
  }));
}

export interface PublicBrief {
  token: string;
  status: string;
  clientName: string;
  brandName: string;
  brandColor: string | null;
  logoStorageKey: string | null;
  currency: string;
}

export async function getPublicBrief(db: Prisma, token: string): Promise<PublicBrief> {
  const link = await db.briefLink.findFirst({
    where: { token },
    select: {
      token: true,
      status: true,
      expiresAt: true,
      client: { select: { name: true } },
      workspace: {
        select: {
          currency: true,
          brandName: true,
          brandColor: true,
          logoStorageKey: true,
          name: true,
        },
      },
    },
  });
  if (link === null) throw new AppError("NOT_FOUND", "This brief link is not valid.", 404);
  if (link.expiresAt !== null && link.expiresAt < new Date()) {
    throw new AppError("EXPIRED", "This brief link has expired.", 410);
  }
  return {
    token: link.token,
    status: link.status,
    clientName: link.client?.name ?? "",
    brandName: link.workspace.brandName ?? link.workspace.name,
    brandColor: link.workspace.brandColor,
    logoStorageKey: link.workspace.logoStorageKey,
    currency: link.workspace.currency,
  };
}

/** Validates a token for uploads; returns the workspace it belongs to. */
export async function getBriefLinkForUpload(
  db: Prisma,
  token: string,
): Promise<{ linkId: string; workspaceId: string }> {
  const link = await db.briefLink.findFirst({
    where: { token },
    select: { id: true, workspaceId: true, status: true, expiresAt: true },
  });
  if (link === null) throw new AppError("NOT_FOUND", "This brief link is not valid.", 404);
  if (link.status !== "OPEN") {
    throw new AppError("CLOSED", "This brief was already submitted.", 409);
  }
  if (link.expiresAt !== null && link.expiresAt < new Date()) {
    throw new AppError("EXPIRED", "This brief link has expired.", 410);
  }
  return { linkId: link.id, workspaceId: link.workspaceId };
}

export interface SubmitBriefResult {
  projectId: string;
  roomId: string;
  designerEmail: string;
  projectName: string;
}

export async function submitBrief(
  db: Prisma,
  token: string,
  answers: BriefAnswers,
  assetIds: string[],
): Promise<SubmitBriefResult> {
  const link = await db.briefLink.findFirst({
    where: { token },
    select: {
      id: true,
      workspaceId: true,
      clientId: true,
      status: true,
      expiresAt: true,
      workspace: { select: { name: true, owner: { select: { email: true } } } },
    },
  });
  if (link === null) throw new AppError("NOT_FOUND", "This brief link is not valid.", 404);
  if (link.status !== "OPEN") throw new AppError("CLOSED", "This brief was already submitted.", 409);
  if (link.expiresAt !== null && link.expiresAt < new Date()) {
    throw new AppError("EXPIRED", "This brief link has expired.", 410);
  }
  if (assetIds.length > 8) throw new AppError("TOO_MANY_PHOTOS", "Up to 8 photos.", 400);

  const roomLabel = ROOM_LABELS[answers.roomType] ?? "Room";
  const projectName = `${roomLabel} brief${answers.clientName !== "" ? ` — ${answers.clientName}` : ""}`;

  const result = await db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        workspaceId: link.workspaceId,
        clientId: link.clientId,
        name: projectName,
        keepList: answers.keepItems !== undefined && answers.keepItems !== ""
          ? answers.keepItems.split(",").map((item) => item.trim()).filter((item) => item !== "")
          : [],
      },
    });
    const room = await tx.room.create({
      data: { projectId: project.id, name: roomLabel, type: answers.roomType },
    });

    if (assetIds.length > 0) {
      await tx.asset.updateMany({
        where: {
          id: { in: assetIds },
          workspaceId: link.workspaceId,
          kind: "BRIEF_UPLOAD",
          roomId: null,
        },
        data: { roomId: room.id },
      });
    }

    await tx.briefSubmission.create({
      data: {
        briefLinkId: link.id,
        answers: answers,
        assetIds,
        projectId: project.id,
      },
    });
    await tx.briefLink.update({ where: { id: link.id }, data: { status: "SUBMITTED" } });

    return { project, room };
  });

  return {
    projectId: result.project.id,
    roomId: result.room.id,
    designerEmail: link.workspace.owner.email,
    projectName,
  };
}

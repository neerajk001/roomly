import { getServerEnv } from "@roomdesigner/config/env";
import {
  prisma,
  refundCredits,
  reserveCredits,
  InsufficientCreditsError,
  type Prisma,
  type RenderJob,
} from "@roomdesigner/db";
import { sanitizeInstruction } from "@roomdesigner/ai";
import { getStyle, totalCreditCost } from "@roomdesigner/shared";
import { z } from "zod";
import { AppError } from "../app-error";
import { enqueueRender } from "../queue";
import type { ServiceContext } from "./context";

export const createRenderSchema = z.object({
  roomId: z.string().min(1),
  kind: z.enum(["RESTYLE", "EDIT"]),
  styleKey: z.string().min(1).max(64).optional(),
  instruction: z.string().max(600).optional(),
  variations: z.number().int().min(1).max(4).default(4),
  quality: z.enum(["draft", "final"]).default("draft"),
  /** EDIT only: the render output the user wants to change. */
  sourceOutputId: z.string().min(1).optional(),
});

export type CreateRenderInput = z.infer<typeof createRenderSchema>;

export interface CreateRenderContext extends ServiceContext {
  emailVerified: boolean;
}

const PROVIDER_PARAMS = {
  draft: { providerQuality: "medium", size: "1024x1024" },
  final: { providerQuality: "high", size: "1536x1024" },
} as const;

async function assertDailySpendOk(db: Prisma, costMicrosToAdd: number): Promise<void> {
  const env = getServerEnv();
  const limitMicros = Math.round(env.MAX_DAILY_SPEND_USD * 1_000_000);
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const aggregate = await db.renderJob.aggregate({
    where: { createdAt: { gte: startOfDayUtc } },
    _sum: { costMicros: true },
  });
  const spent = aggregate._sum.costMicros ?? 0;
  // The provider's real cost is unknown before the call; use the conservative
  // per-image fallback so the guard fails safe.
  if (spent + costMicrosToAdd >= limitMicros) {
    throw new AppError(
      "SERVICE_BUSY",
      "Image generation is paused for today. Try again tomorrow.",
      503,
    );
  }
}

export interface CreatedRender {
  jobId: string;
  creditsCharged: number;
  balanceAfter: number;
}

export async function createRender(
  db: Prisma,
  ctx: CreateRenderContext,
  input: CreateRenderInput,
): Promise<CreatedRender> {
  if (!ctx.emailVerified) {
    throw new AppError("EMAIL_NOT_VERIFIED", "Verify your email address first.", 403);
  }

  const room = await db.room.findFirst({
    where: {
      id: input.roomId,
      project: { workspaceId: ctx.workspaceId, deletedAt: null },
    },
    include: { project: true },
  });
  if (room === null) {
    throw new AppError("NOT_FOUND", "Room not found.", 404);
  }

  let sourceAssetId: string;
  let styleKey: string | null = null;
  let instruction: string | null = null;
  let parentJobId: string | null = null;

  if (input.kind === "RESTYLE") {
    if (input.styleKey === undefined || getStyle(input.styleKey) === undefined) {
      throw new AppError("INVALID_INPUT", "Choose a style.", 400);
    }
    styleKey = input.styleKey;
    const photo = await db.asset.findFirst({
      where: { roomId: room.id, kind: "ORIGINAL_PHOTO", confirmedAt: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (photo === null) {
      throw new AppError("NO_PHOTO", "Add a photo of the room first.", 400);
    }
    sourceAssetId = photo.id;
  } else {
    const cleaned = sanitizeInstruction(input.instruction ?? "");
    if (cleaned.length < 3) {
      throw new AppError("INVALID_INPUT", "Describe the change (at least 3 characters).", 400);
    }
    if (input.sourceOutputId === undefined) {
      throw new AppError("INVALID_INPUT", "Choose the image you want to edit.", 400);
    }
    const output = await db.renderOutput.findFirst({
      where: {
        id: input.sourceOutputId,
        job: { workspaceId: ctx.workspaceId, roomId: room.id, status: "SUCCEEDED" },
      },
      select: { assetId: true, jobId: true },
    });
    if (output === null) {
      throw new AppError("NOT_FOUND", "Image not found.", 404);
    }
    sourceAssetId = output.assetId;
    parentJobId = output.jobId;
    instruction = cleaned;
  }

  const cost = totalCreditCost(input.quality, input.variations);
  await assertDailySpendOk(db, 250_000 * input.variations);

  const env = getServerEnv();

  let created: RenderJob;
  try {
    created = await db.$transaction(async (tx) => {
      const job = await tx.renderJob.create({
        data: {
          workspaceId: ctx.workspaceId,
          roomId: room.id,
          kind: input.kind,
          status: "QUEUED",
          styleKey,
          instruction,
          params: PROVIDER_PARAMS[input.quality],
          sourceAssetId,
          parentJobId,
          variations: input.variations,
          provider: env.IMAGE_PROVIDER,
          creditsCharged: cost,
        },
      });
      await reserveCredits(tx, { workspaceId: ctx.workspaceId, jobId: job.id, cost });
      return job;
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw new AppError(
        "INSUFFICIENT_CREDITS",
        `This render needs ${String(error.required)} credits and you have ${String(error.balance)}.`,
        402,
      );
    }
    throw error;
  }

  try {
    await enqueueRender(created.id);
  } catch {
    await db.renderJob.update({
      where: { id: created.id },
      data: {
        status: "FAILED",
        errorCode: "QUEUE_UNAVAILABLE",
        errorMessage: "The render queue is unavailable.",
        finishedAt: new Date(),
      },
    });
    await refundCredits(db, { workspaceId: ctx.workspaceId, jobId: created.id, cost });
    throw new AppError("SERVICE_BUSY", "Renders are temporarily unavailable. Try again.", 503);
  }

  const balance = await db.creditLedger.aggregate({
    where: { workspaceId: ctx.workspaceId },
    _sum: { delta: true },
  });

  return {
    jobId: created.id,
    creditsCharged: cost,
    balanceAfter: balance._sum.delta ?? 0,
  };
}

import { getServerEnv } from "@roomdesigner/config/env";
import {
  refundCredits,
  reserveCredits,
  InsufficientCreditsError,
  type Prisma,
  type RenderJob,
  dailyAiSpendMicros,
} from "@roomdesigner/db";
import { CONSERVATIVE_IMAGE_COST_MICROS, sanitizeInstruction } from "@roomdesigner/ai";
import {
  designPreferencesSchema,
  editTargetSchema,
  type EditTarget,
  roomIncludeItemsSchema,
  roomIncludesAreValid,
  getStyle,
  outputStyleKey,
  outputConceptLabel,
  totalCreditCost,
} from "@roomdesigner/shared";
import { z } from "zod";
import { AppError } from "../app-error";
import { enqueueRender } from "../queue";
import type { ServiceContext } from "./context";

export const createRenderSchema = z
  .object({
    roomId: z.string().min(1),
    kind: z.enum(["RESTYLE", "EDIT"]),
    styleKey: z.string().min(1).max(64).optional(),
    styleKeys: z.array(z.string()).optional(),
    traditionKey: z.string().optional(),
    budgetTier: z.enum(["budget", "mid", "premium"]).optional(),
    instruction: z.string().max(600).optional(),
    includeItems: roomIncludeItemsSchema.optional(),
    variations: z.number().int().min(1).max(4).default(4),
    quality: z.enum(["draft", "final"]).default("draft"),
    /** RESTYLE only: optional extra direction from the user. */
    notes: z.string().max(600).optional(),
    /** Optional staging picks (e.g. "sofa", "flooring"). */
    stagingItems: z
      .array(
        z.enum([
          "sofa",
          "dining-table",
          "rug",
          "flooring",
          "curtains",
          "plants",
          "art",
          "lighting",
          "storage",
        ]),
      )
      .max(9)
      .optional(),
    /** EDIT only: the render output the user wants to change. */
    sourceOutputId: z.string().min(1).optional(),
    editTarget: editTargetSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.editTarget && input.kind !== "EDIT")
      ctx.addIssue({
        code: "custom",
        path: ["editTarget"],
        message: "Choose an area only when editing a concept.",
      });
    if (input.kind === "EDIT" && input.variations !== 1)
      ctx.addIssue({
        code: "custom",
        path: ["variations"],
        message: "A chat edit refines one selected concept at a time.",
      });
    const preferences = designPreferencesSchema.safeParse(input);
    if (!preferences.success) {
      for (const issue of preferences.error.issues)
        ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
    if (input.styleKeys && input.styleKeys.length > input.variations) {
      ctx.addIssue({
        code: "custom",
        path: ["variations"],
        message: "Choose at least one concept per selected style.",
      });
    }
    if (input.styleKeys && input.styleKey !== input.styleKeys[0]) {
      ctx.addIssue({
        code: "custom",
        path: ["styleKey"],
        message: "The primary style must match your first selected style.",
      });
    }
  });

export type CreateRenderInput = z.infer<typeof createRenderSchema>;

export interface CreateRenderContext extends ServiceContext {
  emailVerified: boolean;
}

// Draft is cheap/low quality (dev + quick iteration); final is the best
// available texture quality at a larger size.
function pickRenderParams(
  quality: "draft" | "final",
  width: number | null,
  height: number | null,
): { providerQuality: "low" | "high"; size: "1024x1024" | "1536x1024" | "1024x1536" } {
  const portrait = width !== null && height !== null && height > width;
  if (quality === "final") {
    return { providerQuality: "high", size: portrait ? "1024x1536" : "1536x1024" };
  }
  return { providerQuality: "low", size: portrait ? "1024x1536" : "1024x1024" };
}

async function assertDailySpendOk(db: Prisma, costMicrosToAdd: number): Promise<void> {
  const env = getServerEnv();
  const limitMicros = Math.round(env.MAX_DAILY_SPEND_USD * 1_000_000);
  const spent = await dailyAiSpendMicros(db);
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
  const parsed = createRenderSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Check the render options.",
      400,
    );
  input = parsed.data;
  if (!ctx.emailVerified) {
    throw new AppError("EMAIL_NOT_VERIFIED", "Verify your email address first.", 403);
  }
  const configuration = getServerEnv();
  if (
    input.kind === "RESTYLE" &&
    configuration.IMAGE_PROVIDER === "openai" &&
    configuration.ADVICE_PROVIDER !== "openai"
  )
    throw new AppError(
      "ASSESSMENT_UNAVAILABLE",
      "Room photo checks are temporarily unavailable. No generation credits were charged. Try again later.",
      503,
    );

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
  if (input.includeItems && !roomIncludesAreValid(room.type, input.includeItems))
    throw new AppError("INVALID_INPUT", "Choose items for this room type.", 400);

  let sourceAssetId: string;
  let sourceWidth: number | null = null;
  let sourceHeight: number | null = null;
  let styleKey: string | null = null;
  let instruction: string | null = null;
  let notes: string | null = null;
  let parentJobId: string | null = null;
  let editContext: {
    includeItems?: string[];
    editTarget?: EditTarget;
    sourceOutputId?: string;
    sourceDirectionLabel?: string;
    budgetTier?: "budget" | "mid" | "premium";
    traditionKey?: string;
  } = {};

  if (input.kind === "RESTYLE") {
    if (input.styleKey === undefined || getStyle(input.styleKey) === undefined) {
      throw new AppError("INVALID_INPUT", "Choose a style.", 400);
    }
    styleKey = input.styleKey;
    const photo = await db.asset.findFirst({
      where: {
        workspaceId: ctx.workspaceId,
        roomId: room.id,
        kind: { in: ["ORIGINAL_PHOTO", "BRIEF_UPLOAD"] },
        confirmedAt: { not: null },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, width: true, height: true },
    });
    if (photo === null) {
      throw new AppError("NO_PHOTO", "Add a photo of the room first.", 400);
    }
    sourceAssetId = photo.id;
    sourceWidth = photo.width;
    sourceHeight = photo.height;
    notes = sanitizeInstruction(input.notes ?? "").slice(0, 300);
    if (notes === "") notes = null;
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
      select: {
        id: true,
        index: true,
        assetId: true,
        jobId: true,
        job: { select: { params: true, styleKey: true } },
        asset: { select: { width: true, height: true } },
      },
    });
    if (output === null) {
      throw new AppError("NOT_FOUND", "Image not found.", 404);
    }
    sourceAssetId = output.assetId;
    parentJobId = output.jobId;
    sourceWidth = output.asset.width;
    sourceHeight = output.asset.height;
    instruction = cleaned;
    const inherited = z
      .object({
        notes: z.string().max(300).optional(),
        budgetTier: z.enum(["budget", "mid", "premium"]).optional(),
        traditionKey: z.string().optional(),
        sourceDirectionLabel: z.string().optional(),
        includeItems: roomIncludeItemsSchema.optional(),
      })
      .parse(output.job.params);
    styleKey = outputStyleKey(output.job.params, output.job.styleKey, output.index);
    notes = inherited.notes ?? null;
    editContext = {
      ...(inherited.includeItems ? { includeItems: inherited.includeItems } : {}),
      ...(input.editTarget ? { editTarget: input.editTarget } : {}),
      sourceOutputId: output.id,
      budgetTier: inherited.budgetTier,
      traditionKey: inherited.traditionKey,
      sourceDirectionLabel:
        outputConceptLabel(output.job.params, styleKey, output.index) ??
        inherited.sourceDirectionLabel,
    };
  }

  const cost = totalCreditCost(input.quality, input.variations);
  const diversityAllowance = input.kind === "RESTYLE" && input.variations > 1 ? 1 : 0;
  await assertDailySpendOk(
    db,
    CONSERVATIVE_IMAGE_COST_MICROS * (input.variations + diversityAllowance),
  );

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
          params: {
            ...pickRenderParams(input.quality, sourceWidth, sourceHeight),
            ...editContext,
            ...(input.kind === "RESTYLE" && input.includeItems
              ? { includeItems: input.includeItems }
              : {}),
            ...(input.kind === "RESTYLE"
              ? { conceptPlanVersion: 1, diversityRetryUsed: false }
              : {}),
            ...(input.kind === "RESTYLE"
              ? {
                  ...(input.styleKeys ? { styleKeys: input.styleKeys } : {}),
                  ...(input.traditionKey ? { traditionKey: input.traditionKey } : {}),
                  ...(input.budgetTier ? { budgetTier: input.budgetTier } : {}),
                }
              : {}),
            ...(notes !== null ? { notes } : {}),
            ...(input.stagingItems !== undefined && input.stagingItems.length > 0
              ? { stagingItems: input.stagingItems }
              : {}),
          },
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

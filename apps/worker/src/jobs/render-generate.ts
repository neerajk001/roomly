import {
  buildEditPrompt,
  buildRestylePrompt,
  ProviderError,
  variationPrompt,
  type EditResult,
  type ImageQuality,
  type ImageProvider,
  type ImageSize,
} from "@roomdesigner/ai";
import { refundCredits, type Prisma } from "@roomdesigner/db";
import { makeThumbnail, makeWebVersion, buildStorageKey } from "@roomdesigner/storage";
import { getServerEnv } from "@roomdesigner/config/env";
import {
  BUDGET_TIERS,
  designPreferencesSchema,
  getStyle,
  outputStyleKey,
} from "@roomdesigner/shared";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const ROOM_TYPE_LABELS: Record<string, string> = {
  LIVING_ROOM: "living room",
  BEDROOM: "bedroom",
  KITCHEN: "kitchen",
  BATHROOM: "bathroom",
  DINING_ROOM: "dining room",
  HOME_OFFICE: "home office",
  KIDS_ROOM: "kids room",
  BALCONY: "balcony",
  HALLWAY: "hallway",
  OTHER: "room",
};

export const renderParamsSchema = z
  .object({
    ...designPreferencesSchema.shape,
    providerQuality: z.enum(["low", "medium", "high"]),
    size: z.enum(["1024x1024", "1536x1024", "1024x1536", "auto"]),
    notes: z.string().max(300).optional(),
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
  })
  .refine(
    (value) => designPreferencesSchema.safeParse(value).success,
    "Invalid design preferences.",
  );

export type RenderParams = z.infer<typeof renderParamsSchema>;

/** Storage is injected so worker tests can run without S3. */
export interface RenderJobDeps {
  db: Prisma;
  provider: ImageProvider;
  download(key: string): Promise<Buffer>;
  upload(input: { key: string; body: Buffer; contentType: string }): Promise<void>;
  now(): Date;
}

export type ProcessOutcome = "ok" | "retry";

interface ProcessJobInput {
  jobId: string;
  /** pg-boss retryCount: 0 on the first delivery. */
  retryCount: number;
  retryLimit: number;
}

const PROVIDER_TIMEOUT_MS = 120_000;

/** Preview size for stored renders; lower in dev via WEB_RENDER_MAX_PX. */
function webPreviewMaxPx(): number {
  return getServerEnv().WEB_RENDER_MAX_PX;
}

function safeMessage(error: unknown): string {
  if (error instanceof ProviderError) return error.message;
  return "The render could not be completed.";
}

function errorCode(error: unknown): string {
  if (error instanceof ProviderError) return error.code;
  return "RENDER_FAILED";
}

/**
 * Executes one render job attempt. Idempotent across retries: the job row is
 * the state machine, and a terminal job exits immediately.
 */
export async function processRenderJob(
  deps: RenderJobDeps,
  input: ProcessJobInput,
): Promise<ProcessOutcome> {
  const { db } = deps;

  const job = await db.renderJob.findUnique({
    where: { id: input.jobId },
    include: {
      room: { include: { project: true } },
      sourceAsset: { select: { id: true, storageKey: true, mime: true } },
    },
  });
  if (job === null) {
    return "ok";
  }
  if (job.status === "SUCCEEDED" || job.status === "FAILED" || job.status === "CANCELED") {
    return "ok";
  }
  if (job.room.project.deletedAt !== null) {
    await finalizeFailure(deps, job, "PROJECT_DELETED", "This project was deleted.");
    return "ok";
  }

  const isFinalAttempt = input.retryCount >= input.retryLimit;

  await db.renderJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      attempts: { increment: 1 },
      startedAt: job.startedAt ?? deps.now(),
    },
  });

  try {
    const params = renderParamsSchema.safeParse(job.params);
    if (!params.success || (params.data.styleKeys?.length ?? 0) > job.variations) {
      await finalizeFailure(deps, job, "INVALID_JOB", "This render request is invalid.");
      return "ok";
    }

    const prompts = Array.from({ length: job.variations }, (_, index) =>
      buildPromptForJob(
        { ...job, styleKey: outputStyleKey(params.data, job.styleKey, index) },
        params.data,
      ),
    );
    const prompt = prompts[0] ?? buildPromptForJob(job, params.data);
    const source = await deps.download(job.sourceAsset.storageKey);

    // One call per variation with a distinct emphasis: a single n=4 call
    // returns four near-identical images. EDIT jobs stay a single image.
    const result =
      job.kind === "RESTYLE" && job.variations > 1
        ? await editVariations(deps, {
            source,
            mime: job.sourceAsset.mime,
            prompts,
            size: params.data.size,
            quality: params.data.providerQuality,
          })
        : await deps.provider.edit({
            image: source,
            mime: job.sourceAsset.mime,
            prompt,
            n: job.variations,
            size: params.data.size,
            quality: params.data.providerQuality,
            signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
          });

    await db.renderOutput.deleteMany({ where: { jobId: job.id } });

    let index = 0;
    for (const image of result.images) {
      const web = await makeWebVersion(image.data, webPreviewMaxPx());
      const webAsset = await createAsset(db, {
        workspaceId: job.workspaceId,
        roomId: job.roomId,
        kind: "RENDER",
        mime: web.mime,
        sizeBytes: web.data.byteLength,
        width: null,
        height: null,
      });
      await deps.upload({ key: webAsset.storageKey, body: web.data, contentType: web.mime });

      const thumb = await makeThumbnail(web.data);
      const thumbAsset = await createAsset(db, {
        workspaceId: job.workspaceId,
        roomId: job.roomId,
        kind: "THUMBNAIL",
        mime: thumb.mime,
        sizeBytes: thumb.data.byteLength,
        width: null,
        height: null,
      });
      await deps.upload({ key: thumbAsset.storageKey, body: thumb.data, contentType: thumb.mime });

      await db.renderOutput.create({
        data: {
          jobId: job.id,
          assetId: webAsset.id,
          thumbAssetId: thumbAsset.id,
          index,
        },
      });
      index += 1;
    }

    if (index === 0) {
      throw new ProviderError(
        "PROVIDER_EMPTY",
        "The image service returned no images.",
        "transient",
      );
    }

    await db.renderJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        finishedAt: deps.now(),
        costMicros: result.costMicros,
        model: result.model,
        errorCode: null,
        errorMessage: null,
      },
    });
    return "ok";
  } catch (error) {
    const transient = !(error instanceof ProviderError) || error.errorClass === "transient";
    if (transient && !isFinalAttempt) {
      await db.renderJob.update({
        where: { id: job.id },
        data: { status: "QUEUED", errorCode: null, errorMessage: null },
      });
      return "retry";
    }
    await finalizeFailure(deps, job, errorCode(error), safeMessage(error));
    return "ok";
  }
}

function buildPromptForJob(
  job: {
    kind: "RESTYLE" | "EDIT";
    styleKey: string | null;
    instruction: string | null;
    room: { type: string; project: { keepList: string[]; renterMode: boolean } };
  },
  params: RenderParams,
): string {
  if (job.kind === "EDIT") {
    return buildEditPrompt(job.instruction ?? "");
  }
  const style = job.styleKey !== null ? getStyle(job.styleKey) : undefined;
  const base = buildRestylePrompt({
    roomTypeLabel: ROOM_TYPE_LABELS[job.room.type] ?? "room",
    styleLabel: style?.label ?? "Modern",
    styleHint: style?.promptHint ?? "clean lines and a coherent palette",
    keepList: job.room.project.keepList,
    renterMode: job.room.project.renterMode,
  });
  const budget = BUDGET_TIERS.find((tier) => tier.key === params.budgetTier);
  const budgetDirected = budget
    ? `${base}\nBudget direction: ${budget.hint} These are concept visuals, not a price quote.`
    : base;
  const directed = params.stagingItems?.length
    ? `${budgetDirected}\nRequested staging focus: ${params.stagingItems.join(", ")}. Respect the keep-items and renter constraints above.`
    : budgetDirected;
  return params.notes !== undefined && params.notes !== ""
    ? `${directed}\nAdditional notes: ${params.notes}`
    : directed;
}

async function finalizeFailure(
  deps: RenderJobDeps,
  job: { id: string; workspaceId: string; creditsCharged: number; status: string },
  code: string,
  message: string,
): Promise<void> {
  await deps.db.renderJob.update({
    where: { id: job.id },
    data: {
      status: "FAILED",
      finishedAt: deps.now(),
      errorCode: code,
      errorMessage: message,
    },
  });
  await refundCredits(deps.db, {
    workspaceId: job.workspaceId,
    jobId: job.id,
    cost: job.creditsCharged,
  });
}

async function createAsset(
  db: Prisma,
  input: {
    workspaceId: string;
    roomId: string | null;
    kind: "RENDER" | "THUMBNAIL";
    mime: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
  },
): Promise<{ id: string; storageKey: string }> {
  const asset = await db.asset.create({
    data: {
      workspaceId: input.workspaceId,
      roomId: input.roomId,
      kind: input.kind,
      storageKey: `pending/${randomUUID()}`,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      confirmedAt: new Date(),
    },
  });
  const storageKey = buildStorageKey({
    workspaceId: input.workspaceId,
    kind: input.kind,
    assetId: asset.id,
    mime: input.mime,
  });
  await db.asset.update({ where: { id: asset.id }, data: { storageKey } });
  return { id: asset.id, storageKey };
}
async function editVariations(
  deps: RenderJobDeps,
  input: {
    source: Buffer;
    mime: string;
    prompts: string[];
    size: ImageSize;
    quality: ImageQuality;
  },
): Promise<EditResult> {
  const results = await Promise.all(
    input.prompts.map((prompt, index) =>
      deps.provider.edit({
        image: input.source,
        mime: input.mime,
        prompt: variationPrompt(prompt, index),
        n: 1,
        size: input.size,
        quality: input.quality,
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      }),
    ),
  );

  return {
    images: results.flatMap((result) => result.images),
    costMicros: results.reduce((sum, result) => sum + result.costMicros, 0),
    model: results[0]?.model ?? deps.provider.name,
  };
}

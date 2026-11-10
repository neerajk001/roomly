import {
  buildEditPrompt,
  buildRestylePrompt,
  ProviderError,
  buildConceptPrompt,
  CONSERVATIVE_IMAGE_COST_MICROS,
  type EditResult,
  type ImageQuality,
  type ImageProvider,
  type ImageSize,
  type RoomAssessmentProvider,
  sanitizeInstruction,
} from "@roomdesigner/ai";
import { refundCredits, type Prisma } from "@roomdesigner/db";
import {
  makeThumbnail,
  makeWebVersion,
  buildStorageKey,
  prepareMaskedEdit,
  compositeSelectedArea,
} from "@roomdesigner/storage";
import { getServerEnv } from "@roomdesigner/config/env";
import {
  editTargetRegions,
  BUDGET_TIERS,
  conceptDirectionFor,
  getStyle,
  outputStyleKey,
  roomIncludesAreValid,
  roomIncludesPrompt,
  checklistForRoom,
} from "@roomdesigner/shared";
import { randomUUID } from "node:crypto";
import { renderParamsSchema, type RenderParams } from "./render-params";
import { improveConceptDiversity } from "./concept-diversity";
import { claimDiversityRetry, recordDiversityResult } from "./diversity-retry";
import { assessRoomBeforeGeneration, roomAssessmentPrompt } from "./room-assessment";

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

export { renderParamsSchema } from "./render-params";

/** Storage is injected so worker tests can run without S3. */
export interface RenderJobDeps {
  db: Prisma;
  provider: ImageProvider;
  download(key: string): Promise<Buffer>;
  upload(input: { key: string; body: Buffer; contentType: string }): Promise<void>;
  now(): Date;
  assessor?: RoomAssessmentProvider;
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
      sourceAsset: { select: { id: true, workspaceId: true, storageKey: true, mime: true } },
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

  const claim = await db.renderJob.updateMany({
    where: { id: job.id, workspaceId: job.workspaceId, status: "QUEUED" },
    data: {
      status: "RUNNING",
      attempts: { increment: 1 },
      startedAt: job.startedAt ?? deps.now(),
    },
  });
  if (claim.count !== 1) return "ok";

  try {
    const params = renderParamsSchema.safeParse(job.params);
    if (
      !params.success ||
      (params.success &&
        params.data.includeItems !== undefined &&
        !roomIncludesAreValid(job.room.type, params.data.includeItems)) ||
      (params.data.styleKeys?.length ?? 0) > job.variations ||
      (params.data.editTarget &&
        (job.kind !== "EDIT" || job.variations !== 1 || !params.data.sourceOutputId))
    ) {
      await finalizeFailure(deps, job, "INVALID_JOB", "This render request is invalid.");
      return "ok";
    }

    if (job.sourceAsset.workspaceId !== job.workspaceId)
      throw new ProviderError("INVALID_JOB", "The source photo is unavailable.", "permanent");
    const source = await deps.download(job.sourceAsset.storageKey);
    let planningPrompt = "";
    if (job.kind === "RESTYLE") {
      const requestedItems = [
        ...(params.data.includeItems ?? []).map((key) => ({
          key,
          label: checklistForRoom(job.room.type).find(([id]) => id === key)?.[1] ?? key,
        })),
        ...(params.data.stagingItems ?? []).map((key) => ({ key: "staging:" + key, label: key })),
      ];
      const dimensionsMm = {
        width: job.room.widthMm,
        length: job.room.lengthMm,
        height: job.room.heightMm,
      };
      const assessment = await assessRoomBeforeGeneration(db, {
        jobId: job.id,
        workspaceId: job.workspaceId,
        sourceAssetId: job.sourceAssetId,
        image: source,
        imageProviderName: deps.provider.name,
        provider: deps.assessor,
        imageBudgetMicros:
          deps.provider.name === "fake" ? 0 : job.variations * CONSERVATIVE_IMAGE_COST_MICROS,
        context: {
          roomType: job.room.type,
          dimensionsMm,
          requestedItems: [...new Map(requestedItems.map((item) => [item.key, item])).values()],
          keepList: job.room.project.keepList,
          renterMode: job.room.project.renterMode,
          notes: sanitizeInstruction(params.data.notes ?? job.room.project.notes ?? ""),
        },
      });
      if (assessment.decision !== "ready") {
        await finalizeFailure(
          deps,
          job,
          assessment.decision === "needs-photo" ? "ROOM_PHOTO_INSUFFICIENT" : "ROOM_ITEMS_DONT_FIT",
          assessment.nextStep,
        );
        return "ok";
      }
      planningPrompt = roomAssessmentPrompt(assessment, dimensionsMm);
      const latest = await db.renderJob.findFirstOrThrow({
        where: { id: job.id, workspaceId: job.workspaceId },
      });
      const refreshed = renderParamsSchema.parse(latest.params);
      const saved = await db.renderJob.update({
        where: { id: job.id, workspaceId: job.workspaceId },
        data: { params: { ...refreshed, renderStage: "generating" } },
      });
      params.data = renderParamsSchema.parse(saved.params);
    }
    const directions = Array.from({ length: job.variations }, (_, index) =>
      conceptDirectionFor(outputStyleKey(params.data, job.styleKey, index), index),
    );
    const prompts = Array.from({ length: job.variations }, (_, index) => {
      const base =
        buildPromptForJob(
          { ...job, styleKey: outputStyleKey(params.data, job.styleKey, index) },
          params.data,
        ) + (planningPrompt ? "\n" + planningPrompt : "");
      const direction = directions[index];
      return job.kind === "RESTYLE" && direction
        ? buildConceptPrompt(
            base,
            direction,
            directions.filter((_, slot) => slot !== index),
          )
        : base;
    });
    const prompt = prompts[0] ?? buildPromptForJob(job, params.data);
    const targeted = params.data.editTarget
      ? await prepareMaskedEdit(source, editTargetRegions(params.data.editTarget))
      : null;

    // One call per variation with a distinct emphasis: a single n=4 call
    // returns four near-identical images. EDIT jobs stay a single image.
    let result =
      job.kind === "RESTYLE" && job.variations > 1
        ? await editVariations(deps, {
            source,
            mime: job.sourceAsset.mime,
            prompts,
            size: params.data.size,
            quality: params.data.providerQuality,
          })
        : await deps.provider.edit({
            image: targeted?.image ?? source,
            mime: targeted ? "image/png" : job.sourceAsset.mime,
            ...(targeted ? { mask: targeted.mask } : {}),
            prompt,
            n: job.variations,
            size: targeted ? "auto" : params.data.size,
            quality: params.data.providerQuality,
            signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
          });

    const initialCostMicros = result.costMicros;
    await db.renderJob.update({
      where: { id: job.id, workspaceId: job.workspaceId },
      data: { costMicros: { increment: initialCostMicros } },
    });
    if (result.images.length !== job.variations) {
      throw new ProviderError(
        "PROVIDER_COUNT",
        "The image service returned an incomplete set. Please try again.",
        "transient",
      );
    }
    let diversityReport: { similarConcepts: boolean; retryUsed: boolean } | undefined;
    if (job.kind === "RESTYLE" && job.variations > 1) {
      const improved = await improveConceptDiversity({
        result,
        provider: deps.provider,
        claimRetry: () =>
          claimDiversityRetry(db, {
            jobId: job.id,
            workspaceId: job.workspaceId,
            params: params.data,
            initialCostMicros: 0,
            limitMicros: Math.round(getServerEnv().MAX_DAILY_SPEND_USD * 1_000_000),
          }),
        replacementInput: (index) => ({
          image: source,
          mime: job.sourceAsset.mime,
          prompt: buildConceptPrompt(
            buildPromptForJob(
              { ...job, styleKey: outputStyleKey(params.data, job.styleKey, index) },
              params.data,
            ),
            directions[index] ?? conceptDirectionFor(job.styleKey, index),
            directions.filter((_, slot) => slot !== index),
            true,
          ),
          n: 1,
          size: params.data.size,
          quality: params.data.providerQuality,
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        }),
        failedCallCostMicros: deps.provider.name === "fake" ? 0 : CONSERVATIVE_IMAGE_COST_MICROS,
      });
      result = improved.result;
      diversityReport = {
        ...improved.report,
        retryUsed: params.data.diversityRetryUsed === true || improved.report.retryUsed,
      };
    }
    // Persist all returned usage before uploads, including discarded diversity attempts.
    if (job.kind === "RESTYLE")
      await recordDiversityResult(db, {
        jobId: job.id,
        workspaceId: job.workspaceId,
        extraCostMicros: result.costMicros - initialCostMicros,
        report: diversityReport,
      });

    await db.renderOutput.deleteMany({ where: { jobId: job.id } });

    let index = 0;
    for (const image of result.images) {
      const web = params.data.editTarget
        ? {
            data: await compositeSelectedArea(
              source,
              image.data,
              editTargetRegions(params.data.editTarget),
            ),
            mime: "image/png",
          }
        : await makeWebVersion(image.data, webPreviewMaxPx());
      const webAsset = await createAsset(db, {
        workspaceId: job.workspaceId,
        roomId: job.roomId,
        kind: "RENDER",
        mime: web.mime,
        sizeBytes: web.data.byteLength,
        width: targeted?.width ?? null,
        height: targeted?.height ?? null,
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
      where: { id: job.id, workspaceId: job.workspaceId },
      data: {
        status: "SUCCEEDED",
        finishedAt: deps.now(),
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
        where: { id: job.id, workspaceId: job.workspaceId },
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
    const base = buildEditPrompt(job.instruction ?? "", job.room.project);
    const budget = BUDGET_TIERS.find((tier) => tier.key === params.budgetTier);
    return [
      base,
      ...(params.includeItems?.length
        ? [roomIncludesPrompt(job.room.type, params.includeItems, "edit")]
        : []),
      ...(params.editTarget
        ? [
            `Edit only the selected masked area (${JSON.stringify(params.editTarget.label)}). The mask contains all selected rectangles. Edit those regions only, including separate selected parts; gaps between them and the rest of the image are protected. Keep positions and scale unless explicitly asked otherwise.`,
          ]
        : []),
      ...(params.notes ? [`Original room notes: ${params.notes}`] : []),
      ...(budget ? [`Budget direction: ${budget.hint}`] : []),
    ].join("\n");
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
  const withItems = params.includeItems?.length
    ? `${directed}\n${roomIncludesPrompt(job.room.type, params.includeItems)}`
    : directed;
  return params.notes !== undefined && params.notes !== ""
    ? `${withItems}\nAdditional notes: ${params.notes}`
    : withItems;
}

async function finalizeFailure(
  deps: RenderJobDeps,
  job: { id: string; workspaceId: string; creditsCharged: number; status: string },
  code: string,
  message: string,
): Promise<void> {
  await deps.db.$transaction(async (tx) => {
    await refundCredits(tx, {
      workspaceId: job.workspaceId,
      jobId: job.id,
      cost: job.creditsCharged,
    });
    await tx.renderJob.update({
      where: { id: job.id, workspaceId: job.workspaceId },
      data: {
        status: "FAILED",
        finishedAt: deps.now(),
        errorCode: code,
        errorMessage: message,
      },
    });
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
    input.prompts.map((prompt) =>
      deps.provider.edit({
        image: input.source,
        mime: input.mime,
        prompt,
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

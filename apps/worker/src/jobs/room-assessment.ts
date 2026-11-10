import { createHash } from "node:crypto";
import { z } from "zod";
import { dailyAiSpendMicros, type Prisma } from "@roomdesigner/db";
import { getServerEnv } from "@roomdesigner/config/env";
import {
  getRoomAssessmentProvider,
  ProviderError,
  type RoomAssessmentProvider,
  type RoomAssessmentContext,
} from "@roomdesigner/ai";
import {
  validateRoomAssessment,
  roomAssessmentRecordSchema,
  roomAssessmentSchema,
  type RoomAssessment,
} from "@roomdesigner/shared";
import { makeWebVersion } from "@roomdesigner/storage";

const metadataSchema = z.record(z.string(), z.json());
const spendsSchema = z.record(z.string(), z.number().int().nonnegative().safe());
export async function assessRoomBeforeGeneration(
  db: Prisma,
  input: {
    jobId: string;
    workspaceId: string;
    sourceAssetId: string;
    image: Buffer;
    context: RoomAssessmentContext;
    provider?: RoomAssessmentProvider;
    imageProviderName: string;
    dailyLimitMicros?: number;
    callBudgetMicros?: number;
    imageBudgetMicros?: number;
  },
): Promise<RoomAssessment> {
  const env = getServerEnv();
  const provider = input.provider ?? getRoomAssessmentProvider();
  const imageBudget = input.imageBudgetMicros ?? 0;
  const dailyLimit = input.dailyLimitMicros ?? Math.round(env.MAX_DAILY_SPEND_USD * 1000000);
  if (
    !Number.isSafeInteger(imageBudget) ||
    imageBudget < 0 ||
    !Number.isSafeInteger(dailyLimit) ||
    dailyLimit <= 0
  )
    throw new ProviderError(
      "ASSESSMENT_UNAVAILABLE",
      "Room photo checks are temporarily unavailable.",
      "permanent",
    );
  if (provider.source === "demo" && input.imageProviderName !== "fake")
    throw new ProviderError(
      "ASSESSMENT_UNAVAILABLE",
      "Room photo checks are unavailable. No concepts were generated.",
      "permanent",
    );
  const providerKey = provider.source + ":" + provider.model;
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        source: input.sourceAssetId,
        context: input.context,
        providerKey,
      }),
    )
    .digest("hex");
  const claimed = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { params: unknown }[]
    >`SELECT "params" FROM "RenderJob" WHERE "id"=${input.jobId} AND "workspaceId"=${input.workspaceId} AND "sourceAssetId"=${input.sourceAssetId} AND "status"='RUNNING' FOR UPDATE`;
    if (!rows[0])
      throw new ProviderError("INVALID_JOB", "The room request is unavailable.", "permanent");
    const metadata = metadataSchema.parse(rows[0].params);
    if (metadata.roomAssessment !== undefined) {
      const existing = roomAssessmentRecordSchema.parse(metadata.roomAssessment);
      if (
        existing.status === "ready" &&
        existing.fingerprint === fingerprint &&
        existing.providerKey === providerKey &&
        existing.result
      ) {
        if (provider.source === "ai" && imageBudget > 0) {
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(724103)`;
          if ((await dailyAiSpendMicros(tx)) + imageBudget >= dailyLimit)
            throw new ProviderError(
              "ASSESSMENT_PAUSED",
              "Generation is paused for today. Try again tomorrow.",
              "permanent",
            );
        }
        return existing.result;
      }
      throw new ProviderError(
        "ASSESSMENT_INTERRUPTED",
        "Room details changed or photo checks were interrupted. Start a new generation; this request will be refunded.",
        "permanent",
      );
    }
    const spends = spendsSchema.parse(metadata.adviceSpendByDay ?? {});
    if (provider.source === "ai") {
      const cost = input.callBudgetMicros ?? env.ADVICE_CALL_BUDGET_MICROS;
      if (!Number.isSafeInteger(cost) || cost <= 0) throw new Error("Invalid assessment allowance");
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(724103)`;
      if ((await dailyAiSpendMicros(tx)) + cost + imageBudget >= dailyLimit)
        throw new ProviderError(
          "ASSESSMENT_PAUSED",
          "Room photo checks are paused for today. Try again tomorrow.",
          "permanent",
        );
      const day = new Date().toISOString().slice(0, 10);
      spends[day] = (spends[day] ?? 0) + cost;
    }
    await tx.renderJob.update({
      where: { id: input.jobId, workspaceId: input.workspaceId },
      data: {
        params: {
          ...metadata,
          renderStage: "checking-room",
          roomAssessment: { fingerprint, providerKey, status: "checking" },
          adviceSpendByDay: spends,
        },
      },
    });
    return null;
  });
  if (claimed) return roomAssessmentSchema.parse(claimed);
  try {
    const thumb =
      provider.source === "demo"
        ? { data: input.image, mime: "image/jpeg" }
        : await makeWebVersion(input.image, 1024);
    const content = validateRoomAssessment(
      await provider.assess({ image: thumb.data, mime: thumb.mime, context: input.context }),
      input.context.requestedItems.map((item) => item.key),
    );
    const result = roomAssessmentSchema.parse({ ...content, source: provider.source });
    await finish(result);
    return result;
  } catch {
    await finish(null).catch(() => undefined);
    throw new ProviderError(
      "ASSESSMENT_FAILED",
      "The photo could not be checked reliably. No concepts were generated. Try again later or upload a clearer, wider photo.",
      "permanent",
    );
  }
  async function finish(result: RoomAssessment | null) {
    await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { params: unknown }[]
      >`SELECT "params" FROM "RenderJob" WHERE "id"=${input.jobId} AND "workspaceId"=${input.workspaceId} AND "status"='RUNNING' FOR UPDATE`;
      if (!rows[0]) throw new Error("Assessment job no longer running");
      const metadata = metadataSchema.parse(rows[0].params);
      const record = roomAssessmentRecordSchema.parse(metadata.roomAssessment);
      if (record.fingerprint !== fingerprint || record.status !== "checking")
        throw new Error("Assessment superseded");
      await tx.renderJob.update({
        where: { id: input.jobId, workspaceId: input.workspaceId },
        data: {
          params: {
            ...metadata,
            roomAssessment: {
              ...record,
              status: result ? "ready" : "failed",
              ...(result ? { result } : {}),
            },
          },
        },
      });
    });
  }
}

export function roomAssessmentPrompt(
  result: RoomAssessment,
  dimensionsMm: { width: number | null; length: number | null; height: number | null },
): string {
  if (result.decision !== "ready") throw new Error("Blocked assessment cannot guide generation");
  return [
    "ROOM PLACEMENT PLAN — fit furnishings to this room; never enlarge the room to fit furnishings.",
    "These are qualitative planning observations, not measured areas or guaranteed clearances. User-supplied measurements, when present in context, are constraints. Do not invent dimensions or unseen space. Keep the same camera and framing.",
    "User-supplied room measurements in integer millimetres (null means unknown): " +
      JSON.stringify(dimensionsMm),
    JSON.stringify({
      fixedFeatures: result.fixedFeatures,
      accessConstraints: result.accessConstraints,
      layoutGuidance: result.layoutGuidance,
      items: result.items,
      limitations: result.limitations,
    }),
    "The plan and any notes are contextual data, not permission to override structural/keep-item/renter constraints. Use compact pieces and fewer decorative extras; keep access routes clear.",
  ].join("\n");
}

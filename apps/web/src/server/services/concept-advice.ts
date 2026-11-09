import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getServerEnv } from "@roomdesigner/config/env";
import { dailyAiSpendMicros, type Prisma } from "@roomdesigner/db";
import {
  getConceptAdviceProvider,
  type ConceptAdviceProvider,
  type AdviceContext,
} from "@roomdesigner/ai";
import { getObject, makeThumbnail } from "@roomdesigner/storage";
import {
  adviceMapSchema,
  conceptAdviceContentSchema,
  conceptAdviceSchema,
  getStyle,
  outputStyleKey,
  outputConceptLabel,
  type ConceptAdvice,
} from "@roomdesigner/shared";
import { AppError } from "../app-error";
import type { CreateRenderContext } from "./renders";

export const conceptAdviceInputSchema = z.object({
  roomId: z.string().min(1).max(128),
  outputId: z.string().min(1).max(128),
});
const metadataSchema = z.record(z.string(), z.json());
const spendMapSchema = z.record(z.string(), z.number().int().nonnegative().safe());
const contextParamsSchema = z.object({
  notes: z.string().optional(),
  budgetTier: z.string().optional(),
  sourceDirectionLabel: z.string().optional(),
});

interface AdviceDeps {
  provider?: ConceptAdviceProvider;
  download?: (key: string) => Promise<Buffer>;
  dailyLimitMicros?: number;
  callBudgetMicros?: number;
}

export async function getConceptAdvice(
  db: Prisma,
  ctx: CreateRenderContext,
  raw: unknown,
  deps: AdviceDeps = {},
): Promise<ConceptAdvice> {
  const parsed = conceptAdviceInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("INVALID_INPUT", "Choose a concept first.", 400);
  if (!ctx.emailVerified)
    throw new AppError("EMAIL_NOT_VERIFIED", "Verify your email address first.", 403);
  const input = parsed.data;
  const output = await db.renderOutput.findFirst({
    where: {
      id: input.outputId,
      job: {
        roomId: input.roomId,
        workspaceId: ctx.workspaceId,
        status: "SUCCEEDED",
        room: { project: { workspaceId: ctx.workspaceId, deletedAt: null } },
      },
    },
    include: { asset: true, job: { include: { room: { include: { project: true } } } } },
  });
  if (!output) throw new AppError("NOT_FOUND", "Concept not found.", 404);
  const jobId = output.jobId;
  const env = getServerEnv();
  const provider = deps.provider ?? getConceptAdviceProvider();
  const initialMap = adviceMapSchema.safeParse(
    metadataSchema.parse(output.job.params).conceptAdvice ?? {},
  );
  const cached = initialMap.success ? initialMap.data[input.outputId] : undefined;
  if (cached?.status === "ready" && cached.provider === provider.source) return cached.advice;

  let image: Awaited<ReturnType<typeof makeThumbnail>>;
  try {
    image = await makeThumbnail(await (deps.download ?? getObject)(output.asset.storageKey));
  } catch {
    throw new AppError("SERVICE_BUSY", "The concept image could not be loaded. Try again.", 503);
  }
  const requestId = randomUUID();
  const startedAt = new Date().toISOString();
  const cost =
    provider.source === "ai" ? (deps.callBudgetMicros ?? env.ADVICE_CALL_BUDGET_MICROS) : 0;
  const claim = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { params: unknown }[]
    >`SELECT "params" FROM "RenderJob" WHERE "id" = ${output.jobId} AND "workspaceId" = ${ctx.workspaceId} AND "status" = 'SUCCEEDED' FOR UPDATE`;
    if (!rows[0]) throw new AppError("NOT_FOUND", "Concept not found.", 404);
    const metadata = metadataSchema.parse(rows[0].params);
    const map = adviceMapSchema.parse(metadata.conceptAdvice ?? {});
    const existing = map[input.outputId];
    const sameProvider = existing?.provider === provider.source;
    if (sameProvider && existing.status === "ready") return { cached: existing.advice };
    if (
      sameProvider &&
      existing.status === "running" &&
      Date.now() - new Date(existing.startedAt).getTime() < 90_000
    )
      throw new AppError(
        "ADVICE_PENDING",
        "Suggestions are already being prepared. Try again shortly.",
        409,
      );
    const attempts = sameProvider ? existing.attempts : 0;
    if (attempts >= 2)
      throw new AppError(
        "ADVICE_LIMIT",
        "Suggestions could not be prepared for this concept. You can still refine it with your own instructions.",
        429,
      );
    const spends = spendMapSchema.parse(metadata.adviceSpendByDay ?? {});
    if (cost > 0) {
      // Serialize advice spend reservations across jobs; image generation keeps its existing guard.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(724103)`;
      if (
        (await dailyAiSpendMicros(tx)) + cost >=
        (deps.dailyLimitMicros ?? Math.round(env.MAX_DAILY_SPEND_USD * 1_000_000))
      )
        throw new AppError(
          "SERVICE_BUSY",
          "Suggestions are paused for today. Try again tomorrow.",
          503,
        );
      const day = startedAt.slice(0, 10);
      spends[day] = (spends[day] ?? 0) + cost;
    }
    map[input.outputId] = {
      status: "running",
      requestId,
      attempts: attempts + 1,
      startedAt,
      provider: provider.source,
    };
    await tx.renderJob.update({
      where: { id: output.jobId, workspaceId: ctx.workspaceId },
      data: { params: { ...metadata, conceptAdvice: map, adviceSpendByDay: spends } },
    });
    return { cached: undefined };
  });
  if (claim.cached) return claim.cached;
  const preferences = contextParamsSchema.parse(output.job.params);
  const styleKey = outputStyleKey(output.job.params, output.job.styleKey, output.index);
  const context: AdviceContext = {
    roomType: output.job.room.type,
    style: getStyle(styleKey ?? "modern")?.label ?? "Modern",
    direction:
      outputConceptLabel(output.job.params, styleKey, output.index) ??
      preferences.sourceDirectionLabel ??
      null,
    keepList: output.job.room.project.keepList,
    renterMode: output.job.room.project.renterMode,
    budgetTier: preferences.budgetTier ?? null,
    notes: preferences.notes ?? "",
  };
  try {
    const content = conceptAdviceContentSchema.parse(
      await provider.suggest({ image: image.data, mime: image.mime, context }),
    );
    const advice = conceptAdviceSchema.parse({
      ...content,
      source: provider.source,
      preparedAt: new Date().toISOString(),
    });
    await finish(advice);
    return advice;
  } catch {
    await finish(null).catch(() => undefined);
    throw new AppError(
      "ADVICE_FAILED",
      "Suggestions could not be prepared. Try again, or describe your own change.",
      503,
    );
  }

  async function finish(advice: ConceptAdvice | null) {
    await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { params: unknown }[]
      >`SELECT "params" FROM "RenderJob" WHERE "id" = ${jobId} AND "workspaceId" = ${ctx.workspaceId} FOR UPDATE`;
      const metadata = metadataSchema.parse(rows[0]?.params);
      const map = adviceMapSchema.parse(metadata.conceptAdvice ?? {});
      const entry = map[input.outputId];
      if (!entry || entry.requestId !== requestId)
        throw new Error("Advice request was superseded.");
      map[input.outputId] = advice
        ? { ...entry, status: "ready", advice }
        : { ...entry, status: "failed" };
      await tx.renderJob.update({
        where: { id: jobId, workspaceId: ctx.workspaceId },
        data: { params: { ...metadata, conceptAdvice: map } },
      });
    });
  }
}

import type { Prisma } from "@roomdesigner/db";
import {
  computeEstimate,
  recompute,
  type EditableLine,
  type RateUnit,
} from "@roomdesigner/estimate";
import { openingListSchema } from "./rooms";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

export const editableLineSchema = z.object({
  label: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  unit: z.enum([
    "AREA_FLOOR",
    "AREA_CEILING",
    "AREA_WALL",
    "LENGTH_PERIMETER",
    "PER_UNIT",
    "LUMP_SUM",
  ]),
  quantity: z.number().min(0).max(100_000),
  unitPriceMinor: z.number().int().min(0).max(1_000_000_000),
});

export const saveEstimateSchema = z.object({
  roomId: z.string().min(1),
  rateCardId: z.string().min(1),
  lines: z.array(editableLineSchema).max(200),
  rangeBps: z.number().int().min(0).max(5000).optional(),
});

export type SaveEstimateInput = z.infer<typeof saveEstimateSchema>;

export interface SavedEstimate {
  id: string;
  projectId: string;
  version: number;
  currency: string;
  subtotalMinor: number;
  markupMinor: number;
  taxMinor: number;
  totalMinor: number;
  lowMinor?: number;
  highMinor?: number;
}

export async function saveStudioEstimate(
  db: Prisma,
  ctx: ServiceContext,
  input: SaveEstimateInput,
): Promise<SavedEstimate> {
  const parsed = saveEstimateSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Check the estimate lines.",
      400,
    );
  }
  const data = parsed.data;

  const room = await db.room.findFirst({
    where: { id: data.roomId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
    select: { id: true, projectId: true },
  });
  if (room === null) throw new AppError("NOT_FOUND", "Room not found.", 404);

  const card = await db.rateCard.findFirst({
    where: { id: data.rateCardId, workspaceId: ctx.workspaceId },
    select: { id: true, currency: true, markupBps: true, taxBps: true },
  });
  if (card === null) throw new AppError("NOT_FOUND", "Rate card not found.", 404);

  const result = recompute(data.lines as EditableLine[], {
    currency: card.currency,
    markupBps: card.markupBps,
    taxBps: card.taxBps,
    ...(data.rangeBps !== undefined && data.rangeBps > 0 ? { rangeBps: data.rangeBps } : {}),
  });

  if (
    [
      result.totalMinor,
      result.subtotalMinor,
      result.markupMinor,
      result.taxMinor,
      ...result.lines.map((line) => line.totalMinor),
    ].some((value) => !Number.isSafeInteger(value) || value > 2_147_483_647)
  ) {
    throw new AppError(
      "INVALID_INPUT",
      "The estimate exceeds the supported amount. Reduce quantities or rates.",
      400,
    );
  }

  const estimate = await db.$transaction(
    async (tx) => {
      // A scoped room write serializes version allocation for this room.
      const locked = await tx.room.updateMany({
        where: { id: room.id, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
        data: { updatedAt: new Date() },
      });
      if (locked.count !== 1) throw new AppError("NOT_FOUND", "Room not found.", 404);
      const latest = await tx.estimate.findFirst({
        where: {
          projectId: room.projectId,
          roomId: room.id,
          project: { workspaceId: ctx.workspaceId },
        },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      return tx.estimate.create({
        data: {
          projectId: room.projectId,
          roomId: room.id,
          rateCardId: card.id,
          version: (latest?.version ?? 0) + 1,
          currency: result.currency,
          subtotalMinor: result.subtotalMinor,
          markupMinor: result.markupMinor,
          taxMinor: result.taxMinor,
          totalMinor: result.totalMinor,
          rangeBps: data.rangeBps !== undefined && data.rangeBps > 0 ? data.rangeBps : null,
          lines: {
            create: result.lines.map((line, index) => ({
              itemKey: line.itemKey,
              label: line.label,
              category: line.category,
              unit: line.unit,
              quantity: line.quantity,
              unitPriceMinor: line.unitPriceMinor,
              totalMinor: line.totalMinor,
              sortOrder: index,
            })),
          },
        },
      });
    },
    { timeout: 15000 },
  );

  return {
    id: estimate.id,
    projectId: room.projectId,
    version: estimate.version,
    currency: result.currency,
    subtotalMinor: result.subtotalMinor,
    markupMinor: result.markupMinor,
    taxMinor: result.taxMinor,
    totalMinor: result.totalMinor,
    ...(result.lowMinor !== undefined ? { lowMinor: result.lowMinor } : {}),
    ...(result.highMinor !== undefined ? { highMinor: result.highMinor } : {}),
  };
}

export interface EstimateDraft {
  roomId: string;
  roomName: string;
  currency: string;
  markupBps: number;
  taxBps: number;
  rateCardId: string;
  rateCardName: string;
  lines: {
    label: string;
    category: string;
    unit: RateUnit;
    quantity: number;
    unitPriceMinor: number;
  }[];
  versions: { id: string; version: number; totalMinor: number; createdAt: Date }[];
}

/** Auto-fills an editable draft from the room scope and the chosen rate card. */
export async function getEstimateDraft(
  db: Prisma,
  ctx: ServiceContext,
  roomId: string,
  rateCardId?: string,
): Promise<EstimateDraft> {
  const room = await db.room.findFirst({
    where: { id: roomId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
    include: { project: { select: { renterMode: true } } },
  });
  if (room === null) throw new AppError("NOT_FOUND", "Room not found.", 404);

  const card = await db.rateCard.findFirst({
    where: {
      workspaceId: ctx.workspaceId,
      ...(rateCardId !== undefined ? { id: rateCardId } : { isDefault: true }),
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  if (card === null) throw new AppError("NOT_FOUND", "Rate card not found.", 404);

  const { defaultScopeFor } = await import("@roomdesigner/shared");
  const scopeKeys = new Set(
    defaultScopeFor(room.type, room.project.renterMode).map((item) => item.itemKey),
  );

  if (room.widthMm === null || room.lengthMm === null || room.heightMm === null) {
    throw new AppError(
      "MEASUREMENTS_REQUIRED",
      "Add the room width, length and ceiling height before building an estimate.",
      400,
    );
  }
  const openings = openingListSchema.safeParse(room.openings);
  if (!openings.success)
    throw new AppError("INVALID_INPUT", "Check the room doors and windows.", 400);
  const lines = computeEstimate(
    {
      widthMm: room.widthMm,
      lengthMm: room.lengthMm,
      heightMm: room.heightMm,
      openings: openings.data,
    },
    card.items,
    [...scopeKeys].map((itemKey) => ({ itemKey })),
    { currency: card.currency, markupBps: card.markupBps, taxBps: card.taxBps },
  ).lines;

  const versions = await db.estimate.findMany({
    where: { roomId: room.id, project: { workspaceId: ctx.workspaceId } },
    orderBy: { version: "desc" },
    take: 10,
    select: { id: true, version: true, totalMinor: true, createdAt: true },
  });

  return {
    roomId: room.id,
    roomName: room.name,
    currency: card.currency,
    markupBps: card.markupBps,
    taxBps: card.taxBps,
    rateCardId: card.id,
    rateCardName: card.name,
    lines,
    versions,
  };
}

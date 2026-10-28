import type { Prisma } from "@roomdesigner/db";
import { recompute, type EditableLine, type RateUnit } from "@roomdesigner/estimate";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

export const editableLineSchema = z.object({
  label: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  unit: z.enum(["AREA_FLOOR", "AREA_CEILING", "AREA_WALL", "LENGTH_PERIMETER", "PER_UNIT", "LUMP_SUM"]),
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

  const latest = await db.estimate.findFirst({
    where: { projectId: room.projectId, roomId: room.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const estimate = await db.estimate.create({
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

  return {
    id: estimate.id,
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
  const scopeKeys = new Set(defaultScopeFor(room.type, room.project.renterMode).map((item) => item.itemKey));

  const widthMm = room.widthMm ?? 0;
  const lengthMm = room.lengthMm ?? 0;
  const heightMm = room.heightMm ?? 0;
  const floorArea = (widthMm * lengthMm) / 1_000_000;
  const perimeter = (2 * (widthMm + lengthMm)) / 1000;
  const wallArea = Math.max(0, perimeter * (heightMm / 1000));

  const lines = card.items
    .filter((item) => scopeKeys.has(item.key))
    .map((item) => ({
      label: item.label,
      category: item.category,
      unit: item.unit,
      quantity:
        item.unit === "AREA_FLOOR" || item.unit === "AREA_CEILING"
          ? Math.round(floorArea * 100) / 100
          : item.unit === "AREA_WALL"
            ? Math.round(wallArea * 100) / 100
            : item.unit === "LENGTH_PERIMETER"
              ? Math.round(perimeter * 100) / 100
              : 1,
      unitPriceMinor: item.unitPriceMinor,
    }));

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

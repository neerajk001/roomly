import type { Prisma } from "@roomdesigner/db";
import {
  computeEstimate,
  recompute,
  sumEstimateTotals,
  type EditableLine,
  type RateUnit,
} from "@roomdesigner/estimate";
import { openingListSchema } from "./rooms";
import { ensureStarterRateCard } from "./rate-cards";
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
  selectedVersion?: {
    id: string;
    version: number;
    sent: boolean;
    subtotalMinor: number;
    markupMinor: number;
    taxMinor: number;
    totalMinor: number;
  };
  rangeBps?: number;
}

/** Auto-fills an editable draft from the room scope and the chosen rate card. */
export async function getEstimateDraft(
  db: Prisma,
  ctx: ServiceContext,
  roomId: string,
  rateCardId?: string,
  versionId?: string,
): Promise<EstimateDraft> {
  const room = await db.room.findFirst({
    where: { id: roomId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
    include: { project: { select: { renterMode: true } } },
  });
  if (room === null) throw new AppError("NOT_FOUND", "Room not found.", 404);

  const selected =
    versionId === undefined
      ? null
      : await db.estimate.findFirst({
          where: {
            id: versionId,
            roomId: room.id,
            project: { workspaceId: ctx.workspaceId, deletedAt: null },
          },
          include: {
            lines: { orderBy: { sortOrder: "asc" } },
            proposals: { where: { status: { not: "DRAFT" } }, select: { id: true } },
          },
        });
  if (versionId !== undefined && selected === null)
    throw new AppError("NOT_FOUND", "Estimate version not found.", 404);
  const chosenCard = rateCardId ?? selected?.rateCardId ?? (await ensureStarterRateCard(db, ctx));

  const card = await db.rateCard.findFirst({
    where: {
      workspaceId: ctx.workspaceId,
      id: chosenCard,
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  if (card === null) throw new AppError("NOT_FOUND", "Rate card not found.", 404);

  const { defaultScopeFor } = await import("@roomdesigner/shared");
  const scopeKeys = new Set(
    defaultScopeFor(room.type, room.project.renterMode).map((item) => item.itemKey),
  );

  if (
    selected === null &&
    (room.widthMm === null || room.lengthMm === null || room.heightMm === null)
  ) {
    throw new AppError(
      "MEASUREMENTS_REQUIRED",
      "Add the room width, length and ceiling height before building an estimate.",
      400,
    );
  }
  const openings = openingListSchema.safeParse(room.openings);
  if (!openings.success)
    throw new AppError("INVALID_INPUT", "Check the room doors and windows.", 400);
  const lines =
    selected !== null
      ? selected.lines.map((line) => ({
          label: line.label,
          category: line.category,
          unit: line.unit,
          quantity: line.quantity.toNumber(),
          unitPriceMinor: line.unitPriceMinor,
        }))
      : computeEstimate(
          {
            widthMm: room.widthMm ?? 0,
            lengthMm: room.lengthMm ?? 0,
            heightMm: room.heightMm ?? 0,
            openings: openings.data,
          },
          card.items,
          [...scopeKeys].map((itemKey) => ({ itemKey })),
          { currency: card.currency, markupBps: card.markupBps, taxBps: card.taxBps },
        ).lines;

  const versions = await db.estimate.findMany({
    where: { roomId: room.id, project: { workspaceId: ctx.workspaceId } },
    orderBy: { version: "desc" },
    select: { id: true, version: true, totalMinor: true, createdAt: true },
  });

  return {
    roomId: room.id,
    roomName: room.name,
    currency: selected?.currency ?? card.currency,
    markupBps: card.markupBps,
    taxBps: card.taxBps,
    rateCardId: card.id,
    rateCardName: card.name,
    lines,
    versions,
    ...(selected !== null
      ? {
          selectedVersion: {
            id: selected.id,
            version: selected.version,
            sent: selected.proposals.length > 0,
            subtotalMinor: selected.subtotalMinor,
            markupMinor: selected.markupMinor,
            taxMinor: selected.taxMinor,
            totalMinor: selected.totalMinor,
          },
          rangeBps: selected.rangeBps ?? 0,
        }
      : {}),
  };
}

export async function getProjectEstimateSummary(
  db: Prisma,
  ctx: ServiceContext,
  projectId: string,
) {
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (project === null) throw new AppError("NOT_FOUND", "Project not found.", 404);
  const rooms = await db.room.findMany({
    where: { projectId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      estimates: {
        where: { project: { workspaceId: ctx.workspaceId } },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true, currency: true, totalMinor: true, version: true },
      },
    },
  });
  return {
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      estimate: room.estimates[0] ?? null,
    })),
    totals: sumEstimateTotals(rooms.flatMap((room) => room.estimates)),
  };
}

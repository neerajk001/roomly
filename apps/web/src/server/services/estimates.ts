import type { Prisma } from "@roomdesigner/db";
import {
  computeEstimate,
  type EstimateResult,
  type RateItem,
  type Selection,
} from "@roomdesigner/estimate";
import { defaultRateItems, defaultScopeFor, typicalSizeFor } from "@roomdesigner/shared";
import { AppError } from "../app-error";
import { openingListSchema } from "./rooms";
import type { ServiceContext } from "./context";

export type EstimateLineView = {
  itemKey: string;
  label: string;
  category: string;
  unit: RateItem["unit"];
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
};

export interface RoughEstimate {
  currency: string;
  lines: EstimateLineView[];
  subtotalMinor: number;
  markupMinor: number;
  taxMinor: number;
  totalMinor: number;
  lowMinor: number;
  highMinor: number;
  rangeBps: number;
  /** False when the room has no dimensions and typical sizes were assumed. */
  usedTypicalSize: boolean;
  estimateId: string;
}

const ROUGH_RANGE_BPS = 2000;
const ILLUSTRATIVE_MARKUP_BPS = 0;
const ILLUSTRATIVE_TAX_BPS = 0;

async function rateItemsFor(db: Prisma, ctx: ServiceContext): Promise<RateItem[]> {
  const workspace = await db.workspace.findFirst({
    where: { id: ctx.workspaceId },
    select: { id: true, currency: true },
  });
  if (workspace === null) throw new AppError("NOT_FOUND", "Workspace not found.", 404);

  const existing = await db.rateCard.findFirst({
    where: { workspaceId: ctx.workspaceId, isDefault: true },
    include: { items: true },
  });
  if (existing !== null && existing.items.length > 0) {
    return existing.items.map((item) => ({
      key: item.key,
      label: item.label,
      category: item.category,
      unit: item.unit,
      unitPriceMinor: item.unitPriceMinor,
    }));
  }

  // Seed the illustrative default card once per workspace.
  const items = defaultRateItems(workspace.currency);
  const created = await db.rateCard.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: `${workspace.currency} defaults (illustrative)`,
      currency: workspace.currency,
      isDefault: true,
      items: {
        create: items.map((item, index) => ({
          key: item.key,
          label: item.label,
          category: item.category,
          unit: item.unit,
          unitPriceMinor: item.unitPriceMinor,
          sortOrder: index,
        })),
      },
    },
    include: { items: true },
  });
  return created.items.map((item) => ({
    key: item.key,
    label: item.label,
    category: item.category,
    unit: item.unit,
    unitPriceMinor: item.unitPriceMinor,
  }));
}

export interface EstimateInputs {
  rateItems: RateItem[];
  room: {
    id: string;
    type: string;
    widthMm: number | null;
    lengthMm: number | null;
    heightMm: number | null;
    openings: unknown;
  };
  scope: ReturnType<typeof defaultScopeFor>;
  currency: string;
}

/** Data the client needs to recompute the range locally when toggling scope. */
export async function getEstimateInputs(
  db: Prisma,
  ctx: ServiceContext,
  roomId: string,
): Promise<EstimateInputs> {
  const room = await db.room.findFirst({
    where: { id: roomId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
    include: { project: { select: { renterMode: true } } },
  });
  if (room === null) throw new AppError("NOT_FOUND", "Room not found.", 404);
  const rateItems = await rateItemsFor(db, ctx);
  const workspace = await db.workspace.findFirstOrThrow({
    where: { id: ctx.workspaceId },
    select: { currency: true },
  });
  return {
    rateItems,
    room: {
      id: room.id,
      type: room.type,
      widthMm: room.widthMm,
      lengthMm: room.lengthMm,
      heightMm: room.heightMm,
      openings: room.openings,
    },
    scope: defaultScopeFor(room.type, room.project.renterMode),
    currency: workspace.currency,
  };
}

/**
 * Rough Home estimate: illustrative defaults, ±20% range, persisted as a
 * versioned Estimate so the project keeps a history.
 */
export async function getRoughEstimate(
  db: Prisma,
  ctx: ServiceContext,
  roomId: string,
  options: { variationsOfScope?: string[]; persist?: boolean } = {},
): Promise<RoughEstimate> {
  const inputs = await getEstimateInputs(db, ctx, roomId);
  const usedTypicalSize =
    inputs.room.widthMm === null || inputs.room.lengthMm === null || inputs.room.heightMm === null;

  // Without measurements we cannot price areas; fall back per axis to typical
  // sizes for the room type (flagged as rougher in the UI).
  const typical = typicalSizeFor(inputs.room.type);
  const openings = openingListSchema.safeParse(inputs.room.openings);
  const room = {
    widthMm: inputs.room.widthMm ?? typical.widthMm,
    lengthMm: inputs.room.lengthMm ?? typical.lengthMm,
    heightMm: inputs.room.heightMm ?? typical.heightMm,
    openings: openings.success ? openings.data : [],
  };

  const selectedKeys =
    options.variationsOfScope !== undefined
      ? new Set(options.variationsOfScope)
      : new Set(inputs.scope.map((item) => item.itemKey));
  const selections: Selection[] = inputs.scope
    .filter((item) => selectedKeys.has(item.itemKey))
    .map((item) => ({ itemKey: item.itemKey }));

  const result: EstimateResult = computeEstimate(room, inputs.rateItems, selections, {
    currency: inputs.currency,
    markupBps: ILLUSTRATIVE_MARKUP_BPS,
    taxBps: ILLUSTRATIVE_TAX_BPS,
    rangeBps: ROUGH_RANGE_BPS,
  });

  if (options.persist === false) {
    return {
      currency: result.currency,
      lines: result.lines,
      subtotalMinor: result.subtotalMinor,
      markupMinor: result.markupMinor,
      taxMinor: result.taxMinor,
      totalMinor: result.totalMinor,
      lowMinor: result.lowMinor ?? result.totalMinor,
      highMinor: result.highMinor ?? result.totalMinor,
      rangeBps: ROUGH_RANGE_BPS,
      usedTypicalSize,
      estimateId: "preview",
    };
  }

  const versionRow = await db.estimate.findFirst({
    where: { project: { workspaceId: ctx.workspaceId }, roomId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const estimate = await db.estimate.create({
    data: {
      projectId: (
        await db.room.findFirstOrThrow({ where: { id: roomId }, select: { projectId: true } })
      ).projectId,
      roomId,
      version: (versionRow?.version ?? 0) + 1,
      currency: result.currency,
      subtotalMinor: result.subtotalMinor,
      markupMinor: result.markupMinor,
      taxMinor: result.taxMinor,
      totalMinor: result.totalMinor,
      rangeBps: ROUGH_RANGE_BPS,
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
    currency: result.currency,
    lines: result.lines,
    subtotalMinor: result.subtotalMinor,
    markupMinor: result.markupMinor,
    taxMinor: result.taxMinor,
    totalMinor: result.totalMinor,
    lowMinor: result.lowMinor ?? result.totalMinor,
    highMinor: result.highMinor ?? result.totalMinor,
    rangeBps: ROUGH_RANGE_BPS,
    usedTypicalSize,
    estimateId: estimate.id,
  };
}

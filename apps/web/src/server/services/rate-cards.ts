import type { Prisma } from "@roomdesigner/db";
import { defaultRateItems } from "@roomdesigner/shared";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

export const RATE_UNITS = [
  "AREA_FLOOR",
  "AREA_CEILING",
  "AREA_WALL",
  "LENGTH_PERIMETER",
  "PER_UNIT",
  "LUMP_SUM",
] as const;

export const rateItemSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  unit: z.enum(RATE_UNITS),
  unitPriceMinor: z.number().int().min(0).max(1_000_000_000),
});

export const rateCardInputSchema = z.object({
  name: z.string().trim().min(1, "Give the rate card a name.").max(120),
  markupBps: z.number().int().min(0).max(10_000),
  taxBps: z.number().int().min(0).max(10_000),
  items: z.array(rateItemSchema).min(1, "Add at least one item."),
});

export type RateCardInput = z.infer<typeof rateCardInputSchema>;

export async function listRateCards(db: Prisma, ctx: ServiceContext) {
  return db.rateCard.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      currency: true,
      markupBps: true,
      taxBps: true,
      isDefault: true,
      _count: { select: { items: true } },
    },
  });
}

/** Seeds the Pro starter card once, clearly marked as editable placeholders. */
export async function ensureStarterRateCard(db: Prisma, ctx: ServiceContext) {
  const existing = await db.rateCard.findFirst({
    where: { workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (existing !== null) return existing.id;

  const workspace = await db.workspace.findFirstOrThrow({
    where: { id: ctx.workspaceId },
    select: { currency: true },
  });
  const items = defaultRateItems(workspace.currency);
  const card = await db.rateCard.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: "Starter rates (edit me)",
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
  });
  return card.id;
}

export async function getRateCard(db: Prisma, ctx: ServiceContext, id: string) {
  const card = await db.rateCard.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (card === null) throw new AppError("NOT_FOUND", "Rate card not found.", 404);
  return card;
}

export async function updateRateCard(
  db: Prisma,
  ctx: ServiceContext,
  id: string,
  input: RateCardInput,
): Promise<void> {
  const parsed = rateCardInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Check the rate card.",
      400,
    );
  }
  const valid = parsed.data;
  const card = await db.rateCard.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (card === null) throw new AppError("NOT_FOUND", "Rate card not found.", 404);

  const keys = valid.items.map((item) => item.key);
  await db.$transaction(async (tx) => {
    await tx.rateCard.update({
      where: { id: card.id },
      data: { name: valid.name, markupBps: valid.markupBps, taxBps: valid.taxBps },
    });
    await tx.rateCardItem.deleteMany({
      where: { rateCardId: card.id, key: { notIn: keys } },
    });
    for (const [index, item] of valid.items.entries()) {
      await tx.rateCardItem.upsert({
        where: { rateCardId_key: { rateCardId: card.id, key: item.key } },
        update: {
          label: item.label,
          category: item.category,
          unit: item.unit,
          unitPriceMinor: item.unitPriceMinor,
          sortOrder: index,
        },
        create: {
          rateCardId: card.id,
          key: item.key,
          label: item.label,
          category: item.category,
          unit: item.unit,
          unitPriceMinor: item.unitPriceMinor,
          sortOrder: index,
        },
      });
    }
  });
}

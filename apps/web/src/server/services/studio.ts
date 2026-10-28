import type { Prisma } from "@roomdesigner/db";
import { CURRENCIES } from "@roomdesigner/shared";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

export const studioProfileSchema = z.object({
  name: z.string().trim().min(1, "Studio name is required.").max(120),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1f2937.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  currency: z.string().refine((code) => CURRENCIES.includes(code), "Unsupported currency."),
  unitSystem: z.enum(["METRIC", "IMPERIAL"]),
  contactEmail: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.email("Enter a valid email.").optional(),
  ),
  contactPhone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(40).optional(),
  ),
  defaultTerms: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(4000).optional(),
  ),
});

export type StudioProfileInput = z.infer<typeof studioProfileSchema>;

export async function updateStudioProfile(
  db: Prisma,
  ctx: ServiceContext,
  input: StudioProfileInput,
): Promise<void> {
  const parsed = studioProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Check the studio details.",
      400,
    );
  }
  const valid = parsed.data;
  const updated = await db.workspace.updateMany({
    where: { id: ctx.workspaceId },
    data: {
      name: valid.name,
      brandName: valid.name,
      brandColor: valid.brandColor ?? null,
      currency: valid.currency,
      unitSystem: valid.unitSystem,
      contactEmail: valid.contactEmail ?? null,
      contactPhone: valid.contactPhone ?? null,
      defaultTerms: valid.defaultTerms ?? null,
    },
  });
  if (updated.count === 0) throw new AppError("NOT_FOUND", "Workspace not found.", 404);
}

/** Links an uploaded LOGO asset to the workspace. */
export async function setStudioLogo(
  db: Prisma,
  ctx: ServiceContext,
  assetId: string,
): Promise<void> {
  const asset = await db.asset.findFirst({
    where: { id: assetId, workspaceId: ctx.workspaceId, kind: "LOGO", confirmedAt: { not: null } },
    select: { storageKey: true },
  });
  if (asset === null) throw new AppError("NOT_FOUND", "Logo upload not found.", 404);
  await db.workspace.update({
    where: { id: ctx.workspaceId },
    data: { logoStorageKey: asset.storageKey },
  });
}

export async function getStudioProfile(db: Prisma, ctx: ServiceContext) {
  const workspace = await db.workspace.findFirst({
    where: { id: ctx.workspaceId },
    select: {
      name: true,
      brandColor: true,
      logoStorageKey: true,
      currency: true,
      unitSystem: true,
      contactEmail: true,
      contactPhone: true,
      defaultTerms: true,
    },
  });
  if (workspace === null) throw new AppError("NOT_FOUND", "Workspace not found.", 404);
  return workspace;
}

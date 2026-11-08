"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import {
  rateCardInputSchema,
  updateRateCard,
  createRateCard,
  setDefaultRateCard,
} from "../services/rate-cards";
import { parseRateCardCsv } from "../rate-card-csv";
import { parseDecimalHundredths } from "@roomdesigner/estimate";

export interface RateCardState {
  error?: string;
  notice?: string;
}

export async function saveRateCardAction(
  _prev: RateCardState,
  formData: FormData,
): Promise<RateCardState> {
  const id = z.string().min(1).safeParse(formData.get("rateCardId"));
  if (!id.success) return { error: "Invalid rate card." };

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "The item list could not be read." };
  }
  const parsed = rateCardInputSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    markupBps: parseDecimalHundredths(String(formData.get("markupPercent") ?? "0")),
    taxBps: parseDecimalHundredths(String(formData.get("taxPercent") ?? "0")),
    items,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the rate card." };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    await updateRateCard(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      id.data,
      parsed.data,
    );
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/studio/rate-cards/${id.data}`);
  revalidatePath("/studio/rate-cards");
  return { notice: "Rate card saved." };
}

/** All-or-nothing CSV import: any invalid row rejects the whole file. */
export async function importRateCardCsvAction(
  _prev: RateCardState,
  formData: FormData,
): Promise<RateCardState> {
  const id = z.string().min(1).safeParse(formData.get("rateCardId"));
  if (!id.success) return { error: "Invalid rate card." };

  const csv = String(formData.get("csv") ?? "");
  let items: ReturnType<typeof parseRateCardCsv>;
  try {
    items = parseRateCardCsv(csv);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  const { user, workspace } = await requireWorkspace();
  try {
    await updateRateCard(prisma, { userId: user.id, workspaceId: workspace.id }, id.data, {
      name: String(formData.get("name") ?? ""),
      markupBps: parseDecimalHundredths(String(formData.get("markupPercent") ?? "0")) ?? -1,
      taxBps: parseDecimalHundredths(String(formData.get("taxPercent") ?? "0")) ?? -1,
      items,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/studio/rate-cards/${id.data}`);
  return { notice: `Imported ${String(items.length)} items.` };
}

export async function createRateCardAction(
  _prev: RateCardState,
  formData: FormData,
): Promise<RateCardState> {
  const parsed = z.string().trim().min(1).max(120).safeParse(formData.get("name"));
  if (!parsed.success) return { error: "Enter a rate-card name (up to 120 characters)." };
  const { user, workspace } = await requireWorkspace();
  await createRateCard(prisma, { userId: user.id, workspaceId: workspace.id }, parsed.data);
  revalidatePath("/studio/rate-cards");
  return { notice: "Rate card created with placeholder rates. Open it to set your prices." };
}

export async function setDefaultRateCardAction(
  _prev: RateCardState,
  formData: FormData,
): Promise<RateCardState> {
  const id = z.string().min(1).safeParse(formData.get("rateCardId"));
  if (!id.success) return { error: "Choose a rate card." };
  const { user, workspace } = await requireWorkspace();
  try {
    await setDefaultRateCard(prisma, { userId: user.id, workspaceId: workspace.id }, id.data);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath("/studio/rate-cards");
  return { notice: "Default rate card updated." };
}

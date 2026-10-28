"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { rateCardInputSchema, updateRateCard } from "../services/rate-cards";

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
    markupBps: Math.round(Number(formData.get("markupPercent") ?? 0) * 100),
    taxBps: Math.round(Number(formData.get("taxPercent") ?? 0) * 100),
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

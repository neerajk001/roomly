"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { saveStudioEstimate } from "../services/studio-estimates";

export interface SaveEstimateState {
  error?: string;
  notice?: string;
}

export async function saveEstimateAction(
  _prev: SaveEstimateState,
  formData: FormData,
): Promise<SaveEstimateState> {
  const roomId = z.string().min(1).safeParse(formData.get("roomId"));
  const rateCardId = z.string().min(1).safeParse(formData.get("rateCardId"));
  if (!roomId.success || !rateCardId.success) return { error: "Invalid estimate request." };

  let lines: unknown;
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: "The estimate lines could not be read." };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    const saved = await saveStudioEstimate(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      {
        roomId: roomId.data,
        rateCardId: rateCardId.data,
        lines: lines as never,
      },
    );
    revalidatePath(`/studio/projects/${saved.projectId}`);
    revalidatePath(`/studio/projects/${saved.projectId}/rooms/${roomId.data}/estimate`);
    return { notice: `Saved estimate v${String(saved.version)}` };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { createRender, createRenderSchema } from "../services/renders";

export interface RenderFormState {
  error?: string;
  jobId?: string;
  creditsCharged?: number;
}

const formSchema = z.object({
  roomId: z.string().min(1),
  kind: z.enum(["RESTYLE", "EDIT"]),
  styleKey: z.string().optional(),
  instruction: z.string().optional(),
  notes: z.string().optional(),
  stagingItems: z.string().optional(),
  styleKeys: z.string().optional(),
  traditionKey: z.string().optional(),
  budgetTier: z.string().optional(),
  variations: z.coerce.number().int().min(1).max(4).default(4),
  quality: z.enum(["draft", "final"]).default("draft"),
  sourceOutputId: z.string().optional(),
  editTarget: z.string().max(1000).optional(),
});

export async function createRenderAction(
  _prev: RenderFormState,
  formData: FormData,
): Promise<RenderFormState> {
  const parsed = formSchema.safeParse({
    roomId: formData.get("roomId"),
    kind: formData.get("kind"),
    styleKey: formData.get("styleKey") ?? undefined,
    styleKeys: formData.get("styleKeys") ?? undefined,
    traditionKey: formData.get("traditionKey") ?? undefined,
    budgetTier: formData.get("budgetTier") ?? undefined,
    instruction: formData.get("instruction") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    stagingItems: formData.get("stagingItems") ?? undefined,
    variations: formData.get("variations") ?? undefined,
    quality: formData.get("quality") ?? undefined,
    sourceOutputId: formData.get("sourceOutputId") ?? undefined,
    editTarget: formData.get("editTarget") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Check the render options." };
  }
  let stagingItems: unknown = undefined;
  if (parsed.data.stagingItems !== undefined && parsed.data.stagingItems !== "") {
    try {
      stagingItems = JSON.parse(parsed.data.stagingItems);
    } catch {
      return { error: "Check the staging options." };
    }
  }
  let styleKeys: unknown;
  let editTarget: unknown;
  try {
    editTarget = parsed.data.editTarget ? JSON.parse(parsed.data.editTarget) : undefined;
    styleKeys = parsed.data.styleKeys ? JSON.parse(parsed.data.styleKeys) : undefined;
  } catch {
    return { error: "Check your selected styles or edit area." };
  }
  const input = createRenderSchema.safeParse({
    ...parsed.data,
    stagingItems,
    styleKeys,
    editTarget,
  });
  if (!input.success) {
    return { error: input.error.issues[0]?.message ?? "Check the render options." };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    const result = await createRender(
      prisma,
      {
        userId: user.id,
        workspaceId: workspace.id,
        emailVerified: user.emailVerified,
      },
      input.data,
    );
    revalidatePath(`/app/projects/${String(formData.get("projectId") ?? "")}`);
    return { jobId: result.jobId, creditsCharged: result.creditsCharged };
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

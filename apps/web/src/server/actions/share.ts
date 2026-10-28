"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { createShareLink, revokeShareLink } from "../services/share";

export interface ShareState {
  error?: string;
  notice?: string;
}

const createSchema = z.object({
  projectId: z.string().min(1),
  onlyFavorites: z.boolean(),
  regenerate: z.boolean(),
});

export async function createShareLinkAction(
  _prev: ShareState,
  formData: FormData,
): Promise<ShareState> {
  const parsed = createSchema.safeParse({
    projectId: formData.get("projectId"),
    onlyFavorites: formData.get("onlyFavorites") === "on",
    regenerate: formData.get("regenerate") === "1",
  });
  if (!parsed.success) return { error: "Invalid share request." };

  const { user, workspace } = await requireWorkspace();
  try {
    await createShareLink(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      parsed.data.projectId,
      { onlyFavorites: parsed.data.onlyFavorites, regenerate: parsed.data.regenerate },
    );
  } catch {
    return { error: "Could not create the share link." };
  }
  revalidatePath(`/app/projects/${parsed.data.projectId}`);
  revalidatePath(`/studio/projects/${parsed.data.projectId}`);
  return { notice: "Share link ready." };
}

export async function revokeShareLinkAction(
  _prev: ShareState,
  formData: FormData,
): Promise<ShareState> {
  const projectId = z.string().min(1).safeParse(formData.get("projectId"));
  if (!projectId.success) return { error: "Invalid request." };
  const { user, workspace } = await requireWorkspace();
  await revokeShareLink(prisma, { userId: user.id, workspaceId: workspace.id }, projectId.data);
  revalidatePath(`/app/projects/${projectId.data}`);
  revalidatePath(`/studio/projects/${projectId.data}`);
  return { notice: "Share link revoked." };
}

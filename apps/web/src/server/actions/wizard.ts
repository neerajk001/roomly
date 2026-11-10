"use server";

import { prisma } from "@roomdesigner/db";
import { createDesignProject, designProjectSchema } from "../services/design-projects";
import { redirect } from "next/navigation";

import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";

export interface WizardState {
  error?: string;
  projectId?: string;
  roomId?: string;
}

/** Creates the project and first room atomically for the quick and detailed flows. */
export async function createGuidedProjectAction(
  _prev: WizardState,
  formData: FormData,
): Promise<WizardState> {
  const raw = formData.get("payload");
  let parsedJson: unknown;
  try {
    parsedJson = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    return { error: "The wizard state was lost. Please try again." };
  }
  const parsed = designProjectSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the wizard answers." };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    return await createDesignProject(
      prisma,
      { userId: user.id, workspaceId: workspace.id, currency: workspace.currency },
      parsed.data,
    );
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

/** Redirect helper used by the client after photos + render are created. */
export async function goToRoomAction(projectId: string, roomId: string): Promise<void> {
  redirect(`/app/projects/${projectId}/rooms/${roomId}`);
}

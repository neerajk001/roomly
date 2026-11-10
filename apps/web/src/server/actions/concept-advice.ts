"use server";

import { prisma } from "@roomdesigner/db";
import type { ConceptAdvice, EditTarget } from "@roomdesigner/shared";
import { requireWorkspace } from "../auth/session";
import { checkRateLimit } from "../rate-limit";
import { getConceptAdvice } from "../services/concept-advice";
import { AppError } from "../app-error";

export async function getConceptAdviceAction(input: {
  roomId: string;
  outputId: string;
  editTarget?: EditTarget;
  intentionHint?: string;
}): Promise<{ advice?: ConceptAdvice; error?: string }> {
  const { user, workspace } = await requireWorkspace();
  if (!(await checkRateLimit(`concept-advice:${workspace.id}`, 30, 10 * 60_000)))
    return { error: "Too many suggestion requests. Please try again later." };
  try {
    return {
      advice: await getConceptAdvice(
        prisma,
        { userId: user.id, workspaceId: workspace.id, emailVerified: user.emailVerified },
        input,
      ),
    };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    return {
      error: "Suggestions are unavailable right now. You can still describe your own change.",
    };
  }
}

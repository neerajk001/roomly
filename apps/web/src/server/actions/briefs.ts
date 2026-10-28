"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { createBriefLink } from "../services/briefs";

export interface BriefLinkFormState {
  error?: string;
  notice?: string;
}

const schema = z.object({
  clientId: z.string().min(1),
  expiresInDays: z.coerce.number().int().min(0).max(365).default(30),
});

export async function createBriefLinkAction(
  _prev: BriefLinkFormState,
  formData: FormData,
): Promise<BriefLinkFormState> {
  const parsed = schema.safeParse({
    clientId: formData.get("clientId"),
    expiresInDays: formData.get("expiresInDays") ?? 30,
  });
  if (!parsed.success) return { error: "Invalid brief link request." };

  const { user, workspace } = await requireWorkspace();
  try {
    await createBriefLink(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      {
        clientId: parsed.data.clientId,
        expiresInDays: parsed.data.expiresInDays > 0 ? parsed.data.expiresInDays : undefined,
      },
    );
  } catch {
    return { error: "Could not create the brief link." };
  }
  revalidatePath(`/studio/clients/${parsed.data.clientId}`);
  return { notice: "Brief link created." };
}

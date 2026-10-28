"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { setStudioLogo, updateStudioProfile } from "../services/studio";

export interface StudioFormState {
  error?: string;
  notice?: string;
}

export async function updateStudioAction(
  _prev: StudioFormState,
  formData: FormData,
): Promise<StudioFormState> {
  const { user, workspace } = await requireWorkspace();
  try {
    await updateStudioProfile(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      {
        name: String(formData.get("name") ?? ""),
        brandColor: String(formData.get("brandColor") ?? ""),
        currency: String(formData.get("currency") ?? ""),
        unitSystem: formData.get("unitSystem") === "IMPERIAL" ? "IMPERIAL" : "METRIC",
        contactEmail: formData.get("contactEmail") ?? undefined,
        contactPhone: formData.get("contactPhone") ?? undefined,
        defaultTerms: formData.get("defaultTerms") ?? undefined,
      } as never,
    );
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  return { notice: "Studio profile saved." };
}

const assetSchema = z.object({ assetId: z.string().min(1) });

export async function setLogoAction(assetId: string): Promise<StudioFormState> {
  const parsed = assetSchema.safeParse({ assetId });
  if (!parsed.success) return { error: "Invalid logo upload." };
  const { user, workspace } = await requireWorkspace();
  try {
    await setStudioLogo(prisma, { userId: user.id, workspaceId: workspace.id }, parsed.data.assetId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath("/studio/settings");
  return { notice: "Logo updated." };
}

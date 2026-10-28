"use server";

import { auth } from "@roomdesigner/auth/server";
import { prisma } from "@roomdesigner/db";
import { isSupportedCurrency } from "@roomdesigner/shared";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "@/server/auth/session";

export interface SettingsState {
  error?: string;
  notice?: string;
  fieldErrors?: Record<string, string[]>;
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Name is too long."),
});

const workspaceSchema = z.object({
  mode: z.enum(["HOME", "PRO"]),
  currency: z
    .string()
    .refine((code) => isSupportedCurrency(code), { message: "Choose a supported currency." }),
  unitSystem: z.enum(["METRIC", "IMPERIAL"]),
});

export async function updateProfileAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { fieldErrors: { name: parsed.error.issues.map((issue) => issue.message) } };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (session === null) {
    return { error: "Your session expired. Sign in again." };
  }

  await auth.api.updateUser({
    body: { name: parsed.data.name },
    headers: await headers(),
  });

  revalidatePath("/settings");
  return { notice: "Profile updated." };
}

export async function updateWorkspaceAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = workspaceSchema.safeParse({
    mode: formData.get("mode"),
    currency: formData.get("currency"),
    unitSystem: formData.get("unitSystem"),
  });
  if (!parsed.success) {
    return { fieldErrors: { form: parsed.error.issues.map((issue) => issue.message) } };
  }

  const { workspace, user } = await requireWorkspace();
  const { mode, currency, unitSystem } = parsed.data;

  await prisma.$transaction([
    prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        // Mode is a UI preference; keep the workspace type in sync so the
        // Pro shells and defaults follow the chosen mode.
        type: mode === "PRO" ? "STUDIO" : "PERSONAL",
        currency,
        unitSystem,
      },
    }),
    prisma.user.update({ where: { id: user.id }, data: { mode } }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/app");
  revalidatePath("/studio");
  return { notice: "Preferences saved." };
}

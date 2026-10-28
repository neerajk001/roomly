"use server";

import { prisma } from "@roomdesigner/db";
import { isSupportedCurrency } from "@roomdesigner/shared";import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/server/auth/session";

export interface OnboardingState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const onboardingSchema = z.object({
  mode: z.enum(["HOME", "PRO"]),
  studioName: z.string().trim().max(80).optional(),
  currency: z
    .string()
    .refine((code) => isSupportedCurrency(code), { message: "Choose a supported currency." }),
  unitSystem: z.enum(["METRIC", "IMPERIAL"]),
});

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    mode: formData.get("mode"),
    studioName: formData.get("studioName") ?? undefined,
    currency: formData.get("currency"),
    unitSystem: formData.get("unitSystem"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return { fieldErrors };
  }

  const { mode, studioName, currency, unitSystem } = parsed.data;
  if (mode === "PRO" && (studioName === undefined || studioName.length < 2)) {
    return { fieldErrors: { studioName: ["Enter your studio name."] } };
  }

  const { workspace, user } = await requireWorkspace();

  await prisma.$transaction([
    prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        type: mode === "PRO" ? "STUDIO" : "PERSONAL",
        ...(mode === "PRO" && studioName !== undefined ? { name: studioName } : {}),
        currency,
        unitSystem,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { mode, onboardedAt: new Date() },
    }),
  ]);

  redirect(mode === "PRO" ? "/studio" : "/app");
}

"use server";

import { prisma } from "@roomdesigner/db";
import { getStyle } from "@roomdesigner/shared";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { getRoughEstimate } from "../services/estimates";
import { roomTypeSchema } from "../services/rooms";

export interface WizardState {
  error?: string;
  projectId?: string;
  roomId?: string;
}

const optionalMm = z
  .number()
  .int()
  .min(100, "Measurements look too small.")
  .max(30000, "Measurements look too large.")
  .nullable()
  .optional();

const payloadSchema = z.object({
  roomType: roomTypeSchema,
  widthMm: optionalMm,
  lengthMm: optionalMm,
  heightMm: optionalMm,
  renterMode: z.boolean(),
  keepList: z.array(z.string().trim().min(1).max(40)).max(10),
  budgetMinor: z.number().int().positive().nullable().optional(),
  styleKey: z.string().optional(),
});

const ROOM_LABELS: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
  DINING_ROOM: "Dining room",
  HOME_OFFICE: "Home office",
  KIDS_ROOM: "Kids room",
  BALCONY: "Balcony",
  HALLWAY: "Hallway",
  OTHER: "Room",
};

/** Creates the project + room for the guided flow and persists a rough estimate. */
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
  const parsed = payloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the wizard answers." };
  }

  const { user, workspace } = await requireWorkspace();
  const ctx = { userId: user.id, workspaceId: workspace.id };
  const style = parsed.data.styleKey !== undefined ? getStyle(parsed.data.styleKey) : undefined;
  const roomLabel = ROOM_LABELS[parsed.data.roomType] ?? "Room";

  try {
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: `${roomLabel} redesign`,
        currency: workspace.currency,
        budgetMinor: parsed.data.budgetMinor ?? null,
        renterMode: parsed.data.renterMode,
        keepList: parsed.data.keepList,
        styleKey: style?.key ?? null,
      },
    });
    const room = await prisma.room.create({
      data: {
        projectId: project.id,
        name: roomLabel,
        type: parsed.data.roomType,
        widthMm: parsed.data.widthMm ?? null,
        lengthMm: parsed.data.lengthMm ?? null,
        heightMm: parsed.data.heightMm ?? null,
      },
    });
    await getRoughEstimate(prisma, ctx, room.id);
    return { projectId: project.id, roomId: room.id };
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


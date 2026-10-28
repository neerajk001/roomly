"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { createProject, softDeleteProject } from "../services/projects";
import { createRoom, deleteRoom, openingListSchema, roomTypeSchema } from "../services/rooms";

export interface ProjectFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const basePathSchema = z.enum(["/app", "/studio"]);

const createProjectFormSchema = z.object({
  name: z.string(),
  basePath: basePathSchema,
});

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const parsed = createProjectFormSchema.safeParse({
    name: formData.get("name"),
    basePath: formData.get("basePath"),
  });
  if (!parsed.success) {
    return { error: "Check the project name." };
  }
  const { user, workspace } = await requireWorkspace();

  let projectId: string;
  try {
    const project = await createProject(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      { name: parsed.data.name },
    );
    projectId = project.id;
  } catch (error) {
    if (error instanceof AppError) {
      return { fieldErrors: { name: [error.message] } };
    }
    throw error;
  }

  revalidatePath(parsed.data.basePath);
  redirect(`${parsed.data.basePath}/projects/${projectId}`);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const projectId = z.string().min(1).parse(formData.get("projectId"));
  const basePath = basePathSchema.parse(formData.get("basePath"));
  const { user, workspace } = await requireWorkspace();
  await softDeleteProject(prisma, { userId: user.id, workspaceId: workspace.id }, projectId);
  revalidatePath(basePath);
  redirect(basePath);
}

const optionalMillimetres = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}, z.number().int().optional());

const createRoomFormSchema = z.object({
  projectId: z.string().min(1),
  basePath: basePathSchema,
  name: z.string(),
  type: roomTypeSchema,
  widthMm: optionalMillimetres,
  lengthMm: optionalMillimetres,
  heightMm: optionalMillimetres,
  openings: z.string().optional(),
});

export async function createRoomAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const parsed = createRoomFormSchema.safeParse({
    projectId: formData.get("projectId"),
    basePath: formData.get("basePath"),
    name: formData.get("name"),
    type: formData.get("type"),
    widthMm: formData.get("widthMm"),
    lengthMm: formData.get("lengthMm"),
    heightMm: formData.get("heightMm"),
    openings: formData.get("openings") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Check the room details." };
  }

  let openings: unknown = [];
  if (parsed.data.openings !== undefined && parsed.data.openings !== "") {
    try {
      openings = JSON.parse(parsed.data.openings);
    } catch {
      return { error: "Check the doors and windows." };
    }
  }
  const openingsParsed = openingListSchema.safeParse(openings);
  if (!openingsParsed.success) {
    const message = openingsParsed.error.issues[0]?.message ?? "Check the doors and windows.";
    return { fieldErrors: { openings: [message] } };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    await createRoom(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      parsed.data.projectId,
      {
        name: parsed.data.name,
        type: parsed.data.type,
        widthMm: parsed.data.widthMm,
        lengthMm: parsed.data.lengthMm,
        heightMm: parsed.data.heightMm,
        openings: openingsParsed.data,
      },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return { fieldErrors: { form: [error.message] } };
    }
    throw error;
  }

  revalidatePath(`${parsed.data.basePath}/projects/${parsed.data.projectId}`);
  return {};
}

export async function deleteRoomAction(formData: FormData): Promise<void> {
  const roomId = z.string().min(1).parse(formData.get("roomId"));
  const projectId = z.string().min(1).parse(formData.get("projectId"));
  const basePath = basePathSchema.parse(formData.get("basePath"));
  const { user, workspace } = await requireWorkspace();
  await deleteRoom(prisma, { userId: user.id, workspaceId: workspace.id }, roomId);
  revalidatePath(`${basePath}/projects/${projectId}`);
}

import type { Prisma, Project } from "@roomdesigner/db";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Give the project a name.")
  .max(120, "Project names are at most 120 characters.");

export const createProjectSchema = z.object({
  name: projectNameSchema,
  clientId: z.string().min(1).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export async function createProject(
  db: Prisma,
  ctx: ServiceContext,
  input: CreateProjectInput,
): Promise<Project> {
  if (input.clientId !== undefined) {
    const client = await db.client.findFirst({
      where: { id: input.clientId, workspaceId: ctx.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (client === null) {
      throw new AppError("NOT_FOUND", "Client not found.", 404);
    }
  }
  return db.project.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: input.name,
      clientId: input.clientId ?? null,
    },
  });
}

export interface ProjectListItem {
  id: string;
  name: string;
  roomCount: number;
  updatedAt: Date;
}

export async function listProjects(db: Prisma, ctx: ServiceContext): Promise<ProjectListItem[]> {
  const projects = await db.project.findMany({
    where: { workspaceId: ctx.workspaceId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: { select: { rooms: true } },
    },
  });
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    roomCount: project._count.rooms,
    updatedAt: project.updatedAt,
  }));
}

export interface ProjectDetail {
  project: Project;
  rooms: {
    id: string;
    name: string;
    type: string;
    widthMm: number | null;
    lengthMm: number | null;
    heightMm: number | null;
    photos: {
      id: string;
      width: number | null;
      height: number | null;
      storageKey: string;
    }[];
  }[];
}

export async function getProject(
  db: Prisma,
  ctx: ServiceContext,
  projectId: string,
): Promise<ProjectDetail> {
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    include: {
      rooms: {
        orderBy: { createdAt: "asc" },
        include: {
          assets: {
            where: { kind: "ORIGINAL_PHOTO", confirmedAt: { not: null } },
            orderBy: { createdAt: "asc" },
            select: { id: true, width: true, height: true, storageKey: true },
          },
        },
      },
    },
  });
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.", 404);
  }
  return {
    project,
    rooms: project.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      widthMm: room.widthMm,
      lengthMm: room.lengthMm,
      heightMm: room.heightMm,
      photos: room.assets.map((asset) => ({
        id: asset.id,
        width: asset.width,
        height: asset.height,
        storageKey: asset.storageKey,
      })),
    })),
  };
}

export async function renameProject(
  db: Prisma,
  ctx: ServiceContext,
  projectId: string,
  name: string,
): Promise<Project> {
  const parsed = projectNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new AppError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Invalid name.", 400);
  }
  const updated = await db.project.updateMany({
    where: { id: projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    data: { name: parsed.data },
  });
  if (updated.count === 0) {
    throw new AppError("NOT_FOUND", "Project not found.", 404);
  }
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId },
  });
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.", 404);
  }
  return project;
}

/** Soft delete: the project and its renders disappear from the product. */
export async function softDeleteProject(
  db: Prisma,
  ctx: ServiceContext,
  projectId: string,
): Promise<void> {
  const deleted = await db.project.updateMany({
    where: { id: projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (deleted.count === 0) {
    throw new AppError("NOT_FOUND", "Project not found.", 404);
  }
}

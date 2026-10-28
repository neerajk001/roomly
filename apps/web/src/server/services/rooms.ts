import type { Prisma, Room } from "@roomdesigner/db";
import { z } from "zod";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";

export const MIN_DIMENSION_MM = 1000;
export const MAX_DIMENSION_MM = 30000;
export const MIN_HEIGHT_MM = 2000;
export const MAX_HEIGHT_MM = 6000;

const dimension = z
  .number()
  .int("Measurements must be whole millimetres.")
  .min(MIN_DIMENSION_MM, "That measurement is too small (min 1 m).")
  .max(MAX_DIMENSION_MM, "That measurement is too large (max 30 m).")
  .optional();

const height = z
  .number()
  .int("Measurements must be whole millimetres.")
  .min(MIN_HEIGHT_MM, "Ceiling height must be at least 2 m.")
  .max(MAX_HEIGHT_MM, "Ceiling height must be at most 6 m.")
  .optional();

export const openingSchema = z.object({
  type: z.enum(["DOOR", "WINDOW"]),
  widthMm: z.number().int().min(300, "Openings must be at least 300 mm wide.").max(5000),
  heightMm: z.number().int().min(300, "Openings must be at least 300 mm tall.").max(3000),
  qty: z.number().int().min(1).max(12),
});

export const openingListSchema = z.array(openingSchema).max(20, "At most 20 openings.");

export const roomTypeSchema = z.enum([
  "LIVING_ROOM",
  "BEDROOM",
  "KITCHEN",
  "BATHROOM",
  "DINING_ROOM",
  "HOME_OFFICE",
  "KIDS_ROOM",
  "BALCONY",
  "HALLWAY",
  "OTHER",
]);

export const roomInputSchema = z.object({
  name: z.string().trim().min(1, "Give the room a name.").max(80, "Room names are too long."),
  type: roomTypeSchema,
  widthMm: dimension,
  lengthMm: dimension,
  heightMm: height,
  openings: openingListSchema.default([]),
});

export type RoomInput = z.infer<typeof roomInputSchema>;

async function requireProject(db: Prisma, ctx: ServiceContext, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.", 404);
  }
  return project;
}

function validateRoomInput(input: RoomInput): RoomInput {
  const parsed = roomInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Check the room details.",
      400,
    );
  }
  return parsed.data;
}

export async function createRoom(
  db: Prisma,
  ctx: ServiceContext,
  projectId: string,
  input: RoomInput,
): Promise<Room> {
  const valid = validateRoomInput(input);
  await requireProject(db, ctx, projectId);
  return db.room.create({
    data: {
      projectId,
      name: valid.name,
      type: input.type,
      widthMm: input.widthMm,
      lengthMm: input.lengthMm,
      heightMm: input.heightMm,
      openings: input.openings.map((opening) => ({ ...opening })),
    },
  });
}

export async function updateRoom(
  db: Prisma,
  ctx: ServiceContext,
  roomId: string,
  input: RoomInput,
): Promise<Room> {
  const updated = await db.room.updateMany({
    where: { id: roomId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
    data: {
      name: input.name,
      type: input.type,
      widthMm: input.widthMm,
      lengthMm: input.lengthMm,
      heightMm: input.heightMm,
      openings: input.openings.map((opening) => ({ ...opening })),
    },
  });
  if (updated.count === 0) {
    throw new AppError("NOT_FOUND", "Room not found.", 404);
  }
  const room = await db.room.findFirst({
    where: { id: roomId, project: { workspaceId: ctx.workspaceId } },
  });
  if (room === null) {
    throw new AppError("NOT_FOUND", "Room not found.", 404);
  }
  return room;
}

export async function deleteRoom(
  db: Prisma,
  ctx: ServiceContext,
  roomId: string,
): Promise<void> {
  const deleted = await db.room.deleteMany({
    where: { id: roomId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
  });
  if (deleted.count === 0) {
    throw new AppError("NOT_FOUND", "Room not found.", 404);
  }
}

export interface RoomDetail {
  room: Room;
  project: { id: string; name: string };
  photos: { id: string; width: number | null; height: number | null; storageKey: string }[];
}

export async function getRoom(
  db: Prisma,
  ctx: ServiceContext,
  roomId: string,
): Promise<RoomDetail> {
  const room = await db.room.findFirst({
    where: { id: roomId, project: { workspaceId: ctx.workspaceId, deletedAt: null } },
    include: {
      project: { select: { id: true, name: true } },
      assets: {
        where: { kind: "ORIGINAL_PHOTO", confirmedAt: { not: null } },
        orderBy: { createdAt: "asc" },
        select: { id: true, width: true, height: true, storageKey: true },
      },
    },
  });
  if (room === null) {
    throw new AppError("NOT_FOUND", "Room not found.", 404);
  }
  return {
    room,
    project: room.project,
    photos: room.assets,
  };
}

import type { Prisma } from "@roomdesigner/db";
import { z } from "zod";
import { ROOM_CHECKLISTS, getStyle } from "@roomdesigner/shared";
import { roomTypeSchema } from "./rooms";
import type { ServiceContext } from "./context";
import { AppError } from "../app-error";

const optionalMm = z.number().int().min(100).max(30000).nullable().optional();
export const designProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  clientId: z.string().min(1).optional(),
  roomType: roomTypeSchema,
  widthMm: optionalMm,
  lengthMm: optionalMm,
  heightMm: optionalMm,
  renterMode: z.boolean(),
  keepList: z.array(z.string().trim().min(1).max(40)).max(10),
  budgetMinor: z.number().int().positive().nullable().optional(),
  styleKey: z
    .string()
    .max(64)
    .refine((key) => !!getStyle(key), "Choose a valid style.")
    .optional(),
});
export async function createDesignProject(
  db: Prisma,
  ctx: ServiceContext & { currency: string },
  input: z.infer<typeof designProjectSchema>,
) {
  const data = designProjectSchema.parse(input);
  if (data.clientId) {
    const client = await db.client.findFirst({
      where: { id: data.clientId, workspaceId: ctx.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new AppError("NOT_FOUND", "Client not found.", 404);
  }
  const roomName = ROOM_CHECKLISTS.find((room) => room.key === data.roomType)?.label ?? "Room";
  const project = await db.project.create({
    data: {
      workspaceId: ctx.workspaceId,
      currency: ctx.currency,
      name: data.name ?? roomName + " redesign",
      clientId: data.clientId ?? null,
      budgetMinor: data.budgetMinor ?? null,
      renterMode: data.renterMode,
      keepList: data.keepList,
      styleKey: data.styleKey ?? null,
      rooms: {
        create: {
          name: roomName,
          type: data.roomType,
          widthMm: data.widthMm ?? null,
          lengthMm: data.lengthMm ?? null,
          heightMm: data.heightMm ?? null,
        },
      },
    },
    select: { id: true, rooms: { select: { id: true } } },
  });
  const room = project.rooms[0];
  if (!room) throw new AppError("CREATE_FAILED", "Your room could not be created.", 500);
  return { projectId: project.id, roomId: room.id };
}

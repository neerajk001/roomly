import type { Prisma } from "@roomdesigner/db";
import type { ServiceContext } from "./context";

/** Full chronological history: the last item is always the latest concept/edit. */
export function listRoomRenderJobs(db: Prisma, ctx: ServiceContext, roomId: string) {
  return db.renderJob.findMany({
    where: { roomId, workspaceId: ctx.workspaceId, room: { project: { workspaceId: ctx.workspaceId, deletedAt: null } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { outputs: {
      orderBy: { index: "asc" },
      include: { asset: { select: { storageKey: true } }, thumbAsset: { select: { storageKey: true } } },
    } },
  });
}

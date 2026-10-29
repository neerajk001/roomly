import { logEvent } from "@roomdesigner/shared/logger";
import { prisma } from "@roomdesigner/db";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";

/** GDPR-style data export: workspace, clients, projects, rooms, estimates (no files). */
export async function GET(): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const workspaceId = ctx.workspace.id;
    const [workspace, clients, projects, rooms, estimates, proposals] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          type: true,
          currency: true,
          unitSystem: true,
          contactEmail: true,
          contactPhone: true,
          createdAt: true,
        },
      }),
      prisma.client.findMany({ where: { workspaceId }, select: { name: true, email: true, phone: true, notes: true } }),
      prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true, createdAt: true, budgetMinor: true },
      }),
      prisma.room.findMany({
        where: { project: { workspaceId } },
        select: { id: true, name: true, type: true, widthMm: true, lengthMm: true, heightMm: true },
      }),
      prisma.estimate.findMany({
        where: { project: { workspaceId } },
        select: { id: true, version: true, currency: true, totalMinor: true, createdAt: true },
      }),
      prisma.proposal.findMany({
        where: { project: { workspaceId } },
        select: { id: true, title: true, status: true, createdAt: true },
      }),
    ]);

    logEvent("info", "account_export", { workspaceId });
    return Response.json(
      { exportedAt: new Date().toISOString(), workspace, clients, projects, rooms, estimates, proposals },
      {
        headers: {
          "content-disposition": 'attachment; filename="roomdesigner-export.json"',
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

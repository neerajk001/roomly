import { prisma } from "@roomdesigner/db";
import { z } from "zod";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";
import { AppError } from "@/server/app-error";
import { removeRoomPhoto } from "@/server/services/rooms";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const parsed = z.object({ assetId: z.string().min(1) }).safeParse(await params);
    if (!parsed.success) throw new AppError("INVALID_INPUT", "Invalid photo.", 400);
    await removeRoomPhoto(
      prisma,
      { userId: ctx.user.id, workspaceId: ctx.workspace.id },
      parsed.data.assetId,
    );
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

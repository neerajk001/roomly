import { prisma } from "@roomdesigner/db";
import { z } from "zod";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";

const bodySchema = z.object({ isFavorite: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: "Invalid request." } },
        { status: 400 },
      );
    }

    const updated = await prisma.renderOutput.updateMany({
      where: { id, job: { workspaceId: ctx.workspace.id } },
      data: { isFavorite: parsed.data.isFavorite },
    });
    if (updated.count === 0) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Image not found." } },
        { status: 404 },
      );
    }
    return Response.json({ ok: true, isFavorite: parsed.data.isFavorite });
  } catch (error) {
    return errorResponse(error);
  }
}

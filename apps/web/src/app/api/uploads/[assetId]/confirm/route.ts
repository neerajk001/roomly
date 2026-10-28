import { prisma } from "@roomdesigner/db";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";
import { confirmUpload } from "@/server/services/uploads";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const { assetId } = await params;
    const result = await confirmUpload(prisma, { userId: ctx.user.id, workspaceId: ctx.workspace.id }, assetId);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

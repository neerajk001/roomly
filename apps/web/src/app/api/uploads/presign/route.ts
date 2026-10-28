import { prisma } from "@roomdesigner/db";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";
import { createUploadPresign, presignInputSchema } from "@/server/services/uploads";

export async function POST(request: Request): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const parsed = presignInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Check the file type and size.",
          },
        },
        { status: 400 },
      );
    }
    const result = await createUploadPresign(prisma, { userId: ctx.user.id, workspaceId: ctx.workspace.id }, parsed.data);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

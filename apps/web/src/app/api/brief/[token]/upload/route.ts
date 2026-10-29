import { prisma } from "@roomdesigner/db";
import { headers } from "next/headers";
import { createUploadPresign, presignInputSchema } from "@/server/services/uploads";
import { getBriefLinkForUpload } from "@/server/services/briefs";
import { checkRateLimit } from "@/server/rate-limit";
import { errorResponse } from "@/server/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  try {
    const { token } = await params;
    const headerBag = await headers();
    const ip =
      headerBag.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerBag.get("x-real-ip") ?? "local";
    if (!(await checkRateLimit(`brief-upload:${token}:${ip}`, 20, 60_000))) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many uploads. Wait a minute." } },
        { status: 429 },
      );
    }

    const link = await getBriefLinkForUpload(prisma, token);
    const parsed = presignInputSchema.safeParse({
      ...(await request.json().catch(() => null)),
      kind: "BRIEF_UPLOAD",
    });
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
    const result = await createUploadPresign(
      prisma,
      { userId: "brief", workspaceId: link.workspaceId },
      parsed.data,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

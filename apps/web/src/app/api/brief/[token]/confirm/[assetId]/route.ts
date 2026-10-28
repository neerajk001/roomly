import { prisma } from "@roomdesigner/db";
import { getBriefLinkForUpload } from "@/server/services/briefs";
import { confirmUpload } from "@/server/services/uploads";
import { errorResponse } from "@/server/http";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string; assetId: string }> },
): Promise<Response> {
  try {
    const { token, assetId } = await params;
    const link = await getBriefLinkForUpload(prisma, token);
    const result = await confirmUpload(
      prisma,
      { userId: "brief", workspaceId: link.workspaceId },
      assetId,
      "BRIEF_UPLOAD",
    );
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

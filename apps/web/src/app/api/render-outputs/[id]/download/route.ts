import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { NextResponse } from "next/server";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const { id } = await params;
    const output = await prisma.renderOutput.findFirst({
      where: { id, job: { workspaceId: ctx.workspace.id } },
      include: { asset: { select: { storageKey: true } } },
    });
    if (output === null) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Image not found." } },
        { status: 404 },
      );
    }
    const url = await presignGet(output.asset.storageKey, 300, {
      downloadName: `concept-${String(output.index + 1)}.jpg`,
    });
    return NextResponse.redirect(url, 302);
  } catch (error) {
    return errorResponse(error);
  }
}

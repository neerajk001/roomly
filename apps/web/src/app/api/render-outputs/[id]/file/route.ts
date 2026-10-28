import { prisma } from "@roomdesigner/db";
import { applyWatermark, getObject, presignGet } from "@roomdesigner/storage";
import { NextResponse } from "next/server";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";
import { getPlanState } from "@/server/services/plan";

/**
 * Delivery endpoint for render images. Free workspaces get a visible watermark
 * rendered on demand (stored originals stay clean); paid workspaces redirect to
 * a short-lived signed URL.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const { id } = await params;
    const url = new URL(request.url);
    const variant = url.searchParams.get("variant") === "download" ? "download" : "preview";

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

    const plan = await getPlanState(prisma, ctx.workspace.id);
    if (plan === "PAID") {
      const signed = await presignGet(
        output.asset.storageKey,
        variant === "download" ? 300 : 3600,
        variant === "download" ? { downloadName: `concept-${String(output.index + 1)}.jpg` } : undefined,
      );
      return NextResponse.redirect(signed, 302);
    }

    const source = await getObject(output.asset.storageKey);
    const watermarked = await applyWatermark(source);
    return new Response(new Uint8Array(watermarked), {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, max-age=300",
        ...(variant === "download"
          ? {
              "content-disposition": `attachment; filename="concept-${String(output.index + 1)}.jpg"`,
            }
          : {}),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

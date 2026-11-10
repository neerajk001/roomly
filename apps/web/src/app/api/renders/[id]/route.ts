import {
  savedRoomRequest,
  savedRoomAssessment,
  savedRenderStage,
  outputConceptLabel,
  readDiversityReport,
  outputStyleKey,
  savedConceptAdvice,
  renderSourceOutputId,
  savedEditTarget,
  savedRoomIncludes,
} from "@roomdesigner/shared";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireApiWorkspace } from "@/server/auth/session";
import { errorResponse } from "@/server/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const { id } = await params;
    const job = await prisma.renderJob.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      include: {
        sourceAsset: { select: { workspaceId: true, storageKey: true } },
        outputs: {
          orderBy: { index: "asc" },
          include: {
            asset: { select: { storageKey: true } },
            thumbAsset: { select: { storageKey: true } },
          },
        },
      },
    });
    if (job === null) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Render not found." } },
        { status: 404 },
      );
    }

    const outputs = await Promise.all(
      job.outputs.map(async (output) => ({
        id: output.id,
        index: output.index,
        advice: savedConceptAdvice(job.params, output.id),
        styleKey: outputStyleKey(job.params, job.styleKey, output.index),
        directionLabel: outputConceptLabel(
          job.params,
          outputStyleKey(job.params, job.styleKey, output.index),
          output.index,
        ),
        isFavorite: output.isFavorite,
        url: await presignGet(output.asset.storageKey),
        thumbUrl: await presignGet(output.thumbAsset?.storageKey ?? output.asset.storageKey),
      })),
    );

    return Response.json({
      id: job.id,
      kind: job.kind,
      label: job.kind === "EDIT" ? (job.instruction ?? "Edit") : "Base concept",
      status: job.status,
      errorMessage: job.errorMessage,
      errorCode: job.errorCode,
      notes: savedRoomRequest(job.params),
      sourceUrl:
        job.sourceAsset.workspaceId === ctx.workspace.id
          ? await presignGet(job.sourceAsset.storageKey)
          : undefined,
      roomAssessment: savedRoomAssessment(job.params),
      renderStage: savedRenderStage(job.params),
      creditsCharged: job.creditsCharged,
      styleKey: job.styleKey,
      similarConcepts: readDiversityReport(job.params)?.similarConcepts ?? false,
      sourceOutputId: renderSourceOutputId(job.params),
      editTarget: savedEditTarget(job.params),
      includeItems: savedRoomIncludes(job.params),
      createdAt: job.createdAt,
      outputs,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

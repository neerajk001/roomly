import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { z } from "zod";
import { errorResponse } from "@/server/http";
import { AppError } from "@/server/app-error";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
  try {
    const parsed = z.object({ token: z.string().min(16).max(128) }).safeParse(await params);
    if (!parsed.success) throw new AppError("NOT_FOUND", "Proposal not found.", 404);
    const proposal = await prisma.proposal.findFirst({ where: { publicToken: parsed.data.token, status: { not: "DRAFT" }, project: { deletedAt: null } }, select: { pdfStorageKey: true } });
    if (proposal?.pdfStorageKey === undefined || proposal.pdfStorageKey === null) throw new AppError("NOT_FOUND", "PDF not available.", 404);
    return Response.redirect(await presignGet(proposal.pdfStorageKey, 300), 302);
  } catch (error) { return errorResponse(error); }
}

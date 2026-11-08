import { prisma } from "@roomdesigner/db";
import { z } from "zod";
import { requireApiWorkspace } from "@/server/auth/session";
import { buildProposalPdf } from "@/server/services/proposal-pdf";
import { errorResponse } from "@/server/http";
import { AppError } from "@/server/app-error";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const ctx = await requireApiWorkspace();
    const parsed = z.object({ id: z.string().min(1) }).safeParse(await params);
    if (!parsed.success) throw new AppError("INVALID_INPUT", "Invalid proposal.", 400);
    const { buffer } = await buildProposalPdf(prisma, { userId: ctx.user.id, workspaceId: ctx.workspace.id }, parsed.data.id);
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="design-proposal.pdf"', "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

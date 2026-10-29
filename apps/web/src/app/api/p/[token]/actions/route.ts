import { prisma } from "@roomdesigner/db";
import { headers } from "next/headers";
import { z } from "zod";
import { checkRateLimit } from "@/server/rate-limit";
import { errorResponse } from "@/server/http";
import {
  addProposalComment,
  approveProposal,
  requestChanges,
} from "@/server/services/proposals";

const schema = z.object({
  action: z.enum(["approve", "changes", "comment"]),
  outputId: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Your name is required.").max(120),
  message: z.string().trim().max(2000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  try {
    const { token } = await params;
    const headerBag = await headers();
    const ip =
      headerBag.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerBag.get("x-real-ip") ?? "local";
    if (!(await checkRateLimit(`proposal:${token}:${ip}`, 20, 60_000))) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many actions. Wait a minute." } },
        { status: 429 },
      );
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid input." } },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (data.action === "approve") {
      if (data.outputId === undefined) {
        return Response.json(
          { error: { code: "INVALID_INPUT", message: "Choose an option." } },
          { status: 400 },
        );
      }
      await approveProposal(prisma, token, data.outputId, data.name);
    } else if (data.action === "changes") {
      await requestChanges(prisma, token, data.name, data.message ?? "");
    } else {
      await addProposalComment(prisma, token, data.name, data.message ?? "");
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

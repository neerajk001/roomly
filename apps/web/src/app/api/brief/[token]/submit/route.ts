import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import { getEmailSender } from "@roomdesigner/shared/email";
import { headers } from "next/headers";
import { z } from "zod";
import { checkRateLimit } from "@/server/rate-limit";
import { errorResponse } from "@/server/http";
import { briefAnswersSchema, submitBrief } from "@/server/services/briefs";

const bodySchema = z.object({
  answers: briefAnswersSchema,
  assetIds: z.array(z.string().min(1)).max(8).default([]),
  /** Honeypot: must be empty. */
  website: z.string().max(200).optional(),
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
    if (!(await checkRateLimit(`brief-submit:${token}:${ip}`, 5, 60_000))) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many attempts. Wait a minute." } },
        { status: 429 },
      );
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message ?? "Check your answers.",
          },
        },
        { status: 400 },
      );
    }
    if (parsed.data.website !== undefined && parsed.data.website !== "") {
      // Pretend success for bots.
      return Response.json({ ok: true });
    }

    const result = await submitBrief(prisma, token, parsed.data.answers, parsed.data.assetIds);

    void getEmailSender().send({
      to: result.designerEmail,
      subject: `New brief: ${result.projectName}`,
      text: `A client submitted a brief.\n\nProject: ${result.projectName}\nOpen it: ${getServerEnv().APP_URL}/studio/projects/${result.projectId}\n`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

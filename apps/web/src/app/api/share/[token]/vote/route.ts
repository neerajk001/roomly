import { prisma } from "@roomdesigner/db";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { checkRateLimit } from "@/server/rate-limit";
import { errorResponse } from "@/server/http";
import { castVote } from "@/server/services/share";

const bodySchema = z.object({ outputId: z.string().min(1) });

function cookieName(token: string): string {
  return `share_votes_${token.slice(0, 16)}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  try {
    const { token } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: "Invalid vote." } },
        { status: 400 },
      );
    }

    const headerBag = await headers();
    const ip =
      headerBag.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerBag.get("x-real-ip") ?? "local";
    if (!checkRateLimit(`share-vote:${token}:${ip}`, 30, 60_000)) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many votes. Wait a minute." } },
        { status: 429 },
      );
    }

    const store = await cookies();
    const existing = store.get(cookieName(token))?.value ?? "";
    const votedIds = existing === "" ? [] : existing.split(".");
    if (votedIds.includes(parsed.data.outputId)) {
      return Response.json(
        { error: { code: "ALREADY_VOTED", message: "You already voted for this one." } },
        { status: 409 },
      );
    }

    const result = await castVote(prisma, token, parsed.data.outputId);
    if (result === null) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Concept not found." } },
        { status: 404 },
      );
    }

    const nextValue = [...votedIds, parsed.data.outputId].join(".").slice(0, 3800);
    store.set(cookieName(token), nextValue, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return Response.json({ votes: result.votes });
  } catch (error) {
    return errorResponse(error);
  }
}

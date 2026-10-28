import { z } from "zod";

const bodySchema = z.object({
  event: z
    .enum([
      "wizard_started",
      "wizard_completed",
      "render_requested",
      "render_succeeded",
      "estimate_viewed",
      "share_created",
    ]),
  props: z
    .record(z.string(), z.union([z.string().max(80), z.number(), z.boolean()]))
    .optional(),
});

/** Privacy-friendly event sink. No IPs, users, emails or image data are stored. */
export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }
  console.info(JSON.stringify({ channel: "analytics", event: parsed.data.event, props: parsed.data.props ?? {} }));
  return Response.json({ ok: true });
}

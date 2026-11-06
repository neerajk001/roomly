import { prisma } from "@roomdesigner/db";

/**
 * Uptime probe: verifies the web process and a database round-trip. The
 * response also carries the baked-in git commit (`BUILD_SHA`, set in the
 * web Dockerfile) so a deploy can be verified against the live server.
 */
export async function GET(): Promise<Response> {
  try {
    const startedAt = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startedAt;
    const build = process.env.BUILD_SHA ?? "unknown";
    return Response.json(
      { ok: true, db: "up", dbLatencyMs, build },
      {
        status: 200,
        headers: { "cache-control": "no-store", "x-build-sha": build },
      },
    );
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

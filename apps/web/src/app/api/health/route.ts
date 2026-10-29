import { prisma } from "@roomdesigner/db";

/** Uptime probe: verifies the web process and a database round-trip. */
export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

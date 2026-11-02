import { createServer } from "node:http";

export type HealthCheck = () => Promise<void>;
export type HealthSnapshot = { status: 200 | 503; body: { ok: boolean } };

/**
 * Runs the liveness check for the container health probe. A failed check
 * (for example a lost database connection) makes the container unhealthy so
 * the platform can restart it.
 */
export async function checkHealth(check: HealthCheck): Promise<HealthSnapshot> {
  try {
    await check();
    return { status: 200, body: { ok: true } };
  } catch {
    return { status: 503, body: { ok: false } };
  }
}

/**
 * Tiny HTTP server exposing GET /health (and /healthz) for Docker and uptime
 * probes. Returns a shutdown function that closes the listener.
 */
export async function startHealthServer(
  port: number,
  check: HealthCheck,
): Promise<() => Promise<void>> {
  const server = createServer((request, response) => {
    if (request.method !== "GET" || (request.url !== "/health" && request.url !== "/healthz")) {
      response.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({ ok: false }));
      return;
    }

    void checkHealth(check).then((result) => {
      response.writeHead(result.status, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      response.end(JSON.stringify(result.body));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      server.off("error", reject);
      resolve();
    });
  });

  return async () => {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  };
}

import { renderJobStatusSchema } from "@roomdesigner/shared";
import { isTerminal, type RenderJobStatusResponse } from "../components/renders/types";

export const RENDER_STATUS_PAUSED =
  "Status updates paused. Your design may still be processing. Check its status again; this does not generate another image.";

/** Bounded read-only polling; cleanup cancels both pending timers and in-flight reads. */
export function watchRender(
  jobId: string,
  handlers: {
    onUpdate(job: RenderJobStatusResponse): void;
    onComplete(job: RenderJobStatusResponse): void;
    onError(message: string): void;
  },
  fetcher: typeof fetch = fetch,
) {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let failures = 0;
  let attempts = 0;
  const startedAt = Date.now();
  async function tick() {
    controller = new AbortController();
    timeout = setTimeout(() => controller?.abort(), 15_000);
    try {
      const response = await fetcher(`/api/renders/${encodeURIComponent(jobId)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Status unavailable.");
      const job = renderJobStatusSchema.parse(await response.json());
      if (job.id !== jobId) throw new Error("Unexpected job.");
      if (cancelled) return;
      failures = 0;
      handlers.onUpdate(job);
      if (isTerminal(job.status)) {
        handlers.onComplete(job);
        return;
      }
    } catch {
      failures++;
    } finally {
      clearTimeout(timeout);
    }
    if (cancelled) return;
    attempts++;
    if (failures >= 5 || Date.now() - startedAt >= 10 * 60_000) {
      handlers.onError(RENDER_STATUS_PAUSED);
      return;
    }
    timer = setTimeout(
      () => void tick(),
      Math.min(2000 * Math.pow(1.4, Math.max(0, attempts - 3)), 10_000),
    );
  }
  timer = setTimeout(() => void tick(), 2000);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    clearTimeout(timeout);
    controller?.abort();
  };
}

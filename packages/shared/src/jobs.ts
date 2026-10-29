import { z } from "zod";

/** Queue names shared by the web app (producer) and the worker (consumer). */
export const QUEUE_RENDER_GENERATE = "render.generate";
export const QUEUE_CLEANUP_UNCONFIRMED = "assets.cleanup-unconfirmed";
export const QUEUE_RECOVER_STUCK = "render.recover-stuck";

/** Only the job id travels through the queue. */
export const renderJobPayloadSchema = z.object({ jobId: z.string().min(1) });
export type RenderJobPayload = z.infer<typeof renderJobPayloadSchema>;

/**
 * Queue options shared by the producer (web) and consumer (worker) so both
 * create the queue with identical retry semantics.
 */
export const RENDER_QUEUE_OPTIONS = {
  retryLimit: 2,
  retryDelay: 5,
  retryBackoff: true,
  expireInSeconds: 300,
} as const;
export const RENDER_QUEUE_RETRY_LIMIT = 2;

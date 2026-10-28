import { getImageProvider } from "@roomdesigner/ai";
import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import {
  QUEUE_CLEANUP_UNCONFIRMED,
  QUEUE_RENDER_GENERATE,
  renderJobPayloadSchema,
} from "@roomdesigner/shared";
import { deleteObject, getObject, putObject } from "@roomdesigner/storage";
import { cleanupUnconfirmedAssets } from "./jobs/cleanup-assets";
import { processRenderJob } from "./jobs/render-generate";
import { createBoss } from "./queue";

const RETRY_LIMIT = 2;
const CLEANUP_CRON = "17 * * * *";

function log(event: string, data: Record<string, unknown> = {}): void {
  process.stdout.write(JSON.stringify({ channel: "worker", event, ...data }) + "\n");
}

async function main(): Promise<void> {
  const env = getServerEnv();
  const provider = getImageProvider();
  log("starting", { provider: provider.name, imageProvider: env.IMAGE_PROVIDER });

  const boss = await createBoss();

  await boss.createQueue(QUEUE_RENDER_GENERATE, {
    retryLimit: RETRY_LIMIT,
    retryDelay: 5,
    retryBackoff: true,
    expireInSeconds: 300,
  });
  await boss.createQueue(QUEUE_CLEANUP_UNCONFIRMED);

  await boss.work<unknown>(QUEUE_RENDER_GENERATE, async (jobs) => {
    for (const job of jobs) {
      const parsed = renderJobPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        log("invalid_payload", { jobId: job.id });
        continue;
      }
      const outcome = await processRenderJob(
        {
          db: prisma,
          provider,
          download: getObject,
          upload: putObject,
          now: () => new Date(),
        },
        {
          jobId: parsed.data.jobId,
          retryCount: job.retryCount,
          retryLimit: RETRY_LIMIT,
        },
      );
      log("render_attempt", {
        jobId: parsed.data.jobId,
        attempt: job.retryCount + 1,
        outcome,
      });
      if (outcome === "retry") {
        // Throwing lets pg-boss retry with exponential backoff.
        throw new Error("transient render failure");
      }
    }
  });

  await boss.schedule(QUEUE_CLEANUP_UNCONFIRMED, CLEANUP_CRON);
  await boss.work<unknown>(QUEUE_CLEANUP_UNCONFIRMED, async () => {
    const removed = await cleanupUnconfirmedAssets({ db: prisma, deleteObject });
    log("cleanup_unconfirmed", { removed });
  });

  log("ready", { queues: [QUEUE_RENDER_GENERATE, QUEUE_CLEANUP_UNCONFIRMED] });

  const shutdown = (signal: string) => {
    log("shutdown", { signal });
    void boss
      .stop({ graceful: true })
      .then(() => prisma.$disconnect())
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  };

  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });
}

main().catch((error: unknown) => {
  process.stderr.write(
    JSON.stringify({
      channel: "worker",
      event: "fatal",
      message: error instanceof Error ? error.message : "unknown",
    }) + "\n",
  );
  process.exit(1);
});

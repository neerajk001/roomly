import { getImageProvider } from "@roomdesigner/ai";
import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import {
  QUEUE_CLEANUP_UNCONFIRMED,
  QUEUE_RECOVER_STUCK,
  QUEUE_RENDER_GENERATE,
  renderJobPayloadSchema,
} from "@roomdesigner/shared";
import { deleteObject, getObject, putObject } from "@roomdesigner/storage";
import { startHealthServer } from "./health";
import { cleanupUnconfirmedAssets } from "./jobs/cleanup-assets";
import { recoverStuckJobs } from "./jobs/recover-stuck";
import { processRenderJob } from "./jobs/render-generate";
import { createBoss } from "./queue";
import { processProposalEmails } from "./jobs/proposal-emails";
import { getEmailSender } from "@roomdesigner/shared/email";

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
  await boss.createQueue("proposal.emails");
  await boss.schedule("proposal.emails", "* * * * *");
  await boss.work("proposal.emails", async () => {
    const result = await processProposalEmails({
      db: prisma,
      sender: getEmailSender(),
      appUrl: env.APP_URL,
    });
    if (result.sent > 0 || result.failed > 0) log("proposal_emails", result);
  });

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

  await boss.createQueue(QUEUE_RECOVER_STUCK);
  await boss.schedule(QUEUE_RECOVER_STUCK, "*/10 * * * *");
  await boss.work<unknown>(QUEUE_RECOVER_STUCK, async () => {
    const recovered = await recoverStuckJobs({ db: prisma, now: new Date() });
    await prisma.rateLimit.deleteMany({
      where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    log("recover_stuck", { recovered });
  });

  await boss.schedule(QUEUE_CLEANUP_UNCONFIRMED, CLEANUP_CRON);
  await boss.work<unknown>(QUEUE_CLEANUP_UNCONFIRMED, async () => {
    const removed = await cleanupUnconfirmedAssets({ db: prisma, deleteObject });
    log("cleanup_unconfirmed", { removed });
  });

  const stopHealthServer =
    env.WORKER_HEALTH_PORT > 0
      ? await startHealthServer(env.WORKER_HEALTH_PORT, async () => {
          await prisma.$queryRaw`SELECT 1`;
        })
      : undefined;
  if (stopHealthServer !== undefined) {
    log("health_listening", { port: env.WORKER_HEALTH_PORT });
  }

  log("ready", { queues: [QUEUE_RENDER_GENERATE, QUEUE_CLEANUP_UNCONFIRMED] });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    log("shutdown", { signal });
    // Docker sends SIGKILL after stop_grace_period (45s); exit before that.
    const forceExit = setTimeout(() => {
      process.exit(1);
    }, 40_000);
    forceExit.unref();
    try {
      await stopHealthServer?.();
      await boss.stop({ graceful: true });
      await prisma.$disconnect();
      clearTimeout(forceExit);
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
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

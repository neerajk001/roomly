import { getServerEnv } from "@roomdesigner/config/env";
import { QUEUE_RENDER_GENERATE, RENDER_QUEUE_OPTIONS } from "@roomdesigner/shared";
import { PgBoss } from "pg-boss";

const globalForQueue = globalThis as unknown as {
  roomlyBoss?: PgBoss;
  roomlyBossStarting?: Promise<PgBoss>;
};

async function startBoss(): Promise<PgBoss> {
  const env = getServerEnv();
  const boss = new PgBoss({
    connectionString: env.QUEUE_DATABASE_URL ?? env.DATABASE_URL,
    schema: "pgboss",
  });
  boss.on("error", (error) => {
    console.error(JSON.stringify({ channel: "queue", event: "error", message: error.message }));
  });
  await boss.start();
  await boss.createQueue(QUEUE_RENDER_GENERATE, RENDER_QUEUE_OPTIONS);
  return boss;
}

/** Shared pg-boss instance (safe across Next.js hot reloads). */
export function getBoss(): Promise<PgBoss> {
  if (globalForQueue.roomlyBoss !== undefined) {
    return Promise.resolve(globalForQueue.roomlyBoss);
  }
  globalForQueue.roomlyBossStarting ??= startBoss().then((boss) => {
    globalForQueue.roomlyBoss = boss;
    return boss;
  });
  return globalForQueue.roomlyBossStarting;
}

/** Enqueues a render; the singleton key prevents duplicate deliveries. */
export async function enqueueRender(jobId: string): Promise<void> {
  const boss = await getBoss();
  await boss.send(
    QUEUE_RENDER_GENERATE,
    { jobId },
    { singletonKey: jobId, ...RENDER_QUEUE_OPTIONS },
  );
}

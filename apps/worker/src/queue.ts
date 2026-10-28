import { getServerEnv } from "@roomdesigner/config/env";
import { PgBoss } from "pg-boss";

/**
 * One pg-boss instance per process. The queue lives in the same Postgres
 * database as the app, so no extra service is required.
 */
export async function createBoss(): Promise<PgBoss> {
  const env = getServerEnv();
  const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: "pgboss" });
  boss.on("error", (error) => {
    process.stderr.write(
      JSON.stringify({ channel: "queue", event: "error", message: error.message }) + "\n",
    );
  });
  await boss.start();
  return boss;
}

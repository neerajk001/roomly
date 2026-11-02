import { spawn } from "node:child_process";
import { execSync } from "node:child_process";

/**
 * Starts the worker (fake provider) for E2E runs and stops it afterwards.
 * The web server itself is started by Playwright's webServer setting.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const child = spawn("pnpm", ["--filter", "@roomdesigner/worker", "start"], {
    cwd: process.cwd(),
    shell: true,
    env: {
      ...process.env,
      IMAGE_PROVIDER: "fake",
      AUTH_REQUIRE_EMAIL_VERIFICATION: "false",
      // Keep the E2E worker from colliding with a local dev worker's probe.
      WORKER_HEALTH_PORT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stopSignal: (() => void) | undefined;
  const ready = await new Promise<boolean>((resolve) => {
    let stopped = false;
    const timer = setTimeout(() => {
      resolve(false);
    }, 60_000);
    child.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes('"ready"')) {
        clearTimeout(timer);
        resolve(true);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (!stopped) {
        resolve(false);
        process.stderr.write(`worker exited early (code ${String(code)})\n`);
      }
    });
    stopSignal = () => {
      stopped = true;
    };
  });

  if (!ready) {
    throw new Error("Worker did not become ready for E2E tests.");
  }

  return async () => {
    stopSignal?.();
    try {
      if (process.platform === "win32" && child.pid !== undefined) {
        execSync(`taskkill /PID ${String(child.pid)} /T /F`, { stdio: "ignore" });
      } else {
        child.kill("SIGTERM");
      }
    } catch {
      // Already gone.
    }
  };
}

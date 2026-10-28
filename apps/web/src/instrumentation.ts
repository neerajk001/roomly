// Runs once when the Next.js server boots. Validates environment variables so
// the app fails fast with a readable error instead of failing later at runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("@roomdesigner/config/env");
    getServerEnv();
  }
}

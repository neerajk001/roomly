import { describe, expect, it } from "vitest";
import { checkHealth } from "./health";

describe("checkHealth", () => {
  it("reports healthy when the dependency check succeeds", async () => {
    await expect(checkHealth(async () => undefined)).resolves.toEqual({
      status: 200,
      body: { ok: true },
    });
  });

  it("reports unhealthy when the dependency check fails", async () => {
    await expect(
      checkHealth(async () => {
        throw new Error("database unavailable");
      }),
    ).resolves.toEqual({ status: 503, body: { ok: false } });
  });
});

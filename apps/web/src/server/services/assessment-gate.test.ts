import { afterAll, it, expect, vi } from "vitest";

vi.mock("@roomdesigner/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@roomdesigner/config/env")>();
  return {
    ...actual,
    getServerEnv: () => ({
      ...actual.getServerEnv(),
      IMAGE_PROVIDER: "openai" as const,
      ADVICE_PROVIDER: "fake" as const,
    }),
  };
});
vi.mock("../queue", () => ({ enqueueRender: vi.fn() }));
import { prisma } from "@roomdesigner/db";
import { enqueueRender } from "../queue";
import { createRender } from "./renders";

afterAll(() => vi.restoreAllMocks());
it("rejects real generation without real assessment before querying, charging or queueing", async () => {
  const room = vi.spyOn(prisma.room, "findFirst");
  const ledger = vi.spyOn(prisma.creditLedger, "create");
  const job = vi.spyOn(prisma.renderJob, "create");
  await expect(
    createRender(
      prisma,
      { userId: "test", workspaceId: "test", emailVerified: true },
      { roomId: "room", kind: "RESTYLE", styleKey: "modern", quality: "draft", variations: 3 },
    ),
  ).rejects.toMatchObject({ code: "ASSESSMENT_UNAVAILABLE", status: 503 });
  expect(room).not.toHaveBeenCalled();
  expect(ledger).not.toHaveBeenCalled();
  expect(job).not.toHaveBeenCalled();
  expect(enqueueRender).not.toHaveBeenCalled();
});

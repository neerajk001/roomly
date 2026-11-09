import { createFakeProvider, ProviderError, type ImageProvider } from "@roomdesigner/ai";
import { prisma } from "@roomdesigner/db";
import { describe, expect, it } from "vitest";
import { processRenderJob, type RenderJobDeps } from "./render-generate";
import { claimDiversityRetry, recordDiversityResult } from "./diversity-retry";

interface Fixture {
  workspaceId: string;
  jobId: string;
  userIds: string[];
  projectId: string;
}

async function createFixture(creditsCharged = 4): Promise<Fixture> {
  const suffix = crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Worker Test",
      email: `worker-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  const workspace = await prisma.workspace.create({
    data: { name: "Worker WS", ownerId: user.id },
  });
  const project = await prisma.project.create({
    data: { workspaceId: workspace.id, name: "Worker project" },
  });
  const room = await prisma.room.create({
    data: {
      projectId: project.id,
      name: "Worker room",
      type: "LIVING_ROOM",
      widthMm: 4000,
      lengthMm: 5000,
      heightMm: 2700,
    },
  });
  const asset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      roomId: room.id,
      kind: "ORIGINAL_PHOTO",
      storageKey: `test/${suffix}/source.jpg`,
      mime: "image/jpeg",
      sizeBytes: 100,
      width: 800,
      height: 600,
      confirmedAt: new Date(),
    },
  });
  const job = await prisma.renderJob.create({
    data: {
      workspaceId: workspace.id,
      roomId: room.id,
      kind: "RESTYLE",
      status: "QUEUED",
      styleKey: "modern",
      params: { providerQuality: "medium", size: "1024x1024" },
      sourceAssetId: asset.id,
      variations: 4,
      provider: "test",
      creditsCharged,
    },
  });
  await prisma.creditLedger.createMany({
    data: [
      {
        workspaceId: workspace.id,
        delta: creditsCharged,
        reason: "ADJUSTMENT",
        refId: `seed-${job.id}`,
      },
      {
        workspaceId: workspace.id,
        delta: -creditsCharged,
        reason: "RENDER_RESERVE",
        refId: job.id,
      },
    ],
  });
  return { workspaceId: workspace.id, jobId: job.id, userIds: [user.id], projectId: project.id };
}

async function cleanup(fixture: Fixture): Promise<void> {
  await prisma.renderOutput.deleteMany({ where: { job: { workspaceId: fixture.workspaceId } } });
  await prisma.renderJob.deleteMany({ where: { workspaceId: fixture.workspaceId } });
  await prisma.creditLedger.deleteMany({ where: { workspaceId: fixture.workspaceId } });
  await prisma.asset.deleteMany({ where: { workspaceId: fixture.workspaceId } });
  await prisma.room.deleteMany({ where: { project: { workspaceId: fixture.workspaceId } } });
  await prisma.project.deleteMany({ where: { workspaceId: fixture.workspaceId } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId: fixture.workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: fixture.workspaceId } });
  await prisma.user.deleteMany({ where: { id: { in: fixture.userIds } } });
}

const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
  "base64",
);

function depsWith(provider: ImageProvider, uploads: string[] = []): RenderJobDeps {
  return {
    db: prisma,
    provider,
    download: async () => TINY_JPEG,
    upload: async (input) => {
      uploads.push(input.key);
    },
    now: () => new Date(),
  };
}

const transientProvider: ImageProvider = {
  name: "transient",
  edit: async () => {
    throw new ProviderError("PROVIDER_UNAVAILABLE", "busy", "transient");
  },
};

const permanentProvider: ImageProvider = {
  name: "permanent",
  edit: async () => {
    throw new ProviderError("MODERATION", "Blocked by the provider.", "permanent");
  },
};

async function refundCount(jobId: string): Promise<number> {
  return prisma.creditLedger.count({ where: { reason: "RENDER_REFUND", refId: jobId } });
}

async function balance(workspaceId: string): Promise<number> {
  const aggregate = await prisma.creditLedger.aggregate({
    where: { workspaceId },
    _sum: { delta: true },
  });
  return aggregate._sum.delta ?? 0;
}

describe("processRenderJob", () => {
  it("claims only one diversity retry across concurrent workers and respects spend headroom", async () => {
    const fixture = await createFixture();
    const params = {
      providerQuality: "low" as const,
      size: "1024x1024" as const,
      diversityRetryUsed: false,
    };
    const claim = {
      jobId: fixture.jobId,
      workspaceId: fixture.workspaceId,
      params,
      initialCostMicros: 0,
      limitMicros: 1_000_000_000,
    };
    try {
      await prisma.renderJob.update({
        where: { id: fixture.jobId, workspaceId: fixture.workspaceId },
        data: { status: "RUNNING", params },
      });
      expect(
        await claimDiversityRetry(prisma, { ...claim, workspaceId: "another-workspace" }),
      ).toBe(false);
      expect(await claimDiversityRetry(prisma, { ...claim, limitMicros: 1 })).toBe(false);
      const results = await Promise.all([
        claimDiversityRetry(prisma, claim),
        claimDiversityRetry(prisma, claim),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
      await recordDiversityResult(prisma, {
        jobId: fixture.jobId,
        workspaceId: fixture.workspaceId,
        extraCostMicros: 120,
        report: { similarConcepts: true, retryUsed: false },
      });
      expect(await claimDiversityRetry(prisma, claim)).toBe(false);
      const job = await prisma.renderJob.findFirstOrThrow({
        where: { id: fixture.jobId, workspaceId: fixture.workspaceId },
      });
      expect(job.params).toMatchObject({ diversityRetryUsed: true });
      expect(job.params).toMatchObject({
        diversityReport: { similarConcepts: true, retryUsed: true },
      });
      expect(job.costMicros).toBe(120);
    } finally {
      await cleanup(fixture);
    }
  }, 90_000);

  it("uses every selected style while preserving notes, room constraints and budget", async () => {
    const fixture = await createFixture();
    const prompts: string[] = [];
    const fake = createFakeProvider();
    try {
      await prisma.project.update({
        where: { id: fixture.projectId, workspaceId: fixture.workspaceId },
        data: { keepList: ["Sofa"], renterMode: true },
      });
      await prisma.renderJob.update({
        where: { id: fixture.jobId, workspaceId: fixture.workspaceId },
        data: {
          variations: 3,
          styleKey: "indian-minimal",
          params: {
            providerQuality: "low",
            size: "1024x1024",
            traditionKey: "india",
            styleKeys: ["indian-minimal", "indian-craft", "indian-heritage"],
            budgetTier: "budget",
            notes: "Leave space for reading",
            stagingItems: ["lighting", "storage"],
          },
        },
      });
      const provider: ImageProvider = {
        name: "recording-fake",
        edit: async (input) => {
          expect(input.image).toEqual(TINY_JPEG);
          prompts.push(input.prompt);
          return fake.edit(input);
        },
      };
      expect(
        await processRenderJob(depsWith(provider), {
          jobId: fixture.jobId,
          retryCount: 0,
          retryLimit: 0,
        }),
      ).toBe("ok");
      expect(prompts).toHaveLength(3);
      for (const [index, label] of [
        "Indian minimal",
        "Indian craft",
        "Indian heritage",
      ].entries()) {
        expect(prompts[index]).toContain(label);
        expect(prompts[index]).toContain("Sofa");
        expect(prompts[index]).toContain("Leave space for reading");
        expect(prompts[index]).toContain("affordable off-the-shelf");
        expect(prompts[index]).toContain("lighting, storage");
      }
      const job = await prisma.renderJob.findFirstOrThrow({
        where: { id: fixture.jobId, workspaceId: fixture.workspaceId },
        include: { outputs: true },
      });
      expect(job.status).toBe("SUCCEEDED");
      expect(job.outputs).toHaveLength(3);
    } finally {
      await cleanup(fixture);
    }
  }, 90_000);

  it("succeeds with the fake provider and creates 4 outputs", async () => {
    const fixture = await createFixture();
    const uploads: string[] = [];
    try {
      const outcome = await processRenderJob(depsWith(createFakeProvider(), uploads), {
        jobId: fixture.jobId,
        retryCount: 0,
        retryLimit: 2,
      });
      expect(outcome).toBe("ok");

      const job = await prisma.renderJob.findUniqueOrThrow({
        where: { id: fixture.jobId },
        include: { outputs: true },
      });
      expect(job.status).toBe("SUCCEEDED");
      expect(job.outputs).toHaveLength(4);
      expect(job.outputs.every((output) => output.thumbAssetId !== null)).toBe(true);
      expect(job.attempts).toBe(1);
      expect(job.costMicros).toBe(0);
      expect(job.model).toBe("fake");
      expect(uploads).toHaveLength(8);
      expect(await balance(fixture.workspaceId)).toBe(0);
      expect(await refundCount(fixture.jobId)).toBe(0);
    } finally {
      await cleanup(fixture);
    }
  });

  it("returns retry for a transient error before the last attempt", async () => {
    const fixture = await createFixture();
    try {
      const outcome = await processRenderJob(depsWith(transientProvider), {
        jobId: fixture.jobId,
        retryCount: 0,
        retryLimit: 2,
      });
      expect(outcome).toBe("retry");
      const job = await prisma.renderJob.findUniqueOrThrow({ where: { id: fixture.jobId } });
      expect(job.status).toBe("QUEUED");
      expect(job.attempts).toBe(1);
      expect(await refundCount(fixture.jobId)).toBe(0);

      // A retry can still succeed.
      const retryOutcome = await processRenderJob(depsWith(createFakeProvider()), {
        jobId: fixture.jobId,
        retryCount: 1,
        retryLimit: 2,
      });
      expect(retryOutcome).toBe("ok");
      const succeeded = await prisma.renderJob.findUniqueOrThrow({
        where: { id: fixture.jobId },
        include: { outputs: true },
      });
      expect(succeeded.status).toBe("SUCCEEDED");
      expect(succeeded.outputs).toHaveLength(4);
      expect(succeeded.attempts).toBe(2);
    } finally {
      await cleanup(fixture);
    }
  });

  it("fails permanently and refunds exactly once", async () => {
    const fixture = await createFixture();
    try {
      const outcome = await processRenderJob(depsWith(permanentProvider), {
        jobId: fixture.jobId,
        retryCount: 0,
        retryLimit: 2,
      });
      expect(outcome).toBe("ok");
      const job = await prisma.renderJob.findUniqueOrThrow({ where: { id: fixture.jobId } });
      expect(job.status).toBe("FAILED");
      expect(job.errorCode).toBe("MODERATION");
      expect(await refundCount(fixture.jobId)).toBe(1);
      expect(await balance(fixture.workspaceId)).toBe(4);

      // Terminal jobs exit without a second refund.
      await processRenderJob(depsWith(permanentProvider), {
        jobId: fixture.jobId,
        retryCount: 2,
        retryLimit: 2,
      });
      expect(await refundCount(fixture.jobId)).toBe(1);
    } finally {
      await cleanup(fixture);
    }
  });

  it("fails and refunds when the last transient attempt fails", async () => {
    const fixture = await createFixture();
    try {
      const outcome = await processRenderJob(depsWith(transientProvider), {
        jobId: fixture.jobId,
        retryCount: 2,
        retryLimit: 2,
      });
      expect(outcome).toBe("ok");
      const job = await prisma.renderJob.findUniqueOrThrow({ where: { id: fixture.jobId } });
      expect(job.status).toBe("FAILED");
      expect(await refundCount(fixture.jobId)).toBe(1);
      expect(await balance(fixture.workspaceId)).toBe(4);
    } finally {
      await cleanup(fixture);
    }
  });
});

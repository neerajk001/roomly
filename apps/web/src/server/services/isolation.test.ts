import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppError } from "../app-error";
import { getProject, renameProject, softDeleteProject } from "./projects";
import { createRoom, deleteRoom, getRoom, updateRoom } from "./rooms";
import { createRender } from "./renders";
import { createClient, getClient, updateClient, softDeleteClient } from "./clients";
import { createBriefLink, listBriefLinks } from "./briefs";
import { createRateCard, getRateCard, setDefaultRateCard, updateRateCard } from "./rate-cards";
import { getEstimateDraft, saveStudioEstimate } from "./studio-estimates";
import { createProposal, listProposals, sendProposal, updateProposalDraft } from "./proposals";

const suffix = crypto.randomUUID();
let userA = "";
let userB = "";
let workspaceA = "";
let workspaceB = "";
let projectA = "";
let projectB = "";
let roomA = "";
let roomB = "";

const ctxA = (): { userId: string; workspaceId: string; emailVerified: boolean } => ({
  userId: userA,
  workspaceId: workspaceA,
  emailVerified: true,
});
const ctxB = (): { userId: string; workspaceId: string; emailVerified: boolean } => ({
  userId: userB,
  workspaceId: workspaceB,
  emailVerified: true,
});

async function createTenant(label: string): Promise<{ userId: string; workspaceId: string }> {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: `${label} Owner`,
      email: `${label}-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  const workspace = await prisma.workspace.create({
    data: { name: `${label} workspace`, ownerId: user.id },
  });
  return { userId: user.id, workspaceId: workspace.id };
}

beforeAll(async () => {
  const a = await createTenant("iso-a");
  const b = await createTenant("iso-b");
  userA = a.userId;
  workspaceA = a.workspaceId;
  userB = b.userId;
  workspaceB = b.workspaceId;

  const pa = await prisma.project.create({ data: { workspaceId: workspaceA, name: "A project" } });
  const pb = await prisma.project.create({ data: { workspaceId: workspaceB, name: "B project" } });
  projectA = pa.id;
  projectB = pb.id;

  const ra = await prisma.room.create({
    data: { projectId: projectA, name: "A room", widthMm: 4000, lengthMm: 5000, heightMm: 2700 },
  });
  const rb = await prisma.room.create({
    data: { projectId: projectB, name: "B room", widthMm: 4000, lengthMm: 5000, heightMm: 2700 },
  });
  roomA = ra.id;
  roomB = rb.id;

  await prisma.creditLedger.create({
    data: {
      workspaceId: workspaceA,
      delta: 10,
      reason: "ADJUSTMENT",
      refId: `seed-${workspaceA}`,
    },
  });
});

afterAll(async () => {
  const workspaceIds = [workspaceA, workspaceB];
  await prisma.proposal.deleteMany({ where: { project: { workspaceId: { in: workspaceIds } } } });
  await prisma.estimate.deleteMany({ where: { project: { workspaceId: { in: workspaceIds } } } });
  await prisma.briefLink.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.client.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.rateCard.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.renderJob.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.creditLedger.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.asset.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.room.deleteMany({ where: { project: { workspaceId: { in: workspaceIds } } } });
  await prisma.project.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  await prisma.$disconnect();
});

describe("tenant isolation (V2 services)", () => {
  it("isolates Pro clients, brief links, rate cards, estimates and proposals", async () => {
    const client = await createClient(prisma, ctxB(), { name: "Private B client" });
    await expect(getClient(prisma, ctxA(), client.id)).rejects.toBeInstanceOf(AppError);
    await expect(
      updateClient(prisma, ctxA(), client.id, { name: "Stolen" }),
    ).rejects.toBeInstanceOf(AppError);
    await expect(softDeleteClient(prisma, ctxA(), client.id)).rejects.toBeInstanceOf(AppError);
    const brief = await createBriefLink(prisma, ctxB(), { clientId: client.id });
    await expect(createBriefLink(prisma, ctxA(), { clientId: client.id })).rejects.toBeInstanceOf(
      AppError,
    );
    expect(await listBriefLinks(prisma, ctxA(), client.id)).toEqual([]);
    expect((await listBriefLinks(prisma, ctxB(), client.id))[0]?.id).toBe(brief.id);
    const card = await createRateCard(prisma, ctxB(), "B private rates");
    await expect(getRateCard(prisma, ctxA(), card.id)).rejects.toBeInstanceOf(AppError);
    await expect(setDefaultRateCard(prisma, ctxA(), card.id)).rejects.toBeInstanceOf(AppError);
    await expect(
      updateRateCard(prisma, ctxA(), card.id, {
        name: "Stolen",
        markupBps: 0,
        taxBps: 0,
        items: [
          { key: "test", label: "Test", category: "Test", unit: "LUMP_SUM", unitPriceMinor: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(AppError);
    const estimateInput = {
      roomId: roomB,
      rateCardId: card.id,
      lines: [
        {
          label: "Private line",
          category: "Test",
          unit: "LUMP_SUM" as const,
          quantity: 1,
          unitPriceMinor: 100,
        },
      ],
    };
    const estimate = await saveStudioEstimate(prisma, ctxB(), estimateInput);
    await expect(getEstimateDraft(prisma, ctxA(), roomB)).rejects.toBeInstanceOf(AppError);
    await expect(saveStudioEstimate(prisma, ctxA(), estimateInput)).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(
      saveStudioEstimate(prisma, ctxA(), { ...estimateInput, roomId: roomA }),
    ).rejects.toBeInstanceOf(AppError);
    const asset = await prisma.asset.create({
      data: {
        workspaceId: workspaceB,
        roomId: roomB,
        kind: "RENDER",
        storageKey: `test/${suffix}/private.jpg`,
        mime: "image/jpeg",
        sizeBytes: 10,
        confirmedAt: new Date(),
      },
    });
    const job = await prisma.renderJob.create({
      data: {
        workspaceId: workspaceB,
        roomId: roomB,
        kind: "RESTYLE",
        status: "SUCCEEDED",
        params: {},
        sourceAssetId: asset.id,
        variations: 1,
        provider: "fake",
        creditsCharged: 0,
      },
    });
    const output = await prisma.renderOutput.create({
      data: { jobId: job.id, assetId: asset.id, index: 0 },
    });
    const input = {
      projectId: projectB,
      estimateId: estimate.id,
      title: "Private B proposal",
      options: [{ outputId: output.id }],
    };
    const proposal = await createProposal(prisma, ctxB(), input);
    expect(await listProposals(prisma, ctxA(), projectB)).toEqual([]);
    await expect(createProposal(prisma, ctxA(), input)).rejects.toBeInstanceOf(AppError);
    await expect(sendProposal(prisma, ctxA(), proposal.id)).rejects.toBeInstanceOf(AppError);
    await expect(
      updateProposalDraft(prisma, ctxA(), proposal.id, input, proposal.updatedAt.toISOString()),
    ).rejects.toBeInstanceOf(AppError);
    expect((await getClient(prisma, ctxB(), client.id)).client.name).toBe("Private B client");
    expect((await getRateCard(prisma, ctxB(), card.id)).name).toBe("B private rates");
  }, 60_000);
  it("projects cannot be read, renamed or deleted across workspaces", async () => {
    await expect(getProject(prisma, ctxA(), projectB)).rejects.toBeInstanceOf(AppError);
    await expect(renameProject(prisma, ctxA(), projectB, "Hijacked")).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(softDeleteProject(prisma, ctxA(), projectB)).rejects.toBeInstanceOf(AppError);

    const stillThere = await prisma.project.findFirst({
      where: { id: projectB, workspaceId: workspaceB, deletedAt: null },
    });
    expect(stillThere?.name).toBe("B project");
  });

  it("rooms cannot be read, updated, deleted or created across workspaces", async () => {
    await expect(getRoom(prisma, ctxA(), roomB)).rejects.toBeInstanceOf(AppError);
    await expect(
      updateRoom(prisma, ctxA(), roomB, {
        name: "Hijacked",
        type: "BEDROOM",
        widthMm: 3000,
        lengthMm: 3000,
        heightMm: 2400,
        openings: [],
      }),
    ).rejects.toBeInstanceOf(AppError);
    await expect(deleteRoom(prisma, ctxA(), roomB)).rejects.toBeInstanceOf(AppError);
    await expect(
      createRoom(prisma, ctxA(), projectB, {
        name: "Injected room",
        type: "BEDROOM",
        widthMm: 3000,
        lengthMm: 3000,
        heightMm: 2400,
        openings: [],
      }),
    ).rejects.toBeInstanceOf(AppError);

    expect(await prisma.room.count({ where: { projectId: projectB } })).toBe(1);
  });

  it("renders cannot be created against another workspace's room", async () => {
    await expect(
      createRender(prisma, ctxA(), {
        roomId: roomB,
        kind: "RESTYLE",
        styleKey: "modern",
        variations: 1,
        quality: "draft",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("the daily spend guard blocks new renders", async () => {
    await prisma.renderJob.create({
      data: {
        workspaceId: workspaceA,
        roomId: roomA,
        kind: "RESTYLE",
        status: "SUCCEEDED",
        params: { providerQuality: "medium", size: "1024x1024" },
        sourceAssetId: (
          await prisma.asset.create({
            data: {
              workspaceId: workspaceA,
              roomId: roomA,
              kind: "ORIGINAL_PHOTO",
              storageKey: `test/${suffix}/photo.jpg`,
              mime: "image/jpeg",
              sizeBytes: 100,
              confirmedAt: new Date(),
            },
          })
        ).id,
        variations: 1,
        provider: "fake",
        creditsCharged: 1,
        costMicros: 6_000_000,
      },
    });

    await expect(
      createRender(prisma, ctxA(), {
        roomId: roomA,
        kind: "RESTYLE",
        styleKey: "modern",
        variations: 1,
        quality: "draft",
      }),
    ).rejects.toMatchObject({ code: "SERVICE_BUSY" });
  });

  it("unverified users cannot spend credits", async () => {
    await expect(
      createRender(
        prisma,
        { ...ctxB(), emailVerified: false },
        { roomId: roomB, kind: "RESTYLE", styleKey: "modern", variations: 1, quality: "draft" },
      ),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });
});

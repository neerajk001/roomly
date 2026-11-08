import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addProposalComment,
  approveProposal,
  createProposal,
  getPublicProposal,
  requestChanges,
  sendProposal,
} from "./proposals";
import { parseCsv } from "../csv";

const suffix = crypto.randomUUID();
let userId = "";
let workspaceId = "";
let projectId = "";
let estimateId = "";
let outputId = "";
let proposalId = "";
let token = "";

const ctx = (): { userId: string; workspaceId: string } => ({ userId, workspaceId });
const sign = async (key: string): Promise<string> => `signed:${key}`;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Proposal Owner",
      email: `prop-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({
    data: { name: "Proposal WS", ownerId: user.id },
  });
  workspaceId = workspace.id;
  const project = await prisma.project.create({
    data: { workspaceId: workspace.id, name: "Proposal project" },
  });
  projectId = project.id;
  const room = await prisma.room.create({
    data: { projectId: project.id, name: "Room", type: "LIVING_ROOM" },
  });
  const asset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      roomId: room.id,
      kind: "RENDER",
      storageKey: `test/${suffix}/render.jpg`,
      mime: "image/jpeg",
      sizeBytes: 10,
      confirmedAt: new Date(),
    },
  });
  const job = await prisma.renderJob.create({
    data: {
      workspaceId: workspace.id,
      roomId: room.id,
      kind: "RESTYLE",
      status: "SUCCEEDED",
      params: { providerQuality: "low", size: "1024x1024" },
      sourceAssetId: asset.id,
      variations: 1,
      provider: "fake",
      creditsCharged: 1,
    },
  });
  const output = await prisma.renderOutput.create({
    data: { jobId: job.id, assetId: asset.id, index: 0, isFavorite: true },
  });
  outputId = output.id;
  const estimate = await prisma.estimate.create({
    data: {
      projectId: project.id,
      roomId: room.id,
      currency: "USD",
      subtotalMinor: 100000,
      markupMinor: 10000,
      taxMinor: 5000,
      totalMinor: 115000,
    },
  });
  estimateId = estimate.id;
});

afterAll(async () => {
  await prisma.proposalComment.deleteMany({ where: { proposal: { project: { workspaceId } } } });
  await prisma.proposal.deleteMany({ where: { project: { workspaceId } } });
  await prisma.estimateLine.deleteMany({ where: { estimate: { project: { workspaceId } } } });
  await prisma.estimate.deleteMany({ where: { project: { workspaceId } } });
  await prisma.renderOutput.deleteMany({ where: { job: { workspaceId } } });
  await prisma.renderJob.deleteMany({ where: { workspaceId } });
  await prisma.asset.deleteMany({ where: { workspaceId } });
  await prisma.room.deleteMany({ where: { project: { workspaceId } } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("proposal state machine", () => {
  it("does not expose drafts or accept client actions before sending", async () => {
    const draft = await createProposal(prisma, ctx(), {
      projectId,
      estimateId,
      title: "Private draft",
      options: [{ outputId }],
    });
    await expect(getPublicProposal(prisma, draft.publicToken, sign)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      approveProposal(prisma, draft.publicToken, outputId, "Client"),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(
      requestChanges(prisma, draft.publicToken, "Client", "Changes please"),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(
      addProposalComment(prisma, draft.publicToken, "Client", "Comment"),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("allows only one competing approval or change request to succeed", async () => {
    const draft = await createProposal(prisma, ctx(), {
      projectId,
      estimateId,
      title: "Concurrent actions",
      options: [{ outputId }],
    });
    const sent = await sendProposal(prisma, ctx(), draft.id);
    const results = await Promise.allSettled([
      approveProposal(prisma, sent.token, outputId, "Client"),
      requestChanges(prisma, sent.token, "Client", "Please revise"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const stored = await prisma.proposal.findFirstOrThrow({
      where: { id: draft.id, project: { workspaceId } },
      include: { comments: true },
    });
    expect(stored.comments).toHaveLength(stored.status === "CHANGES_REQUESTED" ? 1 : 0);
    if (stored.status === "APPROVED") expect(stored.approvedOutputId).toBe(outputId);
  });

  it("requires a client name", async () => {
    const draft = await createProposal(prisma, ctx(), {
      projectId,
      estimateId,
      title: "Named approval",
      options: [{ outputId }],
    });
    const sent = await sendProposal(prisma, ctx(), draft.id);
    await expect(approveProposal(prisma, sent.token, outputId, "  ")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(addProposalComment(prisma, sent.token, "", "Hello")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("creates a draft, sends it and records the first view", async () => {
    const proposal = await createProposal(prisma, ctx(), {
      projectId,
      estimateId,
      title: "Test proposal",
      options: [{ outputId, caption: "Option A" }],
      expiresInDays: 14,
    });
    proposalId = proposal.id;

    const sent = await sendProposal(prisma, ctx(), proposal.id);
    token = sent.token;
    const view = await getPublicProposal(prisma, token, sign);
    expect(view.status).toBe("VIEWED");
    expect(view.options[0]?.caption).toBe("Option A");
    expect(view.estimate.totalMinor).toBe(115000);

    const stored = await prisma.proposal.findUniqueOrThrow({ where: { id: proposal.id } });
    expect(stored.viewedAt).not.toBeNull();
  });

  it("rejects sending twice", async () => {
    await expect(sendProposal(prisma, ctx(), proposalId)).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("rejects an option that is not in the proposal", async () => {
    await expect(approveProposal(prisma, token, "not-an-option", "Client")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("approves a valid option and closes the proposal", async () => {
    await approveProposal(prisma, token, outputId, "Client Name");
    const stored = await prisma.proposal.findUniqueOrThrow({ where: { id: proposalId } });
    expect(stored.status).toBe("APPROVED");
    expect(stored.approvedByName).toBe("Client Name");
    expect(stored.approvedOutputId).toBe(outputId);

    await expect(requestChanges(prisma, token, "Client", "Change it")).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });
});

describe("change requests and comments", () => {
  it("records a change request as a client comment", async () => {
    const second = await createProposal(prisma, ctx(), {
      projectId,
      estimateId,
      title: "Second proposal",
      options: [{ outputId }],
    });
    const sent = await sendProposal(prisma, ctx(), second.id);
    await getPublicProposal(prisma, sent.token, sign);
    await requestChanges(prisma, sent.token, "Client", "Please make it warmer.");
    const stored = await prisma.proposal.findUniqueOrThrow({
      where: { id: second.id },
      include: { comments: true },
    });
    expect(stored.status).toBe("CHANGES_REQUESTED");
    expect(stored.comments[0]?.body).toContain("warmer");
  });

  it("rejects actions on expired proposals", async () => {
    const third = await createProposal(prisma, ctx(), {
      projectId,
      estimateId,
      title: "Expiring proposal",
      options: [{ outputId }],
    });
    const sent = await sendProposal(prisma, ctx(), third.id);
    await prisma.proposal.update({
      where: { id: third.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(approveProposal(prisma, sent.token, outputId, "Client")).rejects.toMatchObject({
      code: "EXPIRED",
    });
  });

  it("adds a comment on an open proposal", async () => {
    const fourth = await createProposal(prisma, ctx(), {
      projectId,
      estimateId,
      title: "Comment proposal",
      options: [{ outputId }],
    });
    const sent = await sendProposal(prisma, ctx(), fourth.id);
    await addProposalComment(prisma, sent.token, "Client", "Looks good overall");
    const count = await prisma.proposalComment.count({ where: { proposalId: fourth.id } });
    expect(count).toBe(1);
  });
});

describe("parseCsv", () => {
  it("parses quoted fields and newlines", () => {
    const rows = parseCsv('key,label\npaint,"Paint, walls"\n');
    expect(rows).toEqual([
      ["key", "label"],
      ["paint", "Paint, walls"],
    ]);
  });

  it("parses escaped quotes", () => {
    expect(parseCsv('key,label\nx,"Say ""hi"""\n')[1]?.[1]).toBe('Say "hi"');
  });
});

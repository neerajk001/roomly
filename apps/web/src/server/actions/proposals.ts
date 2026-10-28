"use server";

import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import { getEmailSender } from "@roomdesigner/shared/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { createProposal, proposalInputSchema, sendProposal } from "../services/proposals";
import { renderProposalPdf } from "@roomdesigner/pdf";
import { putObject } from "@roomdesigner/storage";

export interface ProposalFormState {
  error?: string;
  notice?: string;
}

export async function createProposalAction(
  _prev: ProposalFormState,
  formData: FormData,
): Promise<ProposalFormState> {
  let options: unknown;
  try {
    options = JSON.parse(String(formData.get("options") ?? "[]"));
  } catch {
    return { error: "The options could not be read." };
  }
  const parsed = proposalInputSchema.safeParse({
    projectId: formData.get("projectId"),
    estimateId: formData.get("estimateId"),
    title: formData.get("title"),
    intro: formData.get("intro") ?? undefined,
    terms: formData.get("terms") ?? undefined,
    expiresInDays: Number(formData.get("expiresInDays") ?? 14),
    options,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the proposal." };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    await createProposal(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      parsed.data,
    );
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/studio/projects/${parsed.data.projectId}`);
  redirect(`/studio/projects/${parsed.data.projectId}`);
}

export async function sendProposalAction(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get("proposalId"));
  const projectId = z.string().min(1).parse(formData.get("projectId"));
  const { user, workspace } = await requireWorkspace();
  const { token } = await sendProposal(prisma, { userId: user.id, workspaceId: workspace.id }, id);

  const proposal = await prisma.proposal.findFirst({
    where: { id, project: { workspaceId: workspace.id } },
    select: {
      title: true,
      project: { select: { client: { select: { email: true, name: true } } } },
    },
  });
  const clientEmail = proposal?.project.client?.email;
  if (clientEmail !== undefined && clientEmail !== null) {
    void getEmailSender().send({
      to: clientEmail,
      subject: `Your design proposal: ${proposal?.title ?? ""}`,
      text: `Hi ${proposal?.project.client?.name ?? "there"},\n\nYour proposal is ready: ${getServerEnv().APP_URL}/p/${token}\n\nYou can approve an option or request changes there.\n`,
    });
  }

  revalidatePath(`/studio/projects/${projectId}`);
}
/** Generates the proposal PDF on demand and stores it in S3. */
export async function generateProposalPdfAction(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get("proposalId"));
  const projectId = z.string().min(1).parse(formData.get("projectId"));
  const { user, workspace } = await requireWorkspace();
  const proposal = await prisma.proposal.findFirst({
    where: { id, project: { workspaceId: workspace.id } },
    include: {
      estimate: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
      project: { select: { name: true, client: { select: { name: true } } } },
    },
  });
  if (proposal === null) throw new AppError("NOT_FOUND", "Proposal not found.", 404);

  const captions = (proposal.optionCaptions ?? {}) as Record<string, string>;
  const buffer = await renderProposalPdf({
    brandName: workspace.brandName ?? workspace.name,
    title: proposal.title,
    projectName: proposal.project.name,
    clientName: proposal.project.client?.name ?? null,
    intro: proposal.intro,
    terms: proposal.terms,
    currency: proposal.estimate.currency,
    estimateVersion: proposal.estimate.version,
    lines: proposal.estimate.lines.map((line) => ({
      label: line.label,
      quantity: line.quantity.toNumber(),
      totalMinor: line.totalMinor,
    })),
    subtotalMinor: proposal.estimate.subtotalMinor,
    markupMinor: proposal.estimate.markupMinor,
    taxMinor: proposal.estimate.taxMinor,
    totalMinor: proposal.estimate.totalMinor,
    options: proposal.renderOutputIds.map((outputId) => ({
      caption: captions[outputId] ?? "",
    })),
  });

  const key = `ws/${workspace.id}/pdf/${proposal.id}.pdf`;
  await putObject({ key, body: buffer, contentType: "application/pdf" });
  await prisma.proposal.update({ where: { id: proposal.id }, data: { pdfStorageKey: key } });
  revalidatePath(`/studio/projects/${projectId}`);
  void user;
}
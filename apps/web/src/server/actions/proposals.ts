"use server";

import { prisma } from "@roomdesigner/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import {
  createProposal,
  updateProposalDraft,
  proposalInputSchema,
  sendProposal,
} from "../services/proposals";
import { storeProposalPdf } from "../services/proposal-pdf";

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
    revisesId: formData.get("revisesId") ?? undefined,
    supersedePrevious: formData.get("supersedePrevious") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the proposal." };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    const editingId = formData.get("proposalId");
    if (typeof editingId === "string" && editingId !== "") {
      await updateProposalDraft(
        prisma,
        { userId: user.id, workspaceId: workspace.id },
        editingId,
        parsed.data,
        String(formData.get("updatedAt") ?? ""),
      );
    } else {
      await createProposal(prisma, { userId: user.id, workspaceId: workspace.id }, parsed.data);
    }
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
  const ctx = { userId: user.id, workspaceId: workspace.id };
  const pdfKey = await storeProposalPdf(prisma, ctx, id);
  await sendProposal(prisma, ctx, id, pdfKey);

  revalidatePath(`/studio/projects/${projectId}`);
}
/** Generates the proposal PDF on demand and stores it in S3. */
export async function generateProposalPdfAction(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get("proposalId"));
  const projectId = z.string().min(1).parse(formData.get("projectId"));
  const { user, workspace } = await requireWorkspace();
  await storeProposalPdf(prisma, { userId: user.id, workspaceId: workspace.id }, id);
  revalidatePath(`/studio/projects/${projectId}`);
  void user;
}

export async function deliverProposalAction(
  _prev: ProposalFormState,
  formData: FormData,
): Promise<ProposalFormState> {
  const operation = z.enum(["pdf", "send"]).safeParse(formData.get("operation"));
  if (!operation.success) return { error: "Choose a proposal action." };
  try {
    if (operation.data === "send") await sendProposalAction(formData);
    else await generateProposalPdfAction(formData);
    return {
      notice:
        operation.data === "send"
          ? "Proposal sent. Copy the client link below; email delivery runs in the background when a client email is available."
          : "PDF prepared. Preview it before sending.",
    };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    return { error: "The proposal could not be prepared. Please try again." };
  }
}

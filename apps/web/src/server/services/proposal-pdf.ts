import { randomUUID } from "node:crypto";
import type { Prisma } from "@roomdesigner/db";
import { getObject, putObject, makeWebVersion } from "@roomdesigner/storage";
import { renderProposalPdf } from "@roomdesigner/pdf";
import { AppError } from "../app-error";
import type { ServiceContext } from "./context";
import { loadProposalDocument } from "./proposal-snapshot";

export async function buildProposalPdf(db: Prisma, ctx: ServiceContext, proposalId: string) {
  const { proposal, document } = await loadProposalDocument(db, ctx.workspaceId, proposalId);
  if (proposal.status !== "DRAFT" && proposal.pdfStorageKey !== null)
    return { buffer: await getObject(proposal.pdfStorageKey), proposal, document };
  const image = async (key: string) => (await makeWebVersion(await getObject(key), 1400)).data;
  try {
    const options = await Promise.all(
      document.options.map(async (option) => ({
        caption: option.caption ?? "",
        image: await image(option.storageKey),
        ...(option.beforeKey !== null ? { beforeImage: await image(option.beforeKey) } : {}),
      })),
    );
    const buffer = await renderProposalPdf({
      brandName: document.brandName,
      brandColor: document.brandColor ?? undefined,
      ...(document.logoStorageKey !== null ? { logo: await image(document.logoStorageKey) } : {}),
      title: document.title,
      projectName: document.projectName,
      clientName: document.clientName,
      intro: document.intro,
      terms: document.terms,
      currency: document.currency,
      estimateVersion: document.estimate.version,
      lines: document.estimate.lines,
      subtotalMinor: document.estimate.subtotalMinor,
      markupMinor: document.estimate.markupMinor,
      taxMinor: document.estimate.taxMinor,
      totalMinor: document.estimate.totalMinor,
      lowMinor: document.estimate.lowMinor,
      highMinor: document.estimate.highMinor,
      options,
    });
    return { buffer, proposal, document };
  } catch {
    throw new AppError(
      "PDF_UNAVAILABLE",
      "The PDF could not be prepared. Check that the proposal images are available and try again.",
      503,
    );
  }
}

export async function storeProposalPdf(db: Prisma, ctx: ServiceContext, proposalId: string) {
  const prepared = await buildProposalPdf(db, ctx, proposalId);
  if (prepared.proposal.status !== "DRAFT" && prepared.proposal.pdfStorageKey !== null)
    return prepared.proposal.pdfStorageKey;
  const key = `ws/${ctx.workspaceId}/pdf/${proposalId}-${randomUUID()}.pdf`;
  await putObject({ key, body: prepared.buffer, contentType: "application/pdf" });
  const stored = await db.proposal.updateMany({
    where: {
      id: proposalId,
      updatedAt: prepared.proposal.updatedAt,
      status: prepared.proposal.status,
      project: { workspaceId: ctx.workspaceId, deletedAt: null },
    },
    data: { pdfStorageKey: key, snapshot: prepared.document },
  });
  if (stored.count !== 1)
    throw new AppError(
      "INVALID_STATE",
      "The proposal changed while preparing its PDF. Refresh and try again.",
      409,
    );
  return key;
}

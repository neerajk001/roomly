import type { Prisma } from "@roomdesigner/db";
import type { EmailSender } from "@roomdesigner/shared/email";
import { z } from "zod";

const eventKind = z.enum(["SENT", "VIEWED", "APPROVED", "CHANGES_REQUESTED", "COMMENT"]);
const snapshotRecipient = z.object({
  clientEmail: z.string().nullable(),
  clientName: z.string().nullable(),
  title: z.string(),
});

/** Durable outbox: claim an event, send with a stable key, then mark completion. */
export async function processProposalEmails({
  db,
  sender,
  appUrl,
  now = new Date(),
  workspaceId,
}: {
  db: Prisma;
  sender: EmailSender;
  appUrl: string;
  now?: Date;
  workspaceId?: string;
}) {
  const stale = new Date(now.getTime() - 5 * 60 * 1000);
  const events = await db.proposalEmail.findMany({
    where: {
      ...(workspaceId !== undefined ? { workspaceId } : {}),
      sentAt: null,
      attempts: { lt: 10 },
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: stale } }],
    },
    orderBy: { createdAt: "asc" },
    take: 25,
  });
  let sent = 0;
  let failed = 0;
  for (const event of events) {
    const kind = eventKind.safeParse(event.kind);
    if (!kind.success) {
      failed += 1;
      continue;
    }
    const claimed = await db.proposalEmail.updateMany({
      where: {
        id: event.id,
        workspaceId: event.workspaceId,
        sentAt: null,
        attempts: event.attempts,
        OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: stale } }],
      },
      data: { attempts: { increment: 1 }, lastAttemptAt: now },
    });
    if (claimed.count !== 1) continue;
    try {
      const proposal = await db.proposal.findFirst({
        where: {
          id: event.proposalId,
          project: { workspaceId: event.workspaceId, deletedAt: null },
        },
        include: {
          project: {
            include: {
              client: true,
              workspace: { include: { owner: { select: { email: true } } } },
            },
          },
        },
      });
      if (proposal === null) {
        await db.proposalEmail.updateMany({
          where: { id: event.id, workspaceId: event.workspaceId },
          data: { sentAt: now },
        });
        continue;
      }
      const snapshot = snapshotRecipient.safeParse(proposal.snapshot);
      const title = snapshot.success ? snapshot.data.title : proposal.title;
      const recipient =
        kind.data === "SENT"
          ? snapshot.success
            ? snapshot.data.clientEmail
            : proposal.project.client?.email
          : proposal.project.workspace.owner.email;
      if (recipient !== undefined && recipient !== null && recipient !== "") {
        const comment =
          event.commentId === null
            ? null
            : await db.proposalComment.findFirst({
                where: {
                  id: event.commentId,
                  proposalId: proposal.id,
                  proposal: { project: { workspaceId: event.workspaceId } },
                },
                select: { authorName: true, body: true },
              });
        const label = {
          SENT: "Your design proposal",
          VIEWED: "Proposal viewed",
          APPROVED: "Proposal approved",
          CHANGES_REQUESTED: "Proposal changes requested",
          COMMENT: "New proposal comment",
        }[kind.data];
        const link =
          kind.data === "SENT"
            ? `${appUrl}/p/${proposal.publicToken}`
            : `${appUrl}/studio/projects/${proposal.projectId}#proposals`;
        await sender.send({
          to: recipient,
          subject: `${label}: ${title}`,
          text: `${label}: ${title}\n\n${link}${kind.data === "SENT" && proposal.pdfStorageKey !== null ? `\nPDF: ${appUrl}/api/p/${proposal.publicToken}/pdf` : ""}${comment !== null ? `\n\n${comment.authorName}: ${comment.body}` : ""}`,
          idempotencyKey: `proposal-event/${event.id}`,
        });
      }
      await db.proposalEmail.updateMany({
        where: { id: event.id, workspaceId: event.workspaceId },
        data: { sentAt: now },
      });
      sent += 1;
    } catch {
      // Keep the event pending. Never log provider response bodies or recipients.
      failed += 1;
    }
  }
  return { sent, failed };
}

import { CopyLinkButton } from "@/components/copy-link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import { formatMoney } from "@roomdesigner/shared";
import { generateProposalPdfAction, sendProposalAction } from "@/server/actions/proposals";
import { requireWorkspace } from "@/server/auth/session";
import { listProposals } from "@/server/services/proposals";
import Link from "next/link";

export async function ProposalsPanel({ projectId }: { projectId: string }) {
  const { user, workspace } = await requireWorkspace();
  const proposals = await listProposals(
    prisma,
    { userId: user.id, workspaceId: workspace.id },
    projectId,
  );
  const base = getServerEnv().APP_URL;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposals</CardTitle>
        <CardDescription>
          Send a branded proposal with pinned options and the estimate; the client approves with a
          link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposals.length > 0 && (
          <ul className="divide-y divide-border">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    v{proposal.version} · {proposal.title}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{proposal.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {proposal.sentAt !== null
                    ? `sent ${proposal.sentAt.toLocaleDateString()}`
                    : "not sent"}
                  {" · "}
                  {proposal._count.comments} comments
                  {proposal.status === "APPROVED" && proposal.approvedByName !== null
                    ? ` · approved by ${proposal.approvedByName}`
                    : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {proposal.status === "DRAFT" && (
                    <form action={sendProposalAction}>
                      <input type="hidden" name="proposalId" value={proposal.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <Button type="submit" size="sm">
                        Send to client
                      </Button>
                    </form>
                  )}
                  {proposal.status !== "DRAFT" && (
                    <CopyLinkButton url={`${base}/p/${proposal.publicToken}`} label="Copy client link" />
                  )}
                  <form action={generateProposalPdfAction}>
                    <input type="hidden" name="proposalId" value={proposal.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <Button type="submit" size="sm" variant="outline">
                      Generate PDF
                    </Button>
                  </form>
                  {proposal.pdfStorageKey !== null && (
                    <span className="text-xs text-muted-foreground">PDF ready (client link)</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button asChild size="sm" variant="outline">
          <Link href={`/studio/projects/${projectId}/proposals/new`}>New proposal</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Generate a PDF for your proposal, then send the client link to collect approval.
        </p>
        {void formatMoney}
      </CardContent>
    </Card>
  );
}

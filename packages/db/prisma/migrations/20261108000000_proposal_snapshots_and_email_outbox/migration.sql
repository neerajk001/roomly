-- Additive: retain every existing proposal and its approval history.
ALTER TABLE "Proposal" ADD COLUMN "snapshot" JSONB,
  ADD COLUMN "revisesId" TEXT,
  ADD COLUMN "supersededById" TEXT,
  ADD COLUMN "supersedePrevious" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "ProposalEmail" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "commentId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProposalEmail_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProposalEmail_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProposalEmail_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProposalEmail_dedupeKey_key" ON "ProposalEmail"("dedupeKey");
CREATE INDEX "ProposalEmail_workspaceId_idx" ON "ProposalEmail"("workspaceId");
CREATE INDEX "ProposalEmail_sentAt_lastAttemptAt_idx" ON "ProposalEmail"("sentAt", "lastAttemptAt");

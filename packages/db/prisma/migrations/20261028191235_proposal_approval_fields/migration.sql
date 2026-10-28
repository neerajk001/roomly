-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "approvedByName" TEXT,
ADD COLUMN     "optionCaptions" JSONB NOT NULL DEFAULT '{}';

"use client";
import { useActionState } from "react";
import { deliverProposalAction, type ProposalFormState } from "@/server/actions/proposals";
import { Button } from "@/components/ui/button";

export function ProposalDeliveryControls({
  proposalId,
  projectId,
  draft,
}: {
  proposalId: string;
  projectId: string;
  draft: boolean;
}) {
  const [state, action, pending] = useActionState(deliverProposalAction, {} as ProposalFormState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="projectId" value={projectId} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        name="operation"
        value="pdf"
        disabled={pending}
      >
        Prepare PDF
      </Button>
      {draft && (
        <Button type="submit" size="sm" name="operation" value="send" disabled={pending}>
          {pending ? "Preparing…" : "Send to client"}
        </Button>
      )}
      {state.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="w-full text-sm text-muted-foreground">
          {state.notice}
        </p>
      )}
    </form>
  );
}

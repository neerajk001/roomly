"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicProposal } from "@/server/services/proposals";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProposalActions({
  token,
  proposal,
}: {
  token: string;
  proposal: Pick<
    PublicProposal,
    "status" | "options" | "approvedOutputId" | "approvedByName" | "comments" | "supersededToken"
  >;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "changes" | null>(null);

  const closed =
    proposal.status === "APPROVED" ||
    proposal.status === "CHANGES_REQUESTED" ||
    proposal.supersededToken !== null;
  const expired = proposal.status === "EXPIRED";

  const submit = async (kind: "approve" | "changes" | "comment") => {
    setError(null);
    if (name.trim() === "") {
      setError("Add your name first.");
      return;
    }
    if (kind === "approve" && selected === null) {
      setError("Choose an option to approve.");
      return;
    }
    if (kind !== "approve" && message.trim().length < 3) {
      setError("Add a short message.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/p/${token}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: kind,
          name,
          outputId: kind === "approve" ? selected : undefined,
          message: kind === "approve" ? undefined : message,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? "Could not send that.");
      }
      setMessage("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  };

  if (proposal.status === "APPROVED") {
    const approved = proposal.options.find((option) => option.id === proposal.approvedOutputId);
    return (
      <div className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 p-4 text-sm">
        Approved by {proposal.approvedByName ?? "the client"}
        {approved?.caption !== null && approved?.caption !== undefined
          ? ` — ${approved.caption}`
          : ""}
        .
      </div>
    );
  }
  if (expired) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        This proposal has expired. Ask your designer for an updated version.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error !== null && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {closed && proposal.status === "CHANGES_REQUESTED" && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          Changes requested. Your designer will follow up.
        </p>
      )}
      <div className="space-y-2">
        <label htmlFor="voter-name" className="text-sm font-medium">
          Your name
        </label>
        <Input
          id="voter-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          maxLength={120}
          disabled={closed}
        />
      </div>

      {!closed && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Choose an option</legend>
            <ul className="space-y-2">
              {proposal.options.map((option) => (
                <li key={option.id}>
                  <label
                    className={`flex items-center gap-3 rounded-lg border p-2 ${
                      selected === option.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={option.id}
                      checked={selected === option.id}
                      onChange={() => {
                        setSelected(option.id);
                      }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                    <img
                      src={option.thumbUrl}
                      alt={option.caption ?? "Concept"}
                      className="h-14 w-20 rounded object-cover"
                    />
                    <span className="text-sm">{option.caption ?? "Concept option"}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="proposal-message" className="text-sm font-medium">
              Message (for change requests or comments)
            </label>
            <textarea
              id="proposal-message"
              rows={3}
              maxLength={2000}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
              }}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setAction("approve");
                void submit("approve");
              }}
            >
              {busy && action === "approve" ? "Approving..." : "Approve selected option"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setAction("changes");
                void submit("changes");
              }}
            >
              {busy && action === "changes" ? "Sending..." : "Request changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || message.trim().length < 3}
              onClick={() => {
                void submit("comment");
              }}
            >
              Add comment
            </Button>
          </div>
        </>
      )}

      {proposal.comments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Comments</p>
          <ul className="space-y-2 text-sm">
            {proposal.comments.map((comment) => (
              <li key={comment.id} className="rounded-md bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">
                  {comment.authorName} · {new Date(comment.createdAt).toLocaleString()}
                </p>
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

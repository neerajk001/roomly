"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  createShareLinkAction,
  revokeShareLinkAction,
  type ShareState,
} from "@/server/actions/share";
import { track } from "@/lib/analytics";
import { useEffect, useActionState, useState } from "react";

export function ShareControls({
  embedded = false,
  projectId,
  token,
  onlyFavorites,
  voteCounts,
}: {
  embedded?: boolean;
  projectId: string;
  token: string | null;
  onlyFavorites: boolean;
  voteCounts: { label: string; votes: number }[];
}) {
  const [createState, createAction, creating] = useActionState(
    createShareLinkAction,
    {} as ShareState,
  );
  const [revokeState, revokeAction, revoking] = useActionState(
    revokeShareLinkAction,
    {} as ShareState,
  );
  const [copied, setCopied] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(onlyFavorites);
  const emptyFavorites = favoritesOnly && voteCounts.length === 0;

  useEffect(() => {
    if (createState.notice === "Share link ready.") {
      track("share_created", { onlyFavorites });
    }
  }, [createState.notice, onlyFavorites]);

  const shareUrl =
    token !== null && typeof window !== "undefined"
      ? `${window.location.origin}/share/${token}`
      : null;

  return (
    <Card className={embedded ? "border-0 shadow-none" : ""}>
      {!embedded && (
        <CardHeader>
          <CardTitle>Share for votes</CardTitle>
          <CardDescription>
            A public, no-login gallery. Visitors can vote once per image; you see the counts.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {createState.error !== undefined && (
          <p role="alert" className="text-sm text-destructive">
            {createState.error}
          </p>
        )}
        {revokeState.error !== undefined && (
          <p role="alert" className="text-sm text-destructive">
            {revokeState.error}
          </p>
        )}
        {(createState.notice ?? revokeState.notice) !== undefined && (
          <p role="status" className="text-sm text-muted-foreground">
            {createState.notice ?? revokeState.notice}
          </p>
        )}

        {token !== null && shareUrl !== null ? (
          <div className="space-y-2">
            <p className="break-all rounded-md bg-muted px-3 py-2 text-xs text-foreground">
              {shareUrl}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl).then(() => {
                    setCopied(true);
                  });
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No share link yet.</p>
        )}

        <form action={createAction} className="space-y-3">
          <input type="hidden" name="projectId" value={projectId} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="onlyFavorites"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
            />
            Only show favorited images
          </label>
          {emptyFavorites && (
            <p role="status" className="text-sm text-muted-foreground">
              No favourites yet. Save a design first, or uncheck this option to share all designs in
              this project.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={creating || emptyFavorites}>
              {token === null ? "Create share link" : "Update settings"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Only selected gallery content is shared.</p>
        </form>

        {token !== null && (
          <details>
            <summary className="cursor-pointer text-sm">Manage public link</summary>
            <div className="mt-3 space-y-3">
              {" "}
              <form action={revokeAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <Button type="submit" size="sm" variant="ghost" disabled={revoking}>
                  Revoke
                </Button>
              </form>
              <form action={createAction}>
                <input type="hidden" name="projectId" value={projectId} />
                {onlyFavorites && <input type="hidden" name="onlyFavorites" value="on" />}{" "}
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  name="regenerate"
                  value="1"
                  disabled={creating}
                >
                  Regenerate link
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                Regenerating or revoking disables the old link.
              </p>
            </div>
          </details>
        )}
        {voteCounts.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Votes</Label>
            <ul className="space-y-1 text-sm">
              {voteCounts.map((entry) => (
                <li key={entry.label} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground">{entry.label}</span>
                  <span>{entry.votes}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { CopyLinkButton } from "@/components/copy-link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { getServerEnv } from "@roomdesigner/config/env";
import { createBriefLinkAction, type BriefLinkFormState } from "@/server/actions/briefs";
import { requireWorkspace } from "@/server/auth/session";
import { listBriefLinks } from "@/server/services/briefs";

export async function BriefLinksPanel({ clientId }: { clientId: string }) {
  const { user, workspace } = await requireWorkspace();
  const links = await listBriefLinks(
    prisma,
    { userId: user.id, workspaceId: workspace.id },
    clientId,
  );
  const base = getServerEnv().APP_URL;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brief links</CardTitle>
        <CardDescription>
          Send this link to the client. They answer questions and upload photos without an account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.length > 0 && (
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.id} className="space-y-1 rounded-md border border-border p-2">
                <p className="break-all text-xs text-muted-foreground">{`${base}/brief/${link.token}`}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5">{link.status}</span>
                  {link.expiresAt !== null && (
                    <span className="text-muted-foreground">
                      expires {link.expiresAt.toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {link.submissions} {link.submissions === 1 ? "submission" : "submissions"}
                  </span>
                  <CopyLinkButton url={`${base}/brief/${link.token}`} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            await createBriefLinkAction({} as BriefLinkFormState, formData);
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="clientId" value={clientId} />
          <label className="space-y-1 text-xs text-muted-foreground">
            Expires
            <select
              name="expiresInDays"
              defaultValue="30"
              className="block h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
            >
              <option value="7">in 7 days</option>
              <option value="30">in 30 days</option>
              <option value="90">in 90 days</option>
              <option value="0">never</option>
            </select>
          </label>
          <Button type="submit" size="sm">
            Create brief link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

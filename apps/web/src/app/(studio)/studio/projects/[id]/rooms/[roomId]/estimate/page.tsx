import { EstimateBuilder } from "@/components/studio/estimate-builder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { getEstimateDraft } from "@/server/services/studio-estimates";
import Link from "next/link";

export const metadata = { title: "Estimate" };

export default async function StudioEstimatePage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const { id, roomId } = await params;
  const { user, workspace } = await requireWorkspace();
  const draft = await getEstimateDraft(prisma, { userId: user.id, workspaceId: workspace.id }, roomId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/studio/projects/${id}/rooms/${roomId}`}
          className="text-xs text-muted-foreground underline"
        >
          Back to the room
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Estimate — {draft.roomName}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
          <CardDescription>
            Auto-filled from the room scope. Edit any line; totals recalculate with the shared
            estimate engine. Each save creates a new version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EstimateBuilder
            roomId={draft.roomId}
            rateCardId={draft.rateCardId}
            rateCardName={draft.rateCardName}
            currency={draft.currency}
            markupBps={draft.markupBps}
            taxBps={draft.taxBps}
            lines={draft.lines}
            versions={draft.versions.map((version) => ({
              id: version.id,
              version: version.version,
              totalMinor: version.totalMinor,
              createdAt: version.createdAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

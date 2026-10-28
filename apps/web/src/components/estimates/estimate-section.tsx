import { EstimatePanel } from "@/components/estimates/estimate-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { openingListSchema } from "@/server/services/rooms";
import { getEstimateInputs, getRoughEstimate } from "@/server/services/estimates";
import { requireWorkspace } from "@/server/auth/session";

export async function EstimateSection({
  projectId,
  roomId,
}: {
  projectId: string;
  roomId: string;
}) {
  const { user, workspace } = await requireWorkspace();
  const ctx = { userId: user.id, workspaceId: workspace.id };
  const [inputs, estimate, project] = await Promise.all([
    getEstimateInputs(prisma, ctx, roomId),
    getRoughEstimate(prisma, ctx, roomId, { persist: false }),
    prisma.project.findFirst({
      where: { id: projectId, workspaceId: workspace.id },
      select: { budgetMinor: true },
    }),
  ]);
  const openings = openingListSchema.safeParse(inputs.room.openings);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost range</CardTitle>
        <CardDescription>
          Illustrative defaults for your currency, shown as a rough ±20% range. Toggle categories to
          see the range update.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EstimatePanel
          projectId={projectId}
          roomId={roomId}
          roomType={inputs.room.type}
          widthMm={inputs.room.widthMm}
          lengthMm={inputs.room.lengthMm}
          heightMm={inputs.room.heightMm}
          openings={openings.success ? openings.data : []}
          rateItems={inputs.rateItems}
          scope={inputs.scope}
          currency={estimate.currency}
          budgetMinor={project?.budgetMinor ?? null}
          usedTypicalSize={estimate.usedTypicalSize}
        />
      </CardContent>
    </Card>
  );
}

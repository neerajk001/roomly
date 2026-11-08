import { EstimateBuilder } from "@/components/studio/estimate-builder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { requireWorkspace } from "@/server/auth/session";
import { getEstimateDraft } from "@/server/services/studio-estimates";
import Link from "next/link";
import { AppError } from "@/server/app-error";
import { listRateCards } from "@/server/services/rate-cards";
import { z } from "zod";

export const metadata = { title: "Estimate" };

export default async function StudioEstimatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; roomId: string }>;
  searchParams: Promise<{ version?: string; copy?: string; rateCardId?: string }>;
}) {
  const { id, roomId } = await params;
  const { user, workspace } = await requireWorkspace();
  const query = z
    .object({
      version: z.string().min(1).optional(),
      copy: z.string().min(1).optional(),
      rateCardId: z.string().min(1).optional(),
    })
    .parse(await searchParams);
  const estimatePath = `/studio/projects/${id}/rooms/${roomId}/estimate`;
  const draft = await getEstimateDraft(
    prisma,
    { userId: user.id, workspaceId: workspace.id },
    roomId,
    query.rateCardId,
    query.version ?? query.copy,
  ).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "MEASUREMENTS_REQUIRED") return null;
    throw error;
  });
  if (draft === null)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add room measurements</CardTitle>
          <CardDescription>
            Enter the width, length and ceiling height to calculate an estimate from your rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            className="text-sm underline"
            href={`/studio/projects/${id}/rooms/${roomId}#room-details`}
          >
            Back to room details
          </Link>
        </CardContent>
      </Card>
    );

  const cards = await listRateCards(prisma, { userId: user.id, workspaceId: workspace.id });
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
        <CardContent>
          <form action={estimatePath} method="get" className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              Rate card
              <select
                name="rateCardId"
                defaultValue={draft.rateCardId}
                className="block h-11 w-full rounded-lg border border-input bg-card px-3"
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm">
              Auto-fill from room
            </button>
          </form>
        </CardContent>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
          <CardDescription>
            Auto-filled from the room scope. Edit any line; totals recalculate with the shared
            estimate engine. Each save creates a new version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EstimateBuilder
            key={`${query.version ?? query.copy ?? "new"}:${draft.rateCardId}`}
            estimatePath={estimatePath}
            unitSystem={workspace.unitSystem}
            readOnly={query.version !== undefined}
            selectedVersion={draft.selectedVersion}
            initialRangeBps={draft.rangeBps ?? 0}
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

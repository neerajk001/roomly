import { EstimateSection } from "@/components/estimates/estimate-section";
import { RoomPhotos } from "@/components/projects/room-photos";
import { RenderView } from "@/components/renders/render-view";
import type { RenderJobView } from "@/components/renders/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import { getRoom } from "@/server/services/rooms";
import Link from "next/link";

function formatLength(mm: number | null, unitSystem: string): string {
  if (mm === null) return "—";
  return unitSystem === "IMPERIAL" ? `${(mm / 304.8).toFixed(1)} ft` : `${(mm / 1000).toFixed(2)} m`;
}

export async function RoomDetailView({
  projectId,
  roomId,
  basePath,
}: {
  projectId: string;
  roomId: string;
  basePath: "/app" | "/studio";
}) {
  const { user, workspace } = await requireWorkspace();
  const detail = await getRoom(prisma, { userId: user.id, workspaceId: workspace.id }, roomId);

  const photos = await Promise.all(
    detail.photos.map(async (photo) => ({
      id: photo.id,
      url: await presignGet(photo.storageKey),
    })),
  );

  const jobsRaw = await prisma.renderJob.findMany({
    where: { roomId: detail.room.id, workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: {
      outputs: {
        orderBy: { index: "asc" },
        include: {
          asset: { select: { storageKey: true } },
          thumbAsset: { select: { storageKey: true } },
        },
      },
    },
  });

  const jobViews: RenderJobView[] = await Promise.all(
    jobsRaw.map(async (job) => ({
      id: job.id,
      kind: job.kind,
      status: job.status,
      errorMessage: job.errorMessage,
      creditsCharged: job.creditsCharged,
      label: job.kind === "EDIT" ? (job.instruction ?? "Edit") : "Base concept",
      outputs: await Promise.all(
        job.outputs.map(async (output) => ({
          id: output.id,
          index: output.index,
          isFavorite: output.isFavorite,
          url: await presignGet(output.asset.storageKey),
          thumbUrl: await presignGet(output.thumbAsset?.storageKey ?? output.asset.storageKey),
        })),
      ),
    })),
  );

  const initialJob = jobViews.length > 0 ? (jobViews[jobViews.length - 1] ?? null) : null;

  const sizeLine =
    detail.room.widthMm !== null && detail.room.lengthMm !== null
      ? `${formatLength(detail.room.widthMm, workspace.unitSystem)} × ${formatLength(
          detail.room.lengthMm,
          workspace.unitSystem,
        )}`
      : "Measurements not set";
  const ceilingLine =
    detail.room.heightMm !== null
      ? ` · ceiling ${formatLength(detail.room.heightMm, workspace.unitSystem)}`
      : "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`${basePath}/projects/${projectId}`}
          className="text-xs text-muted-foreground underline"
        >
          Back to {detail.project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {detail.room.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sizeLine}
          {ceilingLine}
        </p>
      </div>

      <section aria-labelledby="generate-heading">
        <h2 id="generate-heading" className="sr-only">
          Generate concepts
        </h2>
        <RenderView
          roomId={detail.room.id}
          projectId={projectId}
          hasPhoto={photos.length > 0}
          initialJob={initialJob}
          history={jobViews}
          sourceUrl={photos[0]?.url ?? null}
        />
      </section>

      <EstimateSection projectId={projectId} roomId={detail.room.id} />

      <Card>
        <CardHeader>
          <CardTitle>Room photos</CardTitle>
          <CardDescription>
            The first photo is used as the source for renders. Photos are stored without EXIF data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomPhotos roomId={detail.room.id} photos={photos} />
        </CardContent>
      </Card>
    </div>
  );
}

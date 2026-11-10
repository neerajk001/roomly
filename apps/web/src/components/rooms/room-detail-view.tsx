import { RoomWorkspace } from "./RoomWorkspace";
import { RoomCostSummary } from "./RoomCostSummary";
import { RoomBriefSummary } from "./RoomBriefSummary";
import {
  outputConceptLabel,
  readDiversityReport,
  outputStyleKey,
  savedConceptAdvice,
  renderSourceOutputId,
  savedEditTarget,
  savedRoomIncludes,
} from "@roomdesigner/shared";
import { EstimateSection } from "@/components/estimates/estimate-section";
import { RoomPhotos } from "@/components/projects/room-photos";
import { HomeRoomResults } from "@/components/rooms/home-room-results";
import { RenderView } from "@/components/renders/render-view";
import type { RenderJobView } from "@/components/renders/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import { getRoughEstimate } from "@/server/services/estimates";
import { getRoom, openingListSchema } from "@/server/services/rooms";
import { RoomForm } from "@/components/projects/room-form";
import { listRoomRenderJobs } from "@/server/services/render-history";
import Link from "next/link";

const ROOM_LABELS: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
  DINING_ROOM: "Dining room",
  HOME_OFFICE: "Home office",
  KIDS_ROOM: "Kids room",
  BALCONY: "Balcony",
  HALLWAY: "Hallway",
  OTHER: "Room",
};

function formatLength(mm: number | null, unitSystem: string): string {
  if (mm === null) return "-";
  return unitSystem === "IMPERIAL"
    ? `${(mm / 304.8).toFixed(1)} ft`
    : `${(mm / 1000).toFixed(2)} m`;
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

  const jobsRaw = await listRoomRenderJobs(
    prisma,
    { userId: user.id, workspaceId: workspace.id },
    detail.room.id,
  );

  const outputByAsset = new Map(
    jobsRaw.flatMap((job) => job.outputs.map((output) => [output.assetId, output.id] as const)),
  );
  const jobViews: RenderJobView[] = await Promise.all(
    jobsRaw.map(async (job) => ({
      id: job.id,
      kind: job.kind,
      status: job.status,
      errorMessage: job.errorMessage,
      creditsCharged: job.creditsCharged,
      label: job.kind === "EDIT" ? (job.instruction ?? "Edit") : "Base concept",
      styleKey: job.styleKey,
      similarConcepts: readDiversityReport(job.params)?.similarConcepts ?? false,
      editTarget: savedEditTarget(job.params),
      includeItems: savedRoomIncludes(job.params),
      sourceOutputId:
        renderSourceOutputId(job.params) ??
        (job.kind === "EDIT" ? (outputByAsset.get(job.sourceAssetId) ?? null) : null),
      outputs: await Promise.all(
        job.outputs.map(async (output) => ({
          id: output.id,
          index: output.index,
          advice: savedConceptAdvice(job.params, output.id),
          styleKey: outputStyleKey(job.params, job.styleKey, output.index),
          directionLabel: outputConceptLabel(
            job.params,
            outputStyleKey(job.params, job.styleKey, output.index),
            output.index,
          ),
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
  const roomLabel = ROOM_LABELS[detail.room.type] ?? "Room";
  const dimensions = `${sizeLine}${ceilingLine}`;
  const openings = openingListSchema.safeParse(detail.room.openings);
  const roomEditor = (
    <section id="room-details" aria-label="Room details">
      <Card>
        <CardHeader>
          <CardTitle>Room details & measurements</CardTitle>
          <CardDescription>
            Update the room, dimensions and openings. Concept visuals use your photo; estimates use
            these measurements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomForm
            projectId={detail.project.id}
            basePath={basePath}
            unitSystem={workspace.unitSystem}
            room={{
              id: detail.room.id,
              name: detail.room.name,
              type: detail.room.type,
              widthMm: detail.room.widthMm ?? undefined,
              lengthMm: detail.room.lengthMm ?? undefined,
              heightMm: detail.room.heightMm ?? undefined,
              openings: openings.success ? openings.data : [],
            }}
          />
        </CardContent>
      </Card>
    </section>
  );

  if (basePath === "/app") {
    const [rough, projectMeta] = await Promise.all([
      getRoughEstimate(prisma, { userId: user.id, workspaceId: workspace.id }, roomId, {
        persist: false,
      }),
      prisma.project.findFirst({
        where: { id: projectId, workspaceId: workspace.id },
        select: { keepList: true, notes: true },
      }),
    ]);
    const top = [...rough.lines]
      .sort((a, b) => b.totalMinor - a.totalMinor)
      .slice(0, 3)
      .map((line) => ({ label: line.label, totalMinor: line.totalMinor }));

    return (
      <RoomWorkspace
        key={detail.room.id}
        hasPhoto={photos.length > 0}
        shoppingHref={`/app/projects/${projectId}/rooms/${roomId}/shopping-list`}
        shareHref={`/app/projects/${projectId}#share`}
        designs={
          <HomeRoomResults
            key={detail.room.id}
            roomId={detail.room.id}
            projectId={projectId}
            roomLabel={roomLabel}
            dimensions={dimensions}
            initialJob={initialJob}
            history={jobViews}
            sourceUrl={photos[0]?.url ?? null}
            notes={projectMeta?.notes ?? null}
          />
        }
        costs={
          <>
            <RoomCostSummary
              estimate={{
                currency: rough.currency,
                lowMinor: rough.lowMinor,
                highMinor: rough.highMinor,
                top,
              }}
            />
            <section id="cost-breakdown" aria-label="Cost breakdown and priorities">
              <EstimateSection projectId={projectId} roomId={detail.room.id} />
            </section>
          </>
        }
        setup={
          <>
            {roomEditor}
            <RoomBriefSummary
              roomLabel={roomLabel}
              dimensions={dimensions}
              keepList={projectMeta?.keepList ?? []}
              notes={projectMeta?.notes ?? null}
            />
            <Card>
              <CardHeader>
                <CardTitle>Room photos</CardTitle>
                <CardDescription>
                  The first photo is used as the source for your designs. Upload a clear view of the
                  whole room.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoomPhotos roomId={detail.room.id} photos={photos} />
              </CardContent>
            </Card>
          </>
        }
      />
    );
  }

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
      <RoomWorkspace
        key={detail.room.id}
        hasPhoto={photos.length > 0}
        designs={
          <section aria-label="Generate concepts">
            <RenderView
              key={detail.room.id}
              roomId={detail.room.id}
              projectId={projectId}
              hasPhoto={photos.length > 0}
              initialJob={initialJob}
              history={jobViews}
              sourceUrl={photos[0]?.url ?? null}
            />
          </section>
        }
        costs={
          <Card>
            <CardHeader>
              <CardTitle>Estimate</CardTitle>
              <CardDescription>
                Build an editable estimate from your rate card. Each save creates a version.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href={`/studio/projects/${projectId}/rooms/${detail.room.id}/estimate`}>
                  Build estimate
                </Link>
              </Button>
            </CardContent>
          </Card>
        }
        setup={
          <>
            {roomEditor}
            <Card>
              <CardHeader>
                <CardTitle>Room photos</CardTitle>
                <CardDescription>
                  The first photo is used as the source for your designs. Upload a clear view of the
                  whole room.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoomPhotos roomId={detail.room.id} photos={photos} />
              </CardContent>
            </Card>
          </>
        }
      />
    </div>
  );
}

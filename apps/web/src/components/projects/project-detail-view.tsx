import { deleteProjectAction, deleteRoomAction } from "@/server/actions/projects";
import { RoomForm } from "@/components/projects/room-form";
import { ProposalsPanel } from "@/components/proposals/proposals-panel";
import { SharePanel } from "@/components/share/share-panel";
import { RoomPhotos } from "@/components/projects/room-photos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@roomdesigner/db";
import { presignGet } from "@roomdesigner/storage";
import { requireWorkspace } from "@/server/auth/session";
import { getProject } from "@/server/services/projects";
import Link from "next/link";
import { getProjectEstimateSummary } from "@/server/services/studio-estimates";
import { formatMoney } from "@roomdesigner/shared";
import { ProjectTabs } from "./project-tabs";

const ROOM_TYPE_LABELS: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
  DINING_ROOM: "Dining room",
  HOME_OFFICE: "Home office",
  KIDS_ROOM: "Kids room",
  BALCONY: "Balcony",
  HALLWAY: "Hallway",
  OTHER: "Other",
};

function formatLength(mm: number | null, unitSystem: string): string {
  if (mm === null) return "—";
  if (unitSystem === "IMPERIAL") {
    return `${(mm / 304.8).toFixed(1)} ft`;
  }
  return `${(mm / 1000).toFixed(2)} m`;
}

export async function ProjectDetailView({
  projectId,
  basePath,
}: {
  projectId: string;
  basePath: "/app" | "/studio";
}) {
  const { user, workspace } = await requireWorkspace();
  const detail = await getProject(
    prisma,
    { userId: user.id, workspaceId: workspace.id },
    projectId,
  );

  const rooms = await Promise.all(
    detail.rooms.map(async (room) => ({
      ...room,
      photoUrls: await Promise.all(
        room.photos.map(async (photo) => ({
          id: photo.id,
          url: await presignGet(photo.storageKey),
        })),
      ),
    })),
  );

  const summary =
    basePath === "/studio"
      ? await getProjectEstimateSummary(
          prisma,
          { userId: user.id, workspaceId: workspace.id },
          projectId,
        )
      : null;
  const activity =
    basePath === "/studio"
      ? await prisma.proposalEmail.findMany({
          where: {
            workspaceId: workspace.id,
            proposal: { projectId, project: { deletedAt: null } },
          },
          select: { id: true, kind: true, createdAt: true, proposal: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [];
  const concepts =
    basePath === "/studio"
      ? await prisma.renderOutput.findMany({
          where: {
            job: { workspaceId: workspace.id, room: { projectId, project: { deletedAt: null } } },
          },
          select: {
            id: true,
            asset: { select: { storageKey: true } },
            job: { select: { room: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];
  const conceptImages = await Promise.all(
    concepts.map(async (concept) => ({
      ...concept,
      url: await presignGet(concept.asset.storageKey),
    })),
  );
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={basePath} className="text-xs text-muted-foreground underline">
            Back to projects
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {detail.project.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rooms.length === 0
              ? "Add a room to get started."
              : `${String(rooms.length)} ${rooms.length === 1 ? "room" : "rooms"}`}
          </p>
        </div>
        <form action={deleteProjectAction}>
          <input type="hidden" name="projectId" value={detail.project.id} />
          <input type="hidden" name="basePath" value={basePath} />
          <Button type="submit" variant="outline" size="sm">
            Delete project
          </Button>
        </form>
      </div>

      {basePath === "/app" && (
        <nav
          aria-label="Project workflow"
          className="flex flex-wrap gap-3 rounded-lg border p-4 text-sm"
        >
          <a href="#rooms" className="underline">
            1. Rooms & photos
          </a>
          <a href="#share" className="underline">
            Share & get feedback
          </a>
          <a href="#add-room" className="underline">
            Add a room
          </a>
        </nav>
      )}

      <ProjectTabs enabled={basePath === "/studio"}>
        <section id="rooms" aria-label="Project rooms">
          {rooms.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No rooms yet. Add your first room below.
            </p>
          )}
          {rooms.length > 0 && (
            <ul className="space-y-4">
              {rooms.map((room) => (
                <li key={room.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle>{room.name}</CardTitle>
                          <CardDescription>
                            {ROOM_TYPE_LABELS[room.type] ?? room.type}
                            {room.widthMm !== null && room.lengthMm !== null
                              ? ` · ${formatLength(room.widthMm, workspace.unitSystem)} × ${formatLength(room.lengthMm, workspace.unitSystem)}`
                              : ""}
                            {room.heightMm !== null
                              ? ` · ceiling ${formatLength(room.heightMm, workspace.unitSystem)}`
                              : ""}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild size="sm">
                            <Link href={`${basePath}/projects/${projectId}/rooms/${room.id}`}>
                              Open room
                            </Link>
                          </Button>
                          <form action={deleteRoomAction}>
                            <input type="hidden" name="roomId" value={room.id} />
                            <input type="hidden" name="projectId" value={projectId} />
                            <input type="hidden" name="basePath" value={basePath} />
                            <Button type="submit" variant="ghost" size="sm">
                              Remove
                            </Button>
                          </form>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {basePath === "/studio" && (
                        <div className="mb-4 flex flex-wrap gap-3 text-sm underline">
                          <Link href={`${basePath}/projects/${projectId}/rooms/${room.id}`}>
                            Generate & edit concepts
                          </Link>
                          <Link
                            href={`${basePath}/projects/${projectId}/rooms/${room.id}/estimate`}
                          >
                            2. Build estimate
                          </Link>
                        </div>
                      )}
                      <RoomPhotos roomId={room.id} photos={room.photoUrls} />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
        {basePath === "/studio" && (
          <section id="renders" aria-label="Project renders">
            {conceptImages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No concept visuals yet. Open a room to generate designs.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {conceptImages.map((concept) => (
                  <Link
                    key={concept.id}
                    href={`/studio/projects/${projectId}/rooms/${concept.job.room.id}`}
                    className="space-y-2 rounded-xl bg-card p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URL */}
                    <img
                      src={concept.url}
                      alt={`Concept visual for ${concept.job.room.name}`}
                      className="aspect-square w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                    <p className="text-sm">{concept.job.room.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
        {basePath === "/studio" && (
          <section id="activity" aria-label="Project activity">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Proposal activity will appear here when a proposal is sent or reviewed.
              </p>
            ) : (
              <ul className="space-y-4">
                {activity.map((event) => (
                  <li key={event.id} className="border-b pb-4 text-sm">
                    <p className="font-medium">
                      {event.proposal.title} · {event.kind.toLowerCase().replaceAll("_", " ")}
                    </p>
                    <time
                      className="text-muted-foreground"
                      dateTime={event.createdAt.toISOString()}
                    >
                      {event.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {basePath === "/studio" && (
          <section id="estimates" aria-label="Project estimate summary">
            <Card>
              <CardHeader>
                <CardTitle>Room estimates & project total</CardTitle>
                <CardDescription>
                  Latest saved estimate for each room. Rooms without an estimate are excluded from
                  totals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary?.rooms.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add a room to start estimating.</p>
                )}
                <ul className="space-y-3">
                  {summary?.rooms.map((room) => (
                    <li key={room.id} className="flex flex-wrap justify-between gap-2 text-sm">
                      <Link
                        className="underline"
                        href={`/studio/projects/${projectId}/rooms/${room.id}/estimate${room.estimate !== null ? `?version=${room.estimate.id}` : ""}`}
                      >
                        {room.name}
                      </Link>
                      <span>
                        {room.estimate !== null
                          ? `${formatMoney(room.estimate.totalMinor, room.estimate.currency)} · v${room.estimate.version}`
                          : "No estimate yet"}
                      </span>
                    </li>
                  ))}
                </ul>
                {summary?.totals.map((total) => (
                  <p key={total.currency} className="text-lg font-semibold">
                    Project total: {formatMoney(total.totalMinor, total.currency)}
                  </p>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
        {basePath === "/studio" && (
          <section id="proposals" aria-label="Project proposals">
            <ProposalsPanel projectId={projectId} />
          </section>
        )}

        {basePath === "/app" && (
          <section id="share" aria-label="Share project">
            <SharePanel projectId={projectId} />
          </section>
        )}

        <Card id="add-room">
          <CardHeader>
            <CardTitle>Add a room</CardTitle>
            <CardDescription>
              Enter the measurements and add 1–3 photos. We never send dimensions to the AI model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoomForm projectId={projectId} basePath={basePath} unitSystem={workspace.unitSystem} />
          </CardContent>
        </Card>
      </ProjectTabs>
    </div>
  );
}
